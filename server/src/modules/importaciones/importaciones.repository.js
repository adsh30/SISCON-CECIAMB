import { db } from '../../config/db.js'

/** Cuentas de movimiento activas por código exacto (el CSV trae el código, no el id) */
export const cuentasPorCodigo = (codigos, trx = db) =>
  trx('cuentas')
    .select('id', 'codigo', 'nombre', 'es_movimiento', 'activa')
    .whereIn('codigo', codigos)

/** Centros de costo por código exacto (columna opcional del archivo) */
export const centrosPorCodigo = (codigos, trx = db) =>
  trx('centros_costo').select('id', 'codigo', 'nombre', 'activo').whereIn('codigo', codigos)
