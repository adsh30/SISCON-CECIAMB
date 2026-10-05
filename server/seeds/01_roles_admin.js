import bcrypt from 'bcryptjs'
import { permisosPorDefecto } from '../src/modules/roles/permisos.catalogo.js'

export const ROLES = [
  {
    codigo: 'ADMIN',
    nombre: 'Administrador',
    descripcion: 'Gestiona usuarios, configuración y períodos',
    color: '#004191',
  },
  {
    codigo: 'CONTADOR',
    nombre: 'Contador general',
    descripcion: 'Registra, aprueba y anula comprobantes; cierra períodos',
    color: '#0f766e',
  },
  {
    codigo: 'ANALISTA',
    nombre: 'Analista contable',
    descripcion: 'Registra comprobantes en borrador y consulta libros',
    color: '#7c3aed',
  },
  {
    codigo: 'AUDITOR',
    nombre: 'Auditor',
    descripcion: 'Consulta comprobantes, libros y bitácora (solo lectura)',
    color: '#a15c07',
  },
]

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  // Roles de sistema: se crean si faltan; no se pisan nombres ni colores ya editados
  await knex('roles')
    .insert(ROLES.map((r) => ({ ...r, sistema: true })))
    .onConflict('codigo')
    .merge(['sistema'])

  // Matriz por defecto solo para roles que aún no tienen permisos
  const roles = await knex('roles').whereIn(
    'codigo',
    ROLES.map((r) => r.codigo),
  )
  for (const rol of roles) {
    const tiene = await knex('roles_permisos').where({ rol_id: rol.id }).first()
    if (tiene) continue
    await knex('roles_permisos').insert(
      Object.entries(permisosPorDefecto(rol.codigo)).map(([modulo, p]) => ({
        rol_id: rol.id,
        modulo,
        ...p,
      })),
    )
  }

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Defina ADMIN_EMAIL y ADMIN_PASSWORD en .env para crear el administrador')
  }
  const existe = await knex('usuarios').where({ email }).first()
  if (existe) return

  const rol = roles.find((r) => r.codigo === 'ADMIN')
  await knex('usuarios').insert({
    nombre: process.env.ADMIN_NOMBRE ?? 'Administrador',
    email,
    password_hash: await bcrypt.hash(password, 12),
    rol_id: rol.id,
  })
}
