// Fase 3: Catálogo jerárquico de cuentas contables y centros de costo (RF-03)

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('cuentas', (t) => {
    t.increments('id').primary()
    t.string('codigo', 30).notNullable().unique()
    t.string('nombre', 160).notNullable()
    t.string('descripcion', 255)
    t.enu('tipo', [
      'ACTIVO',
      'PASIVO',
      'PATRIMONIO',
      'INGRESO',
      'COSTO',
      'GASTO',
      'ORDEN',
    ]).notNullable()
    t.enu('naturaleza', ['DEUDORA', 'ACREEDORA']).notNullable()
    t.tinyint('nivel').unsigned().notNullable() // 1 = Grupo, 2 = Subgrupo, etc.
    t.integer('padre_id').unsigned().references('id').inTable('cuentas').onDelete('RESTRICT')
    t.boolean('es_movimiento').notNullable().defaultTo(false) // solo estas aceptan comprobantes
    t.boolean('activa').notNullable().defaultTo(true)
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('creado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('actualizado_por').unsigned().references('id').inTable('usuarios')

    t.index(['padre_id'])
    t.index(['tipo'])
    t.index(['activa'])
    t.index(['es_movimiento'])
  })

  await knex.schema.createTable('centros_costo', (t) => {
    t.increments('id').primary()
    t.string('codigo', 20).notNullable().unique()
    t.string('nombre', 120).notNullable()
    t.string('descripcion', 255)
    t.boolean('activo').notNullable().defaultTo(true)
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('creado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('actualizado_por').unsigned().references('id').inTable('usuarios')

    t.index(['activo'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('centros_costo')
  await knex.schema.dropTableIfExists('cuentas')
}
