import { db } from '../../config/db.js'
import { comoLike } from '../cuentas/cuentas.repository.js'

const COLUMNAS = [
  'c.id',
  'c.tipo_id',
  'c.periodo_id',
  'c.numero',
  'c.codigo',
  'c.fecha',
  'c.concepto',
  'c.referencia',
  'c.beneficiario',
  'c.estado',
  'c.total_debe',
  'c.total_haber',
  'c.origen_id',
  'c.origen_tipo',
  'c.creado_en',
  'c.actualizado_en',
  'c.aprobado_en',
  'c.anulado_en',
  'c.motivo_anulacion',
  't.codigo as tipo_codigo',
  't.nombre as tipo_nombre',
  'p.anio as periodo_anio',
  'p.mes as periodo_mes',
  'p.estado as periodo_estado',
  'o.codigo as origen_codigo',
  'uc.nombre as creado_por_nombre',
  'uc.apellido as creado_por_apellido',
  'ua.nombre as actualizado_por_nombre',
  'ua.apellido as actualizado_por_apellido',
  'up.nombre as aprobado_por_nombre',
  'up.apellido as aprobado_por_apellido',
  'un.nombre as anulado_por_nombre',
  'un.apellido as anulado_por_apellido',
]

const base = (trx = db) =>
  trx('comprobantes as c')
    .join('tipos_comprobante as t', 't.id', 'c.tipo_id')
    .join('periodos as p', 'p.id', 'c.periodo_id')
    .leftJoin('comprobantes as o', 'o.id', 'c.origen_id')
    .leftJoin('usuarios as uc', 'uc.id', 'c.creado_por')
    .leftJoin('usuarios as ua', 'ua.id', 'c.actualizado_por')
    .leftJoin('usuarios as up', 'up.id', 'c.aprobado_por')
    .leftJoin('usuarios as un', 'un.id', 'c.anulado_por')

function filtrada({ tipoId, estado, desde, hasta, buscar, cuentaId }, { conTipo = true } = {}) {
  const q = db('comprobantes as c')
  if (conTipo && tipoId) q.where('c.tipo_id', tipoId)
  if (estado) q.where('c.estado', estado)
  if (desde) q.where('c.fecha', '>=', desde)
  if (hasta) q.where('c.fecha', '<=', hasta)
  if (buscar) {
    const like = comoLike(buscar)
    q.where((w) => {
      w.where('c.codigo', 'like', like)
        .orWhere('c.concepto', 'like', like)
        .orWhere('c.referencia', 'like', like)
        .orWhere('c.beneficiario', 'like', like)
      if (/^\d+$/.test(buscar)) w.orWhere('c.id', Number(buscar))
    })
  }
  if (cuentaId) {
    q.whereExists(
      db('comprobante_detalle as d')
        .select(db.raw('1'))
        .whereRaw('d.comprobante_id = c.id')
        .where('d.cuenta_id', cuentaId),
    )
  }
  return q
}

export async function listar(filtros) {
  const { pagina, porPagina } = filtros
  const ids = filtrada(filtros).select('c.id')
  const [filas, total, porTipo] = await Promise.all([
    base()
      .select(COLUMNAS)
      .whereIn('c.id', ids)
      .orderBy([
        { column: 'c.fecha', order: 'desc' },
        { column: 'c.id', order: 'desc' },
      ])
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    filtrada(filtros).count({ n: '*' }).first(),
    // Cuántos hay de cada tipo con los demás filtros, para las pestañas
    filtrada(filtros, { conTipo: false })
      .select('c.tipo_id')
      .count({ n: '*' })
      .groupBy('c.tipo_id'),
  ])
  return {
    filas,
    total: Number(total.n),
    porTipo: Object.fromEntries(porTipo.map((f) => [f.tipo_id, Number(f.n)])),
  }
}

export const porId = (id, trx = db) => base(trx).select(COLUMNAS).where('c.id', id).first()

export const bloquear = (id, trx) =>
  trx('comprobantes').select('id').where({ id }).forUpdate().first()

export function renglones(id, trx = db) {
  return trx('comprobante_detalle as d')
    .join('cuentas as cu', 'cu.id', 'd.cuenta_id')
    .leftJoin('centros_costo as cc', 'cc.id', 'd.centro_costo_id')
    .select(
      'd.id',
      'd.renglon',
      'd.cuenta_id',
      'd.centro_costo_id',
      'd.descripcion',
      'd.debe',
      'd.haber',
      'd.referencia',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      'cc.codigo as centro_codigo',
      'cc.nombre as centro_nombre',
    )
    .where('d.comprobante_id', id)
    .orderBy('d.renglon')
}

export async function reemplazarRenglones(id, filas, trx) {
  await trx('comprobante_detalle').where({ comprobante_id: id }).del()
  if (filas.length) {
    await trx('comprobante_detalle').insert(
      filas.map((r, i) => ({
        comprobante_id: id,
        renglon: i + 1,
        cuenta_id: r.cuentaId,
        centro_costo_id: r.centroCostoId ?? null,
        descripcion: r.descripcion ?? null,
        debe: r.debe,
        haber: r.haber,
        referencia: r.referencia ?? null,
      })),
    )
  }
}

export const cuentasPorId = (ids, trx) =>
  trx('cuentas').select('id', 'codigo', 'nombre', 'es_movimiento', 'activa').whereIn('id', ids)

export const centrosPorId = (ids, trx) =>
  trx('centros_costo').select('id', 'codigo', 'nombre', 'activo').whereIn('id', ids)

/** Eventos de la bitácora de un comprobante (RF-07.4) */
export function historial(id, creadoEn) {
  return (
    db('bitacora as b')
      .leftJoin('usuarios as u', 'u.id', 'b.usuario_id')
      .select('b.id', 'b.fecha', 'b.accion', 'u.nombre', 'u.apellido')
      .where({ 'b.entidad': 'comprobantes', 'b.entidad_id': String(id) })
      // Si alguna vez se reutiliza un id (p. ej. restaurando un respaldo), no se mezclan eventos
      .where('b.fecha', '>=', creadoEn)
      .orderBy('b.id')
  )
}

/** Siguiente número del tipo en el período; la fila queda bloqueada hasta el commit */
export async function siguienteNumero(tipoId, periodoId, trx) {
  // Las aprobaciones del mismo tipo hacen fila aquí. Sin esto, dos INSERT IGNORE simultáneos
  // de la misma fila de correlativos se bloquean entre sí (deadlock) en InnoDB.
  await trx('tipos_comprobante').select('id').where({ id: tipoId }).forUpdate()
  await trx('correlativos')
    .insert({ tipo_id: tipoId, periodo_id: periodoId, ultimo: 0 })
    .onConflict(['tipo_id', 'periodo_id'])
    .ignore()
  const fila = await trx('correlativos')
    .where({ tipo_id: tipoId, periodo_id: periodoId })
    .forUpdate()
    .first()
  const numero = fila.ultimo + 1
  await trx('correlativos')
    .where({ tipo_id: tipoId, periodo_id: periodoId })
    .update({ ultimo: numero })
  return numero
}

// --- Tipos de comprobante ---

export const tipos = (trx = db) =>
  trx('tipos_comprobante')
    .select('*')
    .orderBy([{ column: 'orden' }, { column: 'nombre' }])

export const tipoPorId = (id, trx = db) => trx('tipos_comprobante').where({ id }).first()
