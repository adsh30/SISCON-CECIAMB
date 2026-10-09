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
    descripcion: p.descripcion,
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

const duplicado = (codigo) =>
  new AppError(409, 'CODIGO_DUPLICADO', `Ya existe una cuenta con el código ${codigo}`)

export async function crear(datos, actor, ctx) {
  return db.transaction(async (trx) => {
    if (await repo.buscarPorCodigo(datos.codigo, trx)) throw duplicado(datos.codigo)

    let nivel = 1
    let tipo = datos.tipo
    let naturaleza = datos.naturaleza || NATURALEZA_POR_DEFECTO[tipo]

    if (datos.padreId) {
      // El padre queda bloqueado para que nadie lo convierta en cuenta de movimiento a la vez
      await repo.bloquear(datos.padreId, trx)
      const padre = await repo.buscarPorId(datos.padreId, trx)
      if (!padre) {
        throw new AppError(404, 'PADRE_NO_ENCONTRADO', 'La cuenta superior no existe')
      }
      if (padre.es_movimiento) {
        throw new AppError(
          400,
          'PADRE_ES_MOVIMIENTO',
          `${padre.codigo} es una cuenta de movimiento y no puede tener subcuentas`,
        )
      }
      if (!padre.activa) {
        throw new AppError(
          400,
          'PADRE_INACTIVO',
          `La cuenta superior ${padre.codigo} está inactiva; actívela antes de crearle subcuentas`,
        )
      }
      // Un solo nivel más que el padre: 1.1 → 1.1.01, nunca 1.1.01.05
      const resto = datos.codigo.slice(padre.codigo.length + 1)
      if (!datos.codigo.startsWith(`${padre.codigo}.`) || resto.includes('.')) {
        throw new AppError(
          400,
          'CODIGO_NO_COINCIDE_CON_PADRE',
          `El código debe ser ${padre.codigo}. seguido de un número, por ejemplo ${padre.codigo}.01`,
        )
      }
      nivel = padre.nivel + 1
      tipo = padre.tipo
      naturaleza = datos.naturaleza || padre.naturaleza
    } else if (datos.codigo.includes('.')) {
      throw new AppError(
        400,
        'CODIGO_RAIZ',
        'Una cuenta sin cuenta superior lleva un código de un solo número, por ejemplo 7',
      )
    }

    let creada
    try {
      creada = await repo.crear(
        {
          codigo: datos.codigo,
          nombre: datos.nombre,
          descripcion: datos.descripcion ?? null,
          tipo,
          naturaleza,
          nivel,
          padre_id: datos.padreId || null,
          es_movimiento: datos.esMovimiento,
          activa: datos.activa,
          creado_por: actor?.id ?? null,
          actualizado_por: actor?.id ?? null,
        },
        trx,
      )
    } catch (err) {
      // Dos usuarios creando el mismo código al mismo tiempo
      if (err.code === 'ER_DUP_ENTRY') throw duplicado(datos.codigo)
      throw err
    }

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
    await repo.bloquear(id, trx)
    const antes = await repo.buscarPorId(id, trx)
    if (!antes) throw new AppError(404, 'NO_ENCONTRADO', 'Cuenta contable no encontrada')

    const cambios = {}
    if (datos.nombre !== undefined && datos.nombre !== antes.nombre) cambios.nombre = datos.nombre
    if (datos.descripcion !== undefined && datos.descripcion !== (antes.descripcion ?? null)) {
      cambios.descripcion = datos.descripcion
    }
    if (datos.naturaleza !== undefined && datos.naturaleza !== antes.naturaleza) {
      cambios.naturaleza = datos.naturaleza
    }
    if (datos.esMovimiento !== undefined && datos.esMovimiento !== Boolean(antes.es_movimiento)) {
      cambios.es_movimiento = datos.esMovimiento
    }
    if (datos.activa !== undefined && datos.activa !== Boolean(antes.activa)) {
      cambios.activa = datos.activa
    }

    // Nada que guardar: no se toca la fila ni se ensucia la bitácora
    if (Object.keys(cambios).length === 0) return aPublico(antes)

    if (cambios.es_movimiento === true && (await repo.contarHijos(id, trx)) > 0) {
      throw new AppError(
        400,
        'TIENE_HIJOS',
        'No puede ser cuenta de movimiento porque ya tiene subcuentas',
      )
    }
    // Lo ya registrado en comprobantes no puede cambiar de sentido ni dejar de ser movimiento
    if (
      (cambios.es_movimiento === false || cambios.naturaleza) &&
      (await repo.contarMovimientos(id, trx)) > 0
    ) {
      throw new AppError(
        400,
        'TIENE_MOVIMIENTOS',
        'La cuenta ya tiene movimientos en comprobantes: no se puede cambiar su naturaleza ni convertirla en cuenta de grupo',
      )
    }
    if (cambios.activa === false && (await repo.contarHijosActivos(id, trx)) > 0) {
      throw new AppError(
        400,
        'SUBCUENTAS_ACTIVAS',
        'Desactive primero las subcuentas de esta cuenta',
      )
    }
    if (cambios.activa === true && antes.padre_id) {
      const padre = await repo.buscarPorId(antes.padre_id, trx)
      if (!padre.activa) {
        throw new AppError(
          400,
          'PADRE_INACTIVO',
          `Active primero la cuenta superior ${padre.codigo}`,
        )
      }
    }

    const actualizada = await repo.actualizar(
      id,
      { ...cambios, actualizado_por: actor?.id ?? null, actualizado_en: trx.fn.now() },
      trx,
    )

    let accion = ACCIONES.EDITAR
    if (cambios.activa !== undefined && Object.keys(cambios).length === 1) {
      accion = cambios.activa ? ACCIONES.ACTIVAR : ACCIONES.DESACTIVAR
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
    await repo.bloquear(id, trx)
    const cuenta = await repo.buscarPorId(id, trx)
    if (!cuenta) throw new AppError(404, 'NO_ENCONTRADO', 'Cuenta contable no encontrada')

    if ((await repo.contarHijos(id, trx)) > 0) {
      throw new AppError(
        400,
        'TIENE_HIJOS',
        'No se puede eliminar una cuenta con subcuentas. Elimine primero las subcuentas',
      )
    }
    if ((await repo.contarMovimientos(id, trx)) > 0) {
      throw new AppError(
        400,
        'TIENE_MOVIMIENTOS',
        'No se puede eliminar una cuenta con movimientos en comprobantes. Puede desactivarla',
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
  })
}
