// Fase 8: Conciliación Bancaria Automática (RF-08.3).
// Permite conciliar los movimientos del Libro Mayor con el estado de cuenta bancario.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('conciliaciones', (t) => {
    t.increments('id').primary()
    t.integer('cuenta_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('cuentas')
    t.integer('periodo_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('periodos')
    t.date('fecha_corte').notNullable()
    t.decimal('saldo_banco', 18, 2).notNullable().defaultTo(0)
    t.decimal('saldo_libros', 18, 2).notNullable().defaultTo(0)
    t.decimal('diferencia', 18, 2).notNullable().defaultTo(0)
    t.string('estado', 20).notNullable().defaultTo('BORRADOR') // BORRADOR, CONCILIADA, ANULADA
    t.text('observaciones').nullable()
    t.integer('creado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('conciliado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('conciliado_en').nullable()

    t.index(['cuenta_id', 'periodo_id'])
    t.index(['estado'])
  })

  await knex.schema.createTable('conciliacion_partidas', (t) => {
    t.increments('id').primary()
    t.integer('conciliacion_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('conciliaciones')
      .onDelete('CASCADE')
    t.string('origen', 20).notNullable() // 'LIBRO' o 'BANCO'
    t.integer('comprobante_detalle_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('comprobante_detalle')
      .onDelete('SET NULL')
    t.date('fecha').notNullable()
    t.string('referencia', 100).nullable()
    t.string('descripcion', 255).notNullable()
    t.decimal('monto', 18, 2).notNullable()
    t.string('tipo_movimiento', 10).notNullable() // 'DEBITO' o 'CREDITO'
    t.string('estado', 30).notNullable().defaultTo('PENDIENTE') // 'PENDIENTE', 'CONCILIADO', 'AJUSTE'
    t.integer('partida_emparejada_id').unsigned().nullable()
    t.string('notas', 255).nullable()
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())

    t.index(['conciliacion_id', 'origen'])
    t.index(['estado'])
    t.index(['referencia'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('conciliacion_partidas')
  await knex.schema.dropTableIfExists('conciliaciones')
}
