/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('tasas_cambio', (t) => {
    t.increments('id').primary()
    t.date('fecha').notNullable() // fecha valor de la tasa (hora de Venezuela)
    t.enu('moneda', ['USD', 'EUR', 'USDT']).notNullable()
    t.enu('fuente', ['BCV', 'BINANCE', 'MANUAL']).notNullable()
    t.decimal('tasa', 18, 4).notNullable() // bolívares por 1 unidad de la moneda
    t.decimal('compra', 18, 4)
    t.decimal('venta', 18, 4)
    t.datetime('obtenida_en').notNullable().defaultTo(knex.raw('UTC_TIMESTAMP()'))
    t.integer('registrado_por').unsigned().references('id').inTable('usuarios')
    t.unique(['fecha', 'moneda', 'fuente'])
    t.index(['moneda', 'fuente', 'fecha'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('tasas_cambio')
}
