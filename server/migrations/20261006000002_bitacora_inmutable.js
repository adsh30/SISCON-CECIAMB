// La bitácora es solo inserción: la propia base de datos rechaza modificarla o borrarla,
// aunque alguien lo intente fuera del sistema con el usuario de la aplicación.

const MENSAJE = 'La bitácora de auditoría no se puede modificar ni borrar'

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  for (const evento of ['UPDATE', 'DELETE']) {
    await knex.raw(`
      CREATE TRIGGER bitacora_sin_${evento.toLowerCase()}
      BEFORE ${evento} ON bitacora
      FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '${MENSAJE}'
    `)
  }
  await knex.schema.alterTable('bitacora', (t) => {
    t.index(['accion', 'fecha'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('bitacora', (t) => {
    t.dropIndex(['accion', 'fecha'])
  })
  await knex.raw('DROP TRIGGER IF EXISTS bitacora_sin_update')
  await knex.raw('DROP TRIGGER IF EXISTS bitacora_sin_delete')
}
