/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary()
    t.string('codigo', 20).notNullable().unique()
    t.string('nombre', 60).notNullable()
    t.string('descripcion', 255)
  })

  await knex.schema.createTable('usuarios', (t) => {
    t.increments('id').primary()
    t.string('nombre', 120).notNullable()
    t.string('email', 160).notNullable().unique()
    t.string('password_hash', 100).notNullable()
    t.integer('rol_id').unsigned().notNullable().references('id').inTable('roles')
    t.boolean('activo').notNullable().defaultTo(true)
    t.tinyint('intentos_fallidos').unsigned().notNullable().defaultTo(0)
    t.datetime('bloqueado_hasta')
    t.datetime('ultimo_acceso')
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('bitacora', (t) => {
    t.bigIncrements('id').primary()
    t.integer('usuario_id').unsigned().references('id').inTable('usuarios')
    t.string('accion', 40).notNullable()
    t.string('entidad', 60).notNullable()
    t.string('entidad_id', 40)
    t.json('datos_antes')
    t.json('datos_despues')
    t.string('ip', 45)
    t.string('agente', 255)
    t.datetime('fecha', { precision: 3 }).notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP(3)'))
    t.index(['entidad', 'entidad_id'])
    t.index(['usuario_id', 'fecha'])
    t.index('fecha')
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('bitacora')
  await knex.schema.dropTableIfExists('usuarios')
  await knex.schema.dropTableIfExists('roles')
}
