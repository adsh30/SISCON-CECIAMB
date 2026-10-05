import { db } from '../../config/db.js'
import { normalizar } from './permisos.catalogo.js'

/** Matriz de permisos de un rol: { modulo: { lectura, escritura, full } } */
export async function permisosDeRol(rolId, trx = db) {
  const filas = await trx('roles_permisos')
    .select('modulo', 'lectura', 'escritura', 'full')
    .where({ rol_id: rolId })
  return normalizar(
    Object.fromEntries(
      filas.map((f) => [
        f.modulo,
        { lectura: !!f.lectura, escritura: !!f.escritura, full: !!f.full },
      ]),
    ),
  )
}

/** Reemplaza la matriz completa de un rol. */
export async function guardarPermisos(rolId, permisos, usuarioId, trx) {
  await trx('roles_permisos').where({ rol_id: rolId }).del()
  const filas = Object.entries(normalizar(permisos)).map(([modulo, p]) => ({
    rol_id: rolId,
    modulo,
    ...p,
    actualizado_por: usuarioId,
  }))
  await trx('roles_permisos').insert(filas)
}
