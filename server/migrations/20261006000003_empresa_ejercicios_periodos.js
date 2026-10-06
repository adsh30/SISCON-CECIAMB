// Fase 2: datos de la empresa, ejercicios económicos y sus períodos mensuales (RF-02, RF-08)

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('empresa', (t) => {
    t.tinyint('id').unsigned().primary() // una sola fila (id = 1)
    t.string('razon_social', 160).notNullable()
    t.string('nombre_comercial', 120)
    t.string('rif', 12) // J-12345678-9
    t.string('direccion', 255)
    t.string('ciudad', 80)
    t.string('estado', 60)
    t.string('telefono', 20)
    t.string('email', 160)
    t.string('sitio_web', 160)
    t.string('moneda_base', 3).notNullable().defaultTo('VES')
    t.specificType('logo', 'MEDIUMBLOB')
    t.string('logo_tipo', 20)
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('actualizado_por').unsigned().references('id').inTable('usuarios')
  })
  // Punto de partida con lo que se sabe del hospital; el RIF lo completa el administrador
  await knex('empresa').insert({
    id: 1,
    razon_social: 'Hospital de Clínicas CECIAMB',
    nombre_comercial: 'CECIAMB',
    ciudad: 'Ciudad Guayana',
    estado: 'Bolívar',
    sitio_web: 'https://ceciamb.com',
  })

  await knex.schema.createTable('ejercicios', (t) => {
    t.increments('id').primary()
    t.smallint('anio').unsigned().notNullable().unique() // año en que empieza
    t.date('fecha_inicio').notNullable()
    t.date('fecha_fin').notNullable()
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('creado_por').unsigned().references('id').inTable('usuarios')
  })

  await knex.schema.createTable('periodos', (t) => {
    t.increments('id').primary()
    t.integer('ejercicio_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('ejercicios')
      .onDelete('CASCADE')
    t.tinyint('numero').unsigned().notNullable() // 1..12 dentro del ejercicio
    t.smallint('anio').unsigned().notNullable()
    t.tinyint('mes').unsigned().notNullable()
    t.date('fecha_inicio').notNullable()
    t.date('fecha_fin').notNullable()
    t.enu('estado', ['ABIERTO', 'CERRADO']).notNullable().defaultTo('ABIERTO')
    t.datetime('cerrado_en')
    t.integer('cerrado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('reabierto_en')
    t.integer('reabierto_por').unsigned().references('id').inTable('usuarios')
    t.string('motivo_reapertura', 255)
    t.unique(['anio', 'mes'])
    t.unique(['ejercicio_id', 'numero'])
    t.index(['fecha_inicio', 'fecha_fin'])
  })

  // Permisos del nuevo módulo "empresa" para los roles de sistema existentes
  const roles = await knex('roles').whereIn('codigo', ['CONTADOR', 'ANALISTA', 'AUDITOR'])
  for (const rol of roles) {
    await knex('roles_permisos')
      .insert({ rol_id: rol.id, modulo: 'empresa', lectura: true, escritura: false, full: false })
      .onConflict(['rol_id', 'modulo'])
      .ignore()
  }
  // RF-08.2: reabrir períodos es del Administrador. El Contador conserva cerrar (modificar).
  const contador = roles.find((r) => r.codigo === 'CONTADOR')
  if (contador) {
    await knex('roles_permisos')
      .where({ rol_id: contador.id, modulo: 'periodos', full: true })
      .update({ full: false })
  }
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex('roles_permisos').where({ modulo: 'empresa' }).del()
  await knex.schema.dropTableIfExists('periodos')
  await knex.schema.dropTableIfExists('ejercicios')
  await knex.schema.dropTableIfExists('empresa')
}
