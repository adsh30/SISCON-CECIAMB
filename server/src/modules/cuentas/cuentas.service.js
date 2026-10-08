import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as repo from './cuentas.repository.js'
import { NATURALEZA_POR_DEFECTO } from './cuentas.schema.js'

const aPublico = (c) => {
  if (!c) return null
  return {
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    descripcion: c.descripcion ?? null,
    tipo: c.tipo,
    naturaleza: c.naturaleza,
    nivel: c.nivel,
    padreId: c.padre_id ?? null,
    padreCodigo: c.padre_codigo ?? null,
    padreNombre: c.padre_nombre ?? null,
    esMovimiento: !!c.es_movimiento,
    activa: !!c.activa,
    creadoEn: c.creado_en,
    creadoPor: c.creado_por_nombre
      ? [c.creado_por_nombre, c.creado_por_apellido].filter(Boolean).join(' ')
      : null,
    actualizadoEn: c.actualizado_en,
  }
}

const instantanea = (c) => {
  const p = aPublico(c)
  if (!p) return null
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    tipo: p.tipo,
    naturaleza: p.naturaleza,
    nivel: p.nivel,
    padreId: p.padreId,
    esMovimiento: p.esMovimiento,
    activa: p.activa,
  }
}

export async function listar(filtros = {}) {
  const filas = await repo.listar(filtros)
  return filas.map(aPublico)
}

/** Construye un árbol jerárquico a partir de la lista completa */
export async function arbol(filtros = {}) {
  const cuentas = await listar(filtros)
  const mapa = new Map()
  const raices = []

  // Inicializar cada nodo con array de hijos
  for (const c of cuentas) {
    mapa.set(c.id, { ...c, hijos: [] })
  }

  // Vincular hijos a sus padres
  for (const c of cuentas) {
    const nodo = mapa.get(c.id)
    if (c.padreId && mapa.has(c.padreId)) {
      mapa.get(c.padreId).hijos.push(nodo)
    } else {
      raices.push(nodo)
    }
  }

  return raices
}

export async function obtener(id) {
  const cuenta = await repo.buscarPorId(id)
  if (!cuenta) throw new AppError(404, 'NO_ENCONTRADO', 'Cuenta contable no encontrada')
  return aPublico(cuenta)
}

export async function crear(datos, actor, ctx) {
  return db.transaction(async (trx) => {
    // 1. Verificar código único
    const existente = await repo.buscarPorCodigo(datos.codigo, trx)
    if (existente) {
      throw new AppError(
        409,
        'CODIGO_DUPLICADO',
        `Ya existe una cuenta con el código ${datos.codigo}`,
      )
    }

    let nivel = 1
    let naturaleza = datos.naturaleza || NATURALEZA_POR_DEFECTO[datos.tipo] || 'DEUDORA'
    let tipo = datos.tipo

    // 2. Si tiene padre, validar jerarquía y herencia
    if (datos.padreId) {
      const padre = await repo.buscarPorId(datos.padreId, trx)
      if (!padre) {
        throw new AppError(404, 'PADRE_NO_ENCONTRADO', 'La cuenta superior (padre) no existe')
      }
      if (padre.es_movimiento) {
        throw new AppError(
          400,
          'PADRE_ES_MOVIMIENTO',
          'Una cuenta de movimiento no puede tener subcuentas. Debe ser una cuenta de grupo o totalizadora',
        )
      }
      // El código debe ser prefijo del padre
      if (!datos.codigo.startsWith(`${padre.codigo}.`)) {
        throw new AppError(
          400,
          'CODIGO_NO_COINCIDE_CON_PADRE',
          `El código ${datos.codigo} debe comenzar con el prefijo de la cuenta superior (${padre.codigo}.)`,
        )
      }
      nivel = padre.nivel + 1
      tipo = padre.tipo // Hereda tipo del padre
      naturaleza = datos.naturaleza || padre.naturaleza
    }

    const fila = {
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      tipo,
      naturaleza,
      nivel,
      padre_id: datos.padreId || null,
      es_movimiento: !!datos.esMovimiento,
      activa: datos.activa !== undefined ? !!datos.activa : true,
      creado_por: actor?.id ?? null,
      creado_en: trx.fn.now(),
      actualizado_por: actor?.id ?? null,
      actualizado_en: trx.fn.now(),
    }

    const creada = await repo.crear(fila, trx)

    await registrar(trx, {
      usuarioId: actor?.id,
      accion: ACCIONES.CREAR,
      entidad: 'cuentas',
      entidadId: creada.id,
      despues: instantanea(creada),
      ctx,
    })

    return aPublico(creada)
  })
}

export async function actualizar(id, datos, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await repo.buscarPorId(id, trx)
    if (!antes) throw new AppError(404, 'NO_ENCONTRADO', 'Cuenta contable no encontrada')

    // Si se desea convertir a cuenta de movimiento, verificar que no tenga hijos
    if (datos.esMovimiento === true && !antes.es_movimiento) {
      const hijos = await repo.contarHijos(id, trx)
      if (hijos > 0) {
        throw new AppError(
          400,
          'TIENE_HIJOS',
          'No se puede convertir en cuenta de movimiento porque ya tiene subcuentas asociadas',
        )
      }
    }

    const cambios = {
      actualizado_por: actor?.id ?? null,
      actualizado_en: trx.fn.now(),
    }

    if (datos.nombre !== undefined) cambios.nombre = datos.nombre
    if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion || null
    if (datos.naturaleza !== undefined) cambios.naturaleza = datos.naturaleza
    if (datos.esMovimiento !== undefined) cambios.es_movimiento = !!datos.esMovimiento
    if (datos.activa !== undefined) cambios.activa = !!datos.activa

    const actualizada = await repo.actualizar(id, cambios, trx)

    let accion = ACCIONES.EDITAR
    if (datos.activa !== undefined && datos.activa !== Boolean(antes.activa)) {
      accion = datos.activa ? ACCIONES.ACTIVAR : ACCIONES.DESACTIVAR
    }

    await registrar(trx, {
      usuarioId: actor?.id,
      accion,
      entidad: 'cuentas',
      entidadId: id,
      antes: instantanea(antes),
      despues: instantanea(actualizada),
      ctx,
    })

    return aPublico(actualizada)
  })
}

export async function eliminar(id, actor, ctx) {
  return db.transaction(async (trx) => {
    const cuenta = await repo.buscarPorId(id, trx)
    if (!cuenta) throw new AppError(404, 'NO_ENCONTRADO', 'Cuenta contable no encontrada')

    const hijos = await repo.contarHijos(id, trx)
    if (hijos > 0) {
      throw new AppError(
        400,
        'TIENE_HIJOS',
        'No se puede eliminar la cuenta porque posee subcuentas. Elimine primero las subcuentas',
      )
    }

    const movimientos = await repo.contarMovimientos(id, trx)
    if (movimientos > 0) {
      throw new AppError(
        400,
        'TIENE_MOVIMIENTOS',
        'No se puede eliminar una cuenta que posee movimientos en comprobantes. Puede desactivarla en su lugar',
      )
    }

    await repo.eliminar(id, trx)

    await registrar(trx, {
      usuarioId: actor?.id,
      accion: ACCIONES.ELIMINAR,
      entidad: 'cuentas',
      entidadId: id,
      antes: instantanea(cuenta),
      ctx,
    })

    return true
  })
}
