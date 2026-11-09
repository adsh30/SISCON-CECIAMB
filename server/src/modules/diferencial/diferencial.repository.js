import { db } from '../../config/db.js'

/** Auxiliares (cuentas de movimiento) que se llevan en divisas, con su cuenta de grupo */
export function cuentasEnDivisa(trx = db) {
  return trx('cuentas as c')
    .leftJoin('cuentas as p', 'p.id', 'c.padre_id')
    .select(
      'c.id',
      'c.codigo',
      'c.nombre',
      'c.moneda',
      'p.codigo as grupo_codigo',
      'p.nombre as grupo_nombre',
    )
    .whereNotNull('c.moneda')
    .where('c.es_movimiento', true)
    .orderBy('c.codigo')
}

/**
 * Saldo de cada cuenta con los comprobantes aprobados hasta `fecha`: en bolívares (Debe − Haber)
 * y en divisa (el monto en divisa suma al Debe y resta al Haber).
 */
export function saldos(ids, fecha, trx = db) {
  return trx('comprobante_detalle as d')
    .join('comprobantes as c', 'c.id', 'd.comprobante_id')
    .select('d.cuenta_id')
    .select(trx.raw('SUM(d.debe) - SUM(d.haber) AS saldo_bs'))
    .select(
      trx.raw(
        'SUM(CASE WHEN d.debe > 0 THEN COALESCE(d.monto_moneda, 0) ELSE -COALESCE(d.monto_moneda, 0) END) AS saldo_divisa',
      ),
    )
    .where('c.estado', 'APROBADO')
    .where('c.fecha', '<=', fecha)
    .whereIn('d.cuenta_id', ids)
    .groupBy('d.cuenta_id')
}

/** Última tasa publicada hasta la fecha (inclusive) */
export function tasaAl(moneda, fuente, fecha, trx = db) {
  return trx('tasas_cambio')
    .select('fecha', 'tasa')
    .where({ moneda, fuente })
    .where('fecha', '<=', fecha)
    .orderBy('fecha', 'desc')
    .first()
}

const columnasCuenta = (alias) =>
  ['id', 'codigo', 'nombre', 'tipo', 'es_movimiento', 'activa', 'moneda'].map(
    (c) => `${alias}.${c} as ${alias}_${c}`,
  )

/** Cuentas de ganancia (g) y pérdida (p) cambiaria elegidas en Empresa */
export function configuracion(trx = db) {
  return trx('empresa as e')
    .leftJoin('cuentas as g', 'g.id', 'e.cuenta_ganancia_cambiaria_id')
    .leftJoin('cuentas as p', 'p.id', 'e.cuenta_perdida_cambiaria_id')
    .select([...columnasCuenta('g'), ...columnasCuenta('p')])
    .where('e.id', 1)
    .first()
}

export function guardarConfiguracion(ganancia, perdida, actorId, trx) {
  return trx('empresa').where({ id: 1 }).update({
    cuenta_ganancia_cambiaria_id: ganancia,
    cuenta_perdida_cambiaria_id: perdida,
    actualizado_por: actorId,
    actualizado_en: trx.fn.now(),
  })
}

export const cuentaPorId = (id, trx = db) =>
  trx('cuentas')
    .select('id', 'codigo', 'nombre', 'tipo', 'es_movimiento', 'activa', 'moneda')
    .where({ id })
    .first()

export const tipoDiferencial = (codigo, trx) => trx('tipos_comprobante').where({ codigo }).first()
