import { db } from '../../config/db.js'

const ID = 1

const COLUMNAS = [
  'razon_social',
  'nombre_comercial',
  'rif',
  'direccion',
  'ciudad',
  'estado',
  'telefono',
  'email',
  'sitio_web',
  'moneda_base',
  'logo_tipo',
  'actualizado_en',
]

export function obtener(trx = db) {
  return trx('empresa as e')
    .leftJoin('usuarios as u', 'u.id', 'e.actualizado_por')
    .select(COLUMNAS.map((c) => `e.${c}`))
    .select('u.nombre as actualizado_por_nombre', 'u.apellido as actualizado_por_apellido')
    .where('e.id', ID)
    .first()
}

export function actualizar(datos, usuarioId, trx) {
  return trx('empresa')
    .where({ id: ID })
    .update({ ...datos, actualizado_por: usuarioId, actualizado_en: trx.fn.now() })
}

export function logo() {
  return db('empresa').select('logo', 'logo_tipo').where({ id: ID }).first()
}
