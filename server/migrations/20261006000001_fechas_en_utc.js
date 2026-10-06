// Antes de fijar la sesión en UTC (knexfile), las columnas con NOW()/CURRENT_TIMESTAMP
// quedaban en la hora del equipo. Se llevan a UTC con el desfase del sistema.

const COLUMNAS = [
  ['bitacora', 'fecha'],
  ['usuarios', 'creado_en'],
  ['usuarios', 'actualizado_en'],
  ['roles', 'creado_en'],
  ['roles_permisos', 'actualizado_en'],
]

/** Segundos de diferencia entre la hora del equipo y UTC (Caracas: -14400) */
async function desfaseSistema(knex) {
  const [[fila]] = await knex.raw(
    "SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'SYSTEM')) AS s",
  )
  return Number(fila.s)
}

async function desplazar(knex, segundos) {
  if (!segundos) return
  for (const [tabla, columna] of COLUMNAS) {
    await knex(tabla).update({ [columna]: knex.raw('?? + INTERVAL ? SECOND', [columna, segundos]) })
  }
}

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await desplazar(knex, -(await desfaseSistema(knex)))
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await desplazar(knex, await desfaseSistema(knex))
}
