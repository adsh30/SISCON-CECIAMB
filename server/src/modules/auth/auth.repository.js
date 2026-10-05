import { db } from '../../config/db.js'

const columnasPublicas = [
  'u.id',
  'u.nombre',
  'u.apellido',
  'u.email',
  'u.telefono',
  'u.departamento',
  'u.activo',
  'u.archivado_en',
  'u.debe_cambiar_clave',
  'u.ultimo_acceso',
  'u.rol_id',
  'r.codigo as rol',
  'r.nombre as rol_nombre',
  'r.color as rol_color',
]

export function buscarPorEmail(email, trx = db) {
  return trx('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select(...columnasPublicas, 'u.password_hash', 'u.intentos_fallidos', 'u.bloqueado_hasta')
    .where('u.email', email)
    .first()
}

export function buscarPorId(id, trx = db, { conHash = false } = {}) {
  return trx('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select(...columnasPublicas, ...(conHash ? ['u.password_hash'] : []))
    .where('u.id', id)
    .first()
}

export function actualizar(id, cambios, trx = db) {
  return trx('usuarios')
    .where({ id })
    .update({ ...cambios, actualizado_en: trx.fn.now() })
}
