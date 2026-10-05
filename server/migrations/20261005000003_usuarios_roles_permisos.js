import { permisosPorDefecto } from '../src/modules/roles/permisos.catalogo.js'

const COLORES = { ADMIN: '#004191', CONTADOR: '#0f766e', ANALISTA: '#7c3aed', AUDITOR: '#a15c07' }

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('roles', (t) => {
    t.string('color', 7).notNullable().defaultTo('#64748b')
    t.boolean('sistema').notNullable().defaultTo(false)
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.alterTable('usuarios', (t) => {
    t.string('apellido', 120).after('nombre')
    t.string('ci', 12).unique().after('apellido')
    t.string('telefono', 20).after('email')
    t.string('departamento', 80).after('telefono')
    t.boolean('debe_cambiar_clave').notNullable().defaultTo(false).after('password_hash')
    t.datetime('archivado_en')
    t.integer('archivado_por').unsigned().references('id').inTable('usuarios')
  })

  await knex.schema.createTable('roles_permisos', (t) => {
    t.integer('rol_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
    t.string('modulo', 40).notNullable()
    t.boolean('lectura').notNullable().defaultTo(false)
    t.boolean('escritura').notNullable().defaultTo(false)
    t.boolean('full').notNullable().defaultTo(false)
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('actualizado_por').unsigned().references('id').inTable('usuarios')
    t.primary(['rol_id', 'modulo'])
  })

  // Roles existentes pasan a ser de sistema, con color y permisos por defecto
  const roles = await knex('roles').select('id', 'codigo')
  for (const rol of roles) {
    await knex('roles')
      .where({ id: rol.id })
      .update({ sistema: true, color: COLORES[rol.codigo] ?? '#64748b' })
    const filas = Object.entries(permisosPorDefecto(rol.codigo)).map(([modulo, p]) => ({
      rol_id: rol.id,
      modulo,
      ...p,
    }))
    await knex('roles_permisos').insert(filas)
  }
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('roles_permisos')
  await knex.schema.alterTable('usuarios', (t) => {
    t.dropForeign('archivado_por')
    t.dropUnique(['ci'])
    t.dropColumns(
      'apellido',
      'ci',
      'telefono',
      'departamento',
      'debe_cambiar_clave',
      'archivado_en',
      'archivado_por',
    )
  })
  await knex.schema.alterTable('roles', (t) => {
    t.dropColumns('color', 'sistema', 'creado_en')
  })
}
