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

/** Última tasa anterior a `fecha` (para calcular la variación diaria). */
export function anterior(moneda, fuente, fecha) {
  return db('tasas_cambio')
    .select(columnas)
    .where({ moneda, fuente })
    .where('fecha', '<', fecha)
    .orderBy('fecha', 'desc')
    .first()
}

/** Una tasa por día entre dos fechas (inclusive), en orden cronológico. */
export function serie(moneda, fuente, desde, hasta) {
  return db('tasas_cambio')
    .select('fecha', 'tasa')
    .where({ moneda, fuente })
    .whereBetween('fecha', [desde, hasta])
    .orderBy('fecha')
}

/** Inserta filas históricas sin pisar las que ya existen. Devuelve cuántas eran nuevas. */
export async function importar(filas) {
  const contar = async () => Number((await db('tasas_cambio').count({ n: '*' }).first()).n)
  const antes = await contar()
  for (let i = 0; i < filas.length; i += 500) {
    await db('tasas_cambio')
      .insert(filas.slice(i, i + 500))
      .onConflict(['fecha', 'moneda', 'fuente'])
      .ignore()
  }
  return (await contar()) - antes
}
