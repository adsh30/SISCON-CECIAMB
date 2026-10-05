import bcrypt from 'bcryptjs'

export const ROLES = [
  { codigo: 'ADMIN', nombre: 'Administrador', descripcion: 'Gestiona usuarios, configuración y períodos' },
  { codigo: 'CONTADOR', nombre: 'Contador general', descripcion: 'Registra, aprueba y anula comprobantes; cierra períodos' },
  { codigo: 'ANALISTA', nombre: 'Analista contable', descripcion: 'Registra comprobantes en borrador y consulta libros' },
  { codigo: 'AUDITOR', nombre: 'Auditor', descripcion: 'Consulta comprobantes, libros y bitácora (solo lectura)' },
]

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  await knex('roles').insert(ROLES).onConflict('codigo').merge(['nombre', 'descripcion'])

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Defina ADMIN_EMAIL y ADMIN_PASSWORD en .env para crear el administrador')
  }
  const existe = await knex('usuarios').where({ email }).first()
  if (existe) return

  const rol = await knex('roles').where({ codigo: 'ADMIN' }).first()
  await knex('usuarios').insert({
    nombre: process.env.ADMIN_NOMBRE ?? 'Administrador',
    email,
    password_hash: await bcrypt.hash(password, 12),
    rol_id: rol.id,
  })
}
