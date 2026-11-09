import { db } from '../../config/db.js'

const COLUMNAS = [
  'c.id',
  'c.codigo',
  'c.nombre',
  'c.descripcion',
  'c.tipo',
  'c.naturaleza',
  'c.moneda',
  'c.nivel',
  'c.padre_id',
  'c.es_movimiento',
  'c.activa',
  'c.creado_en',
  'c.creado_por',
  'c.actualizado_en',
  'c.actualizado_por',
  'p.codigo as padre_codigo',
  'p.nombre as padre_nombre',
  'u.nombre as creado_por_nombre',
  'u.apellido as creado_por_apellido',
]

const conPadreYUsuario = (trx = db) =>
  trx('cuentas as c')
    .leftJoin('cuentas as p', 'p.id', 'c.padre_id')
    .leftJoin('usuarios as u', 'u.id', 'c.creado_por')
    .select(COLUMNAS)

/** Escapa % y _ para usarlos en LIKE */
export const comoLike = (texto) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

export function listar({ q, tipo, soloMovimiento, soloActivas } = {}, trx = db) {
  const query = conPadreYUsuario(trx).orderBy('c.codigo', 'asc')

  if (q) {
    const termino = comoLike(q)
    query.where((b) => {
      b.where('c.codigo', 'like', termino).orWhere('c.nombre', 'like', termino)
    })
  }
  if (tipo) {
    query.where('c.tipo', tipo)
  }
  if (soloMovimiento != null) {
    query.where('c.es_movimiento', !!soloMovimiento)
  }
  if (soloActivas != null) {
    query.where('c.activa', !!soloActivas)
  }
  return query
}

export function buscarPorId(id, trx = db) {
  return conPadreYUsuario(trx).where('c.id', id).first()
}

/** Bloquea la fila mientras se valida y modifica */
export function bloquear(id, trx) {
  return trx('cuentas').select('id').where({ id }).forUpdate().first()
}

export function buscarPorCodigo(codigo, trx = db) {
  return conPadreYUsuario(trx).where('c.codigo', codigo).first()
}

export async function contarHijos(id, trx = db) {
  const res = await trx('cuentas').where({ padre_id: id }).count({ total: '*' }).first()
  return Number(res?.total ?? 0)
}

export async function contarHijosActivos(id, trx = db) {
  const res = await trx('cuentas')
    .where({ padre_id: id, activa: true })
    .count({ total: '*' })
    .first()
  return Number(res?.total ?? 0)
}

export async function contarMovimientos(id, trx = db) {
  const existeTabla = await trx.schema.hasTable('comprobante_detalle')
  if (!existeTabla) return 0
  const res = await trx('comprobante_detalle')
    .where({ cuenta_id: id })
    .count({ total: '*' })
    .first()
  return Number(res?.total ?? 0)
}

/** La cuenta y todos sus auxiliares (el código del padre es prefijo del de sus hijos) */
const rama = (q, codigo) =>
  q.where((w) => w.where('cu.codigo', codigo).orWhere('cu.codigo', 'like', `${codigo}.%`))

/** Renglones de comprobantes en la cuenta o en cualquiera de sus subcuentas */
export async function contarMovimientosRama(codigo, trx = db) {
  const res = await rama(
    trx('comprobante_detalle as d').join('cuentas as cu', 'cu.id', 'd.cuenta_id'),
    codigo,
  )
    .count({ total: '*' })
    .first()
  return Number(res?.total ?? 0)
}

/** Fija la moneda de todas las subcuentas (de cualquier nivel); devuelve cuántas son */
export function cambiarMonedaAuxiliares(codigo, moneda, actorId, trx) {
  return trx('cuentas')
    .where('codigo', 'like', `${codigo}.%`)
    .update({ moneda, actualizado_por: actorId, actualizado_en: trx.fn.now() })
}

/** ¿Está elegida como cuenta de ganancia o pérdida cambiaria en Empresa? */
export async function usadaEnEmpresa(id, trx = db) {
  return !!(await trx('empresa')
    .where('cuenta_ganancia_cambiaria_id', id)
    .orWhere('cuenta_perdida_cambiaria_id', id)
    .first('id'))
}

export async function crear(datos, trx = db) {
  const [id] = await trx('cuentas').insert(datos)
  return buscarPorId(id, trx)
}

export async function actualizar(id, datos, trx = db) {
  await trx('cuentas').where({ id }).update(datos)
  return buscarPorId(id, trx)
}

export async function eliminar(id, trx = db) {
  return trx('cuentas').where({ id }).del()
}

export async function contarTotal(trx = db) {
  const res = await trx('cuentas').count({ total: '*' }).first()
  return Number(res?.total ?? 0)
}
