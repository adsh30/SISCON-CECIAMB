import { db } from '../../config/db.js'
import { comoLike } from '../cuentas/cuentas.repository.js'

const COLUMNAS = [
  'cc.id',
  'cc.codigo',
  'cc.nombre',
  'cc.descripcion',
  'cc.activo',
  'cc.creado_en',
  'cc.creado_por',
  'cc.actualizado_en',
  'cc.actualizado_por',
  'u.nombre as creado_por_nombre',
  'u.apellido as creado_por_apellido',
]

const conUsuario = (trx = db) =>
  trx('centros_costo as cc').leftJoin('usuarios as u', 'u.id', 'cc.creado_por').select(COLUMNAS)

export function listar({ q, soloActivos } = {}, trx = db) {
  const query = conUsuario(trx).orderBy('cc.codigo', 'asc')

  if (q) {
    const termino = comoLike(q)
    query.where((b) => {
      b.where('cc.codigo', 'like', termino).orWhere('cc.nombre', 'like', termino)
    })
  }
  if (soloActivos != null) {
    query.where('cc.activo', !!soloActivos)
  }

  return query
}

export function buscarPorId(id, trx = db) {
  return conUsuario(trx).where('cc.id', id).first()
}

export function buscarPorCodigo(codigo, trx = db) {
  return conUsuario(trx).where('cc.codigo', codigo).first()
}

export async function contarMovimientos(id, trx = db) {
  const existeTabla = await trx.schema.hasTable('comprobante_detalle')
  if (!existeTabla) return 0
  const res = await trx('comprobante_detalle')
    .where({ centro_costo_id: id })
    .count({ total: '*' })
    .first()
  return Number(res?.total ?? 0)
}

export async function crear(datos, trx = db) {
  const [id] = await trx('centros_costo').insert(datos)
  return buscarPorId(id, trx)
}

export async function actualizar(id, datos, trx = db) {
  await trx('centros_costo').where({ id }).update(datos)
  return buscarPorId(id, trx)
}

export async function eliminar(id, trx = db) {
  return trx('centros_costo').where({ id }).del()
}
