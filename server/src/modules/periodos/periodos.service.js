import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { fechaHoyVE } from '../../utils/fechas.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import { fechaVE, generarPeriodos, nombrePeriodo, sumarDias } from './periodos.fechas.js'
import * as repo from './periodos.repository.js'

const conflicto = (code, message) => new AppError(409, code, message)
const nombre = (n, a) => (n ? [n, a].filter(Boolean).join(' ') : null)

const aPeriodo = (p) => ({
  id: p.id,
  ejercicioId: p.ejercicio_id,
  numero: p.numero,
  anio: p.anio,
  mes: p.mes,
  nombre: nombrePeriodo(p),
  fechaInicio: p.fecha_inicio,
  fechaFin: p.fecha_fin,
  estado: p.estado,
  cerradoEn: p.cerrado_en,
  cerradoPor: nombre(p.cerrado_por_nombre, p.cerrado_por_apellido),
  reabiertoEn: p.reabierto_en,
  reabiertoPor: nombre(p.reabierto_por_nombre, p.reabierto_por_apellido),
  motivoReapertura: p.motivo_reapertura,
})

function aEjercicio(e, periodos) {
  const cerrados = periodos.filter((p) => p.estado === 'CERRADO').length
  const anioFin = Number(e.fecha_fin.slice(0, 4))
  return {
    id: e.id,
    anio: e.anio,
    nombre: anioFin === e.anio ? `Ejercicio ${e.anio}` : `Ejercicio ${e.anio}-${anioFin}`,
    fechaInicio: e.fecha_inicio,
    fechaFin: e.fecha_fin,
    // El ejercicio queda cerrado cuando se cierran sus 12 períodos
    estado: cerrados === periodos.length ? 'CERRADO' : 'ABIERTO',
    cerrados,
    periodos,
  }
}

export async function listar() {
  const [ejercicios, periodos] = await Promise.all([repo.ejercicios(), repo.periodos()])
  const hoy = fechaHoyVE()
  const actual = periodos.find((p) => p.fecha_inicio <= hoy && p.fecha_fin >= hoy)
  return {
    hoy,
    periodoActualId: actual?.id ?? null,
    ejercicios: ejercicios.map((e) =>
      aEjercicio(e, periodos.filter((p) => p.ejercicio_id === e.id).map(aPeriodo)),
    ),
  }
}

/** Período que contiene hoy (hora de Caracas), o null */
export async function actual() {
  const p = await repo.periodoDeFecha(fechaHoyVE())
  return p ? aPeriodo(p) : null
}

export async function crearEjercicio({ anio, mesInicio }, actor, ctx) {
  const periodos = generarPeriodos(anio, mesInicio)
  const inicio = periodos[0].fecha_inicio
  const fin = periodos[11].fecha_fin

  return db.transaction(async (trx) => {
    await trx('ejercicios').select('id').forUpdate()
    if (await trx('ejercicios').where({ anio }).first()) {
      throw conflicto('EJERCICIO_DUPLICADO', `Ya existe un ejercicio que empieza en ${anio}`)
    }
    // Los ejercicios van uno detrás de otro: sin huecos ni solapes entre ellos
    const l = await repo.limites(trx)
    if (Number(l.total) > 0) {
      const siguiente = sumarDias(l.fin, 1)
      const anterior = sumarDias(l.inicio, -1)
      if (inicio !== siguiente && fin !== anterior) {
        throw conflicto(
          'EJERCICIO_NO_CONTIGUO',
          `El nuevo ejercicio debe empezar el ${fechaVE(siguiente)} (después del último) ` +
            `o terminar el ${fechaVE(anterior)} (antes del primero)`,
        )
      }
    }

    const [id] = await trx('ejercicios').insert({
      anio,
      fecha_inicio: inicio,
      fecha_fin: fin,
      creado_por: actor.id,
    })
    await trx('periodos').insert(periodos.map((p) => ({ ...p, ejercicio_id: id })))
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: 'ejercicios',
      entidadId: id,
      despues: { anio, desde: fechaVE(inicio), hasta: fechaVE(fin), periodos: 12 },
      ctx,
    })
    const ejercicio = await repo.ejercicioPorId(id, trx)
    const filas = (await repo.periodos(trx)).filter((p) => p.ejercicio_id === id)
    return aEjercicio(ejercicio, filas.map(aPeriodo))
  })
}

export async function eliminarEjercicio(id, actor, ctx) {
  return db.transaction(async (trx) => {
    await trx('ejercicios').select('id').forUpdate()
    const e = await repo.ejercicioPorId(id, trx)
    if (!e) throw new AppError(404, 'NO_ENCONTRADO', 'El ejercicio no existe')

    const l = await repo.limites(trx)
    if (e.fecha_inicio !== l.inicio && e.fecha_fin !== l.fin) {
      throw conflicto(
        'EJERCICIO_INTERMEDIO',
        'Solo se puede eliminar el primer o el último ejercicio, para no dejar huecos',
      )
    }
    const cerrado = await trx('periodos').where({ ejercicio_id: id, estado: 'CERRADO' }).first()
    if (cerrado) {
      throw conflicto(
        'EJERCICIO_CON_CIERRES',
        `No se puede eliminar: ${nombrePeriodo(cerrado)} está cerrado`,
      )
    }

    const conComprobantes = await trx('comprobantes as c')
      .join('periodos as p', 'p.id', 'c.periodo_id')
      .where('p.ejercicio_id', id)
      .first('c.id')
    if (conComprobantes) {
      throw conflicto(
        'EJERCICIO_CON_COMPROBANTES',
        'No se puede eliminar: el ejercicio tiene comprobantes registrados',
      )
    }

    await trx('ejercicios').where({ id }).del() // los períodos se borran en cascada
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.ELIMINAR,
      entidad: 'ejercicios',
      entidadId: id,
      antes: { anio: e.anio, desde: fechaVE(e.fecha_inicio), hasta: fechaVE(e.fecha_fin) },
      ctx,
    })
  })
}

async function periodoBloqueado(id, trx) {
  await repo.bloquearPeriodos(trx)
  const p = await repo.periodoPorId(id, trx)
  if (!p) throw new AppError(404, 'NO_ENCONTRADO', 'El período no existe')
  return p
}

export async function cerrar(id, actor, ctx) {
  return db.transaction(async (trx) => {
    const p = await periodoBloqueado(id, trx)
    if (p.estado === 'CERRADO') {
      throw conflicto('PERIODO_CERRADO', `${nombrePeriodo(p)} ya está cerrado`)
    }
    if (p.fecha_inicio > fechaHoyVE()) {
      throw conflicto('PERIODO_FUTURO', `${nombrePeriodo(p)} todavía no ha comenzado`)
    }
    // Se cierra en orden: primero los meses anteriores
    const abierto = await repo.primerAbiertoAntes(p.fecha_inicio, trx)
    if (abierto) {
      throw conflicto(
        'ANTERIORES_ABIERTOS',
        `Cierre primero ${nombrePeriodo(abierto)}: los períodos se cierran en orden`,
      )
    }
    // RF-08.1: no se cierra con borradores pendientes
    const borradores = await trx('comprobantes')
      .where({ periodo_id: id, estado: 'BORRADOR' })
      .count({ n: '*' })
      .first()
    if (Number(borradores.n) > 0) {
      throw conflicto(
        'PERIODO_CON_BORRADORES',
        `${nombrePeriodo(p)} tiene ${borradores.n} comprobante(s) en borrador: apruébelos o elimínelos antes de cerrar`,
      )
    }

    await repo.cambiarEstado(
      id,
      { estado: 'CERRADO', cerrado_en: trx.raw('UTC_TIMESTAMP()'), cerrado_por: actor.id },
      trx,
    )
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CERRAR_PERIODO,
      entidad: 'periodos',
      entidadId: id,
      antes: { periodo: nombrePeriodo(p), estado: 'ABIERTO' },
      despues: { periodo: nombrePeriodo(p), estado: 'CERRADO' },
      ctx,
    })
    return aPeriodo(await repo.periodoPorId(id, trx))
  })
}

export async function reabrir(id, motivo, actor, ctx) {
  return db.transaction(async (trx) => {
    const p = await periodoBloqueado(id, trx)
    if (p.estado === 'ABIERTO') {
      throw conflicto('PERIODO_ABIERTO', `${nombrePeriodo(p)} ya está abierto`)
    }
    // Se reabre en orden inverso: primero el último cerrado
    const posterior = await repo.ultimoCerradoDespues(p.fecha_inicio, trx)
    if (posterior) {
      throw conflicto(
        'POSTERIORES_CERRADOS',
        `Reabra primero ${nombrePeriodo(posterior)}: solo se reabre el último período cerrado`,
      )
    }

    await repo.cambiarEstado(
      id,
      {
        estado: 'ABIERTO',
        reabierto_en: trx.raw('UTC_TIMESTAMP()'),
        reabierto_por: actor.id,
        motivo_reapertura: motivo,
      },
      trx,
    )
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.REABRIR_PERIODO,
      entidad: 'periodos',
      entidadId: id,
      antes: { periodo: nombrePeriodo(p), estado: 'CERRADO' },
      despues: { periodo: nombrePeriodo(p), estado: 'ABIERTO', motivo },
      ctx,
    })
    return aPeriodo(await repo.periodoPorId(id, trx))
  })
}

/**
 * Regla RF-02.3 para los comprobantes (Fase 4): la fecha debe caer en un período abierto.
 * Toma un bloqueo compartido para que nadie cierre el período mientras se registra.
 */
export async function exigirPeriodoAbierto(fecha, trx) {
  const p = await repo.periodoDeFecha(fecha, trx).forShare()
  if (!p) {
    throw conflicto(
      'SIN_PERIODO',
      `No hay un período contable para el ${fechaVE(fecha)}. Cree el ejercicio en Períodos`,
    )
  }
  if (p.estado !== 'ABIERTO') {
    throw conflicto(
      'PERIODO_CERRADO',
      `${nombrePeriodo(p)} está cerrado: no se pueden registrar ni modificar comprobantes`,
    )
  }
  return aPeriodo(p)
}
