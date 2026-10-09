import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as repo from './centros-costo.repository.js'

const aPublico = (cc) => {
  if (!cc) return null
  return {
    id: cc.id,
    codigo: cc.codigo,
    nombre: cc.nombre,
    descripcion: cc.descripcion ?? null,
    activo: !!cc.activo,
    creadoEn: cc.creado_en,
    creadoPor: cc.creado_por_nombre
      ? [cc.creado_por_nombre, cc.creado_por_apellido].filter(Boolean).join(' ')
      : null,
    actualizadoEn: cc.actualizado_en,
  }
}

const instantanea = (cc) => {
  const p = aPublico(cc)
  if (!p) return null
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    activo: p.activo,
  }
}

export async function listar(filtros = {}) {
  const filas = await repo.listar(filtros)
  return filas.map(aPublico)
}

export async function obtener(id) {
  const cc = await repo.buscarPorId(id)
  if (!cc) throw new AppError(404, 'NO_ENCONTRADO', 'Centro de costo no encontrado')
  return aPublico(cc)
}

const duplicado = (codigo) =>
  new AppError(409, 'CODIGO_DUPLICADO', `Ya existe un centro de costo con el código ${codigo}`)

export async function crear(datos, actor, ctx) {
  return db.transaction(async (trx) => {
    if (await repo.buscarPorCodigo(datos.codigo, trx)) throw duplicado(datos.codigo)

    let creado
    try {
      creado = await repo.crear(
        {
          codigo: datos.codigo,
          nombre: datos.nombre,
          descripcion: datos.descripcion ?? null,
          activo: datos.activo,
          creado_por: actor?.id ?? null,
          actualizado_por: actor?.id ?? null,
        },
        trx,
      )
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw duplicado(datos.codigo)
      throw err
    }

    await registrar(trx, {
      usuarioId: actor?.id,
      accion: ACCIONES.CREAR,
      entidad: 'centros_costo',
      entidadId: creado.id,
      despues: instantanea(creado),
      ctx,
    })

    return aPublico(creado)
  })
}

export async function actualizar(id, datos, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await repo.buscarPorId(id, trx)
    if (!antes) throw new AppError(404, 'NO_ENCONTRADO', 'Centro de costo no encontrado')

    const cambios = {}
    if (datos.nombre !== undefined && datos.nombre !== antes.nombre) cambios.nombre = datos.nombre
    if (datos.descripcion !== undefined && datos.descripcion !== (antes.descripcion ?? null)) {
      cambios.descripcion = datos.descripcion
    }
    if (datos.activo !== undefined && datos.activo !== Boolean(antes.activo)) {
      cambios.activo = datos.activo
    }

    // Nada que guardar: no se toca la fila ni se ensucia la bitácora
    if (Object.keys(cambios).length === 0) return aPublico(antes)

    const actualizado = await repo.actualizar(
      id,
      { ...cambios, actualizado_por: actor?.id ?? null, actualizado_en: trx.fn.now() },
      trx,
    )

    let accion = ACCIONES.EDITAR
    if (cambios.activo !== undefined && Object.keys(cambios).length === 1) {
      accion = cambios.activo ? ACCIONES.ACTIVAR : ACCIONES.DESACTIVAR
    }

    await registrar(trx, {
      usuarioId: actor?.id,
      accion,
      entidad: 'centros_costo',
      entidadId: id,
      antes: instantanea(antes),
      despues: instantanea(actualizado),
      ctx,
    })

    return aPublico(actualizado)
  })
}

export async function eliminar(id, actor, ctx) {
  return db.transaction(async (trx) => {
    const cc = await repo.buscarPorId(id, trx)
    if (!cc) throw new AppError(404, 'NO_ENCONTRADO', 'Centro de costo no encontrado')

    const movimientos = await repo.contarMovimientos(id, trx)
    if (movimientos > 0) {
      throw new AppError(
        400,
        'TIENE_MOVIMIENTOS',
        'No se puede eliminar un centro de costo con movimientos contables. Puede desactivarlo en su lugar',
      )
    }

    await repo.eliminar(id, trx)

    await registrar(trx, {
      usuarioId: actor?.id,
      accion: ACCIONES.ELIMINAR,
      entidad: 'centros_costo',
      entidadId: id,
      antes: instantanea(cc),
      ctx,
    })
  })
}
