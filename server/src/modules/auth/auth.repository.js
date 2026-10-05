import { db } from '../../config/db.js'

const columnasPublicas = [
  'u.id',
  'u.nombre',
  'u.email',
  'u.activo',
  'u.ultimo_acceso',
  'r.codigo as rol',
  'r.nombre as rol_nombre',
]

export function buscarPorEmail(email, trx = db) {
  return trx('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select(...columnasPublicas, 'u.password_hash', 'u.intentos_fallidos', 'u.bloqueado_hasta')
    .where('u.email', email)
    .first()
}

export function buscarPorId(id, trx = db) {
  return trx('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select(...columnasPublicas)
    .where('u.id', id)
    .first()
}

export function actualizar(id, cambios, trx = db) {
  return trx('usuarios')
    .where({ id })
    .update({ ...cambios, actualizado_en: trx.fn.now() })
}
