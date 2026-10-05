import { db } from '../../config/db.js'

const columnas = [
  'u.id',
  'u.nombre',
  'u.apellido',
  'u.ci',
  'u.email',
  'u.telefono',
  'u.departamento',
  'u.activo',
  'u.debe_cambiar_clave',
  'u.bloqueado_hasta',
  'u.ultimo_acceso',
  'u.creado_en',
  'u.archivado_en',
  'u.rol_id',
  'r.codigo as rol',
  'r.nombre as rol_nombre',
  'r.color as rol_color',
  db.raw("CONCAT_WS(' ', a.nombre, a.apellido) as archivado_por_nombre"),
]

function base(trx = db) {
  return trx('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .leftJoin('usuarios as a', 'a.id', 'u.archivado_por')
    .select(columnas)
}

export function listar({ buscar, rolId, estado }) {
  const q = base().orderBy([
    { column: 'u.nombre', order: 'asc' },
    { column: 'u.apellido', order: 'asc' },
  ])
  if (rolId) q.where('u.rol_id', rolId)
  if (estado === 'activos') q.where('u.activo', true).whereNull('u.archivado_en')
  if (estado === 'inactivos') q.where('u.activo', false).whereNull('u.archivado_en')
  if (estado === 'archivados') q.whereNotNull('u.archivado_en')
  if (estado === 'todos') q.whereNull('u.archivado_en')
  if (buscar) {
    for (const palabra of buscar.split(/\s+/)) {
      const like = `%${palabra.replace(/[%_\\]/g, '\\$&')}%`
      q.where((w) =>
        w
          .whereILike('u.nombre', like)
          .orWhereILike('u.apellido', like)
          .orWhereILike('u.email', like)
          .orWhereILike('u.ci', like)
          .orWhereILike('r.nombre', like),
      )
    }
  }
  return q
}

export async function resumen() {
  const fila = await db('usuarios')
    .select(
      db.raw('SUM(activo = 1 AND archivado_en IS NULL) as activos'),
      db.raw('SUM(activo = 0 AND archivado_en IS NULL) as inactivos'),
      db.raw('SUM(archivado_en IS NOT NULL) as archivados'),
    )
    .first()
  return {
    activos: Number(fila.activos ?? 0),
    inactivos: Number(fila.inactivos ?? 0),
    archivados: Number(fila.archivados ?? 0),
  }
}

export function buscarPorId(id, trx = db) {
  return base(trx).where('u.id', id).first()
}

export function existeCampo(campo, valor, excluirId, trx = db) {
  const q = trx('usuarios').where(campo, valor).first('id')
  if (excluirId) q.whereNot('id', excluirId)
  return q
}

export function crear(datos, trx) {
  return trx('usuarios').insert(datos)
}

export function actualizar(id, cambios, trx) {
  return trx('usuarios')
    .where({ id })
    .update({ ...cambios, actualizado_en: trx.fn.now() })
}

/** Administradores activos y no archivados, excluyendo opcionalmente a uno. */
export async function contarAdminsActivos(excluirId, trx = db) {
  const q = trx('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .where({ 'r.codigo': 'ADMIN', 'u.activo': true })
    .whereNull('u.archivado_en')
    .count({ n: '*' })
    .first()
  if (excluirId) q.whereNot('u.id', excluirId)
  return Number((await q).n)
}

export async function departamentos() {
  const filas = await db('usuarios')
    .distinct('departamento')
    .whereNotNull('departamento')
    .orderBy('departamento')
  return filas.map((f) => f.departamento)
}
