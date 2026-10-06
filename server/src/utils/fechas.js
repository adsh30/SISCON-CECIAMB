// Fechas de Venezuela (Caracas, UTC−4 todo el año) frente a las columnas guardadas en UTC

/** Hoy en Caracas como 'YYYY-MM-DD' */
export function fechaHoyVE(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora)
}

/** Inicio (UTC) del día de Caracas 'YYYY-MM-DD': '2026-10-06' → '2026-10-06 04:00:00' */
export const inicioDiaCaracas = (fecha) => `${fecha} 04:00:00`

/** Filtra una columna UTC por días de Caracas, ambos inclusive */
export function entreDiasCaracas(query, columna, { desde, hasta }, knex) {
  if (desde) query.where(columna, '>=', inicioDiaCaracas(desde))
  if (hasta) {
    query.where(columna, '<', knex.raw('? + INTERVAL 1 DAY', [inicioDiaCaracas(hasta)]))
  }
  return query
}
