import { db } from '../src/config/db.js'

/**
 * Vacía los comprobantes de la base de pruebas. Los triggers impiden borrar aprobados y
 * anulados, pero TRUNCATE no dispara triggers; va en una transacción para usar una sola
 * conexión mientras las claves foráneas están desactivadas.
 */
export function limpiarComprobantes() {
  return db.transaction(async (trx) => {
    await trx.raw('SET FOREIGN_KEY_CHECKS = 0')
    for (const tabla of ['comprobante_detalle', 'comprobantes', 'correlativos']) {
      await trx.raw(`TRUNCATE TABLE ${tabla}`)
    }
    await trx.raw('SET FOREIGN_KEY_CHECKS = 1')
  })
}
