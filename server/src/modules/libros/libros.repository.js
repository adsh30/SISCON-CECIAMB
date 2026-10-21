import { db } from '../../config/db.js'

// Los libros solo leen comprobantes APROBADOS: los borradores aún no son contabilidad y los
// anulados quedan fuera (su efecto se revierte con un comprobante de reverso, si hace falta).

/** Renglones de comprobantes aprobados, con los filtros por tipo y centro de costo */
function renglonesAprobados({ tipoId, centroCostoId }) {
  const q = db('comprobante_detalle as d')
    .join('comprobantes as c', 'c.id', 'd.comprobante_id')
    .where('c.estado', 'APROBADO')
  if (tipoId) q.where('c.tipo_id', tipoId)
  if (centroCostoId) q.where('d.centro_costo_id', centroCostoId)
  return q
}

/** Columnas legibles de un renglón: cuenta y centro de costo */
const conCuentaYCentro = (q) =>
  q
    .join('cuentas as cu', 'cu.id', 'd.cuenta_id')
    .leftJoin('centros_costo as cc', 'cc.id', 'd.centro_costo_id')
    .select(
      'd.comprobante_id',
      'd.renglon',
      'd.descripcion',
      'd.referencia',
      'd.debe',
      'd.haber',
      'cu.id as cuenta_id',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      'cc.codigo as centro_codigo',
      'cc.nombre as centro_nombre',
    )

/** Orden cronológico del libro: fecha, tipo (en su orden) y número correlativo */
const ORDEN_CRONOLOGICO = [
  { column: 'c.fecha' },
  { column: 't.orden' },
  { column: 't.id' },
  { column: 'c.numero' },
]

function comprobantesDelDiario({ desde, hasta, tipoId, centroCostoId }) {
  const q = db('comprobantes as c')
    .where('c.estado', 'APROBADO')
    .whereBetween('c.fecha', [desde, hasta])
  if (tipoId) q.where('c.tipo_id', tipoId)
  if (centroCostoId) {
    q.whereExists(
      db('comprobante_detalle as d')
        .select(db.raw('1'))
        .whereRaw('d.comprobante_id = c.id')
        .where('d.centro_costo_id', centroCostoId),
    )
  }
  return q
}

/**
 * Libro Diario: una página de comprobantes con sus renglones y los totales del rango completo.
 * Sin `limite` trae el libro entero (impresión y Excel).
 */
export async function diario(filtros, { limite, desplazamiento = 0 } = {}) {
  const { desde, hasta } = filtros
  const [conteo, sumas] = await Promise.all([
    comprobantesDelDiario(filtros).count({ total: '*' }).first(),
    renglonesAprobados(filtros)
      .whereBetween('c.fecha', [desde, hasta])
      .first(
        db.raw('COALESCE(SUM(d.debe), 0) as debe'),
        db.raw('COALESCE(SUM(d.haber), 0) as haber'),
        db.raw('COUNT(*) as renglones'),
      ),
  ])

  const consulta = comprobantesDelDiario(filtros)
    .join('tipos_comprobante as t', 't.id', 'c.tipo_id')
    .select(
      'c.id',
      'c.codigo',
      'c.fecha',
      'c.concepto',
      'c.referencia',
      'c.beneficiario',
      't.codigo as tipo_codigo',
      't.nombre as tipo_nombre',
    )
    .orderBy([...ORDEN_CRONOLOGICO, { column: 'c.id' }])
  if (limite) consulta.limit(limite).offset(desplazamiento)
  const comprobantes = await consulta

  let renglones = []
  if (comprobantes.length) {
    const q = conCuentaYCentro(renglonesAprobados(filtros)).orderBy([
      'd.comprobante_id',
      'd.renglon',
    ])
    // Con página, solo sus comprobantes; el libro completo se trae por rango (sin listas enormes)
    if (limite)
      q.whereIn(
        'd.comprobante_id',
        comprobantes.map((c) => c.id),
      )
    else q.whereBetween('c.fecha', [desde, hasta])
    renglones = await q
  }

  return {
    comprobantes,
    renglones,
    total: Number(conteo.total),
    sumas: { debe: sumas.debe, haber: sumas.haber, renglones: Number(sumas.renglones) },
  }
}

// Los códigos se comparan byte a byte: así '1.1' va antes que '1.1.01' y que '1.2'
const CODIGO = 'cu.codigo COLLATE utf8mb4_bin'

/** Rango de cuentas por código. La cuenta final incluye sus subcuentas ('1.1' → '1.1.xx') */
function enRango(q, { cuentaDesde, cuentaHasta }) {
  if (cuentaDesde) q.whereRaw(`${CODIGO} >= ?`, [cuentaDesde])
  if (cuentaHasta) {
    q.where((w) =>
      w
        .whereRaw(`${CODIGO} <= ?`, [cuentaHasta])
        .orWhereRaw(`${CODIGO} LIKE ?`, [`${cuentaHasta}.%`]),
    )
  }
  return q
}

/**
 * Libro Mayor, resumen por cuenta: lo acumulado antes del rango (saldo anterior) y lo del rango.
 * Aparecen las cuentas con movimientos en el rango o con saldo anterior distinto de cero.
 */
export function resumenMayor(filtros) {
  const { desde, hasta } = filtros
  const antes = (col) => db.raw(`SUM(CASE WHEN c.fecha < ? THEN ${col} ELSE 0 END)`, [desde])
  const enRangoDeFechas = (col) =>
    db.raw(`SUM(CASE WHEN c.fecha >= ? THEN ${col} ELSE 0 END)`, [desde])

  return enRango(renglonesAprobados(filtros).join('cuentas as cu', 'cu.id', 'd.cuenta_id'), filtros)
    .where('c.fecha', '<=', hasta)
    .groupBy('cu.id', 'cu.codigo', 'cu.nombre', 'cu.naturaleza')
    .select('cu.id', 'cu.codigo', 'cu.nombre', 'cu.naturaleza')
    .select({
      debe_anterior: antes('d.debe'),
      haber_anterior: antes('d.haber'),
      debe: enRangoDeFechas('d.debe'),
      haber: enRangoDeFechas('d.haber'),
      movimientos: enRangoDeFechas('1'),
    })
    .havingRaw('movimientos > 0 OR debe_anterior <> haber_anterior')
    .orderByRaw(CODIGO)
}

/** Movimientos del rango de fechas para las cuentas indicadas (o todas las del rango de cuentas) */
export function movimientosMayor(filtros, cuentaIds) {
  const q = conCuentaYCentro(renglonesAprobados(filtros))
    .join('tipos_comprobante as t', 't.id', 'c.tipo_id')
    .whereBetween('c.fecha', [filtros.desde, filtros.hasta])
    .select('c.codigo as comprobante_codigo', 'c.fecha', 'c.concepto')
    .orderByRaw(CODIGO)
    .orderBy([...ORDEN_CRONOLOGICO, { column: 'd.renglon' }])
  if (cuentaIds) q.whereIn('d.cuenta_id', cuentaIds)
  else enRango(q, filtros)
  return q
}

/** Textos para el encabezado: nombre del tipo y del centro de costo filtrados */
export async function nombresFiltros({ tipoId, centroCostoId }) {
  const [tipo, centro] = await Promise.all([
    tipoId ? db('tipos_comprobante').where('id', tipoId).first('codigo', 'nombre') : null,
    centroCostoId ? db('centros_costo').where('id', centroCostoId).first('codigo', 'nombre') : null,
  ])
  return { tipo, centro }
}

export const nombreUsuario = (id) => db('usuarios').where({ id }).first('nombre', 'apellido')

/**
 * Balance de Comprobación: obtiene todas las cuentas contables activas con sus sumas de movimientos
 * anteriores (para saldos iniciales) y dentro del rango de fechas.
 */
export async function resumenBalance(filtros) {
  const { desde, hasta, centroCostoId, tipoId, cuentaDesde, cuentaHasta } = filtros

  const subDetalle = db('comprobante_detalle as d')
    .join('comprobantes as c', 'c.id', 'd.comprobante_id')
    .where('c.estado', 'APROBADO')
    .where('c.fecha', '<=', hasta)

  if (tipoId) subDetalle.where('c.tipo_id', tipoId)
  if (centroCostoId) subDetalle.where('d.centro_costo_id', centroCostoId)

  subDetalle
    .groupBy('d.cuenta_id')
    .select('d.cuenta_id')
    .select({
      debe_anterior: db.raw(`SUM(CASE WHEN c.fecha < ? THEN d.debe ELSE 0 END)`, [desde]),
      haber_anterior: db.raw(`SUM(CASE WHEN c.fecha < ? THEN d.haber ELSE 0 END)`, [desde]),
      debe: db.raw(`SUM(CASE WHEN c.fecha >= ? THEN d.debe ELSE 0 END)`, [desde]),
      haber: db.raw(`SUM(CASE WHEN c.fecha >= ? THEN d.haber ELSE 0 END)`, [desde]),
      movimientos: db.raw(`SUM(CASE WHEN c.fecha >= ? THEN 1 ELSE 0 END)`, [desde]),
    })
    .as('mov')

  let q = db('cuentas as cu')
    .leftJoin(subDetalle, 'mov.cuenta_id', 'cu.id')
    .select(
      'cu.id',
      'cu.codigo',
      'cu.nombre',
      'cu.tipo',
      'cu.naturaleza',
      'cu.nivel',
      'cu.padre_id',
      'cu.es_movimiento',
      db.raw('COALESCE(mov.debe_anterior, 0) as debe_anterior'),
      db.raw('COALESCE(mov.haber_anterior, 0) as haber_anterior'),
      db.raw('COALESCE(mov.debe, 0) as debe'),
      db.raw('COALESCE(mov.haber, 0) as haber'),
      db.raw('COALESCE(mov.movimientos, 0) as movimientos'),
    )
    .where('cu.activa', true)
    .orderByRaw(CODIGO)

  return enRango(q, { cuentaDesde, cuentaHasta })
}
