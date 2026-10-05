import { db } from '../../config/db.js'

const columnas = ['fecha', 'moneda', 'fuente', 'tasa', 'compra', 'venta', 'obtenida_en']

export function ultima(moneda, fuente, trx = db) {
  return trx('tasas_cambio')
    .select(columnas)
    .where({ moneda, fuente })
    .orderBy([
      { column: 'fecha', order: 'desc' },
      { column: 'obtenida_en', order: 'desc' },
    ])
    .first()
}

/** Inserta o actualiza la tasa de (fecha, moneda, fuente). */
export function guardar(fila, trx = db) {
  return trx('tasas_cambio')
    .insert({ ...fila, obtenida_en: trx.raw('UTC_TIMESTAMP()') })
    .onConflict(['fecha', 'moneda', 'fuente'])
    .merge(['tasa', 'compra', 'venta', 'obtenida_en', 'registrado_por'])
}
