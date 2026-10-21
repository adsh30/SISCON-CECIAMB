// Fase 6: Documentos soporte adjuntos a comprobantes contables (RF-05.11).
// Permite guardar facturas, recibos, transferencias o documentos en PDF / imágenes.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('comprobante_adjuntos', (t) => {
    t.increments('id').primary()
    t.integer('comprobante_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('comprobantes')
      .onDelete('CASCADE')
    t.string('nombre_archivo', 255).notNullable()
    t.string('tipo_mime', 100).notNullable()
    t.integer('tamano_bytes').unsigned().notNullable()
    t.specificType('datos', 'LONGBLOB').notNullable()
    t.string('sha256', 64).notNullable()
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('creado_por').unsigned().references('id').inTable('usuarios')

    t.index(['comprobante_id'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('comprobante_adjuntos')
}

