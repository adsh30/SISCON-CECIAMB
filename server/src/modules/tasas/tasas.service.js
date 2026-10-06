import { db } from '../../config/db.js'
import { env } from '../../config/env.js'
import { logger } from '../../config/logger.js'
import { dividir, multiplicar, restar } from '../../utils/money.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import { consultarBcv, consultarBinance, consultarHistorialBcv } from './tasas.fuentes.js'
import * as repo from './tasas.repository.js'

export const MINUTOS_REFRESCO = { BINANCE: 10 }

// Venezuela usa UTC−4 todo el año (sin horario de verano)
const DESFASE_CARACAS_MS = 4 * 60 * 60_000
const DIA_MS = 24 * 60 * 60_000

/** Instantes (UTC) de las actualizaciones programadas de ayer, hoy y mañana en Caracas */
function horariosCercanos(ahora, horas) {
  const caracas = new Date(ahora.getTime() - DESFASE_CARACAS_MS)
  const medianoche =
    Date.UTC(caracas.getUTCFullYear(), caracas.getUTCMonth(), caracas.getUTCDate()) +
    DESFASE_CARACAS_MS
  const minutos = horas.map((h) => {
    const [hh, mm = '0'] = h.split(':')
    return Number(hh) * 60 + Number(mm)
  })
  return [-1, 0, 1]
    .flatMap((dia) => minutos.map((m) => medianoche + dia * DIA_MS + m * 60_000))
    .sort((a, b) => a - b)
}

/** Última actualización programada del BCV que ya debió ocurrir */
export function ultimoHorarioBcv(ahora = new Date(), horas = env.tasas.horasBcv) {
  return new Date(horariosCercanos(ahora, horas).findLast((t) => t <= ahora.getTime()))
}

/** Próxima actualización programada del BCV */
export function proximoHorarioBcv(ahora = new Date(), horas = env.tasas.horasBcv) {
  return new Date(horariosCercanos(ahora, horas).find((t) => t > ahora.getTime()))
}

export function fechaHoyVE(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora)
}

// 'YYYY-MM-DD HH:mm:ss' (UTC) → Date
const fechaUtc = (s) => new Date(s.replace(' ', 'T') + 'Z')

function vencida(fila, minutos) {
  return !fila || Date.now() - fechaUtc(fila.obtenida_en).getTime() > minutos * 60_000
}

// El BCV se da por vencido si no se consultó desde la última hora programada
const bcvVencida = (fila) =>
  !fila || fechaUtc(fila.obtenida_en).getTime() < ultimoHorarioBcv().getTime()

/** Brecha porcentual de Binance sobre el BCV: (bin - bcv) / bin × 100 */
export function calcularBrecha(bcv, binance) {
  if (!bcv || !binance) return null
  const diferencia = restar(binance, bcv, 4)
  return multiplicar(dividir(diferencia, binance, 8), '100', 2)
}

async function refrescarBcv(usuarioId) {
  const r = await consultarBcv()
  const fecha = r.fecha ?? fechaHoyVE()
  await db.transaction(async (trx) => {
    await repo.guardar(
      { fecha, moneda: 'USD', fuente: 'BCV', tasa: r.usd, registrado_por: usuarioId },
      trx,
    )
    if (r.eur) {
      await repo.guardar(
        { fecha, moneda: 'EUR', fuente: 'BCV', tasa: r.eur, registrado_por: usuarioId },
        trx,
      )
    }
  })
  return r
}

async function refrescarBinance(usuarioId) {
  const r = await consultarBinance()
  await repo.guardar({
    fecha: fechaHoyVE(),
    moneda: 'USDT',
    fuente: 'BINANCE',
    tasa: r.usdt,
    compra: r.compra,
    venta: r.venta,
    registrado_por: usuarioId,
  })
  return r
}

// Evita consultas duplicadas a las fuentes cuando llegan varias peticiones a la vez
let refrescoEnCurso = null

async function refrescar({ bcv, binance, usuarioId }) {
  const avisos = []
  const tareas = []
  if (bcv) {
    tareas.push(
      refrescarBcv(usuarioId).catch((err) => {
        logger.warn({ err }, 'tasas: no se pudo consultar el BCV')
        avisos.push('No se pudo consultar la tasa del BCV; se muestra la última guardada')
      }),
    )
  }
  if (binance) {
    tareas.push(
      refrescarBinance(usuarioId).catch((err) => {
        logger.warn({ err }, 'tasas: no se pudo consultar Binance')
        avisos.push('No se pudo consultar Binance; se muestra la última referencia guardada')
      }),
    )
  }
  await Promise.all(tareas)
  return avisos
}

function formatear(usd, eur, usdt, avisos) {
  return {
    bcv: usd
      ? { usd: usd.tasa, eur: eur?.tasa ?? null, fecha: usd.fecha, obtenidaEn: usd.obtenida_en }
      : null,
    actualizacionBcv: {
      horas: env.tasas.horasBcv,
      proxima: proximoHorarioBcv().toISOString(),
    },
    binance: usdt
      ? {
          usdt: usdt.tasa,
          compra: usdt.compra,
          venta: usdt.venta,
          fecha: usdt.fecha,
          obtenidaEn: usdt.obtenida_en,
        }
      : null,
    brecha: calcularBrecha(usd?.tasa, usdt?.tasa),
    avisos,
  }
}

const leerUltimas = () =>
  Promise.all([
    repo.ultima('USD', 'BCV'),
    repo.ultima('EUR', 'BCV'),
    repo.ultima('USDT', 'BINANCE'),
  ])

/**
 * Devuelve las tasas vigentes. Consulta las fuentes solo si lo guardado está vencido
 * (BCV en sus horas programadas, Binance cada 10 min) o si se fuerza.
 */
export async function obtenerActuales({ forzar = false, usuarioId = null, ctx } = {}) {
  let [usd, eur, usdt] = await leerUltimas()
  const pedir = {
    bcv: forzar || bcvVencida(usd),
    binance: forzar || vencida(usdt, MINUTOS_REFRESCO.BINANCE),
    usuarioId,
  }

  let avisos = []
  if (pedir.bcv || pedir.binance) {
    refrescoEnCurso ??= refrescar(pedir).finally(() => {
      refrescoEnCurso = null
    })
    avisos = await refrescoEnCurso
    ;[usd, eur, usdt] = await leerUltimas()
  }

  if (forzar) {
    await registrar(null, {
      usuarioId,
      accion: ACCIONES.ACTUALIZAR,
      entidad: 'tasas_cambio',
      despues: { bcvUsd: usd?.tasa, bcvEur: eur?.tasa, binanceUsdt: usdt?.tasa, avisos },
      ctx,
    })
  }

  return formatear(usd, eur, usdt, avisos)
}

/**
 * Completa el historial con las tasas oficiales del BCV publicadas desde 2023.
 * No pisa lo ya guardado. Devuelve cuántas filas nuevas se agregaron.
 */
export async function importarHistorialBcv() {
  const filas = await consultarHistorialBcv()
  return repo.importar(
    filas.map((f) => ({
      ...f,
      fuente: 'BCV',
      // Medianoche de Caracas en UTC: cuenta como consultada antes de cualquier hora programada
      obtenida_en: `${f.fecha} 04:00:00`,
    })),
  )
}

/** Variación porcentual entre dos tasas: (actual − anterior) ÷ anterior × 100 */
export function calcularVariacion(actual, anterior) {
  if (!actual || !anterior) return null
  return multiplicar(dividir(restar(actual, anterior, 4), anterior, 8), '100', 2)
}

const SERIES = { usd: ['USD', 'BCV'], eur: ['EUR', 'BCV'], usdt: ['USDT', 'BINANCE'] }

/** Una tasa por día para el gráfico de evolución. */
export async function historial({ desde, hasta }) {
  const entradas = await Promise.all(
    Object.entries(SERIES).map(async ([clave, [moneda, fuente]]) => [
      clave,
      await repo.serie(moneda, fuente, desde, hasta),
    ]),
  )
  return Object.fromEntries(entradas)
}

/** Tasas actuales con su variación respecto al día anterior publicado. */
export async function resumen() {
  const actuales = await obtenerActuales()
  const variacion = async (tasa, moneda, fuente) => {
    if (!tasa) return null
    const previa = await repo.anterior(moneda, fuente, tasa.fecha)
    return previa
      ? {
          anterior: previa.tasa,
          fecha: previa.fecha,
          porcentaje: calcularVariacion(tasa.actual, previa.tasa),
        }
      : null
  }
  const [usd, eur, usdt] = await Promise.all([
    variacion(
      actuales.bcv && { actual: actuales.bcv.usd, fecha: actuales.bcv.fecha },
      'USD',
      'BCV',
    ),
    variacion(
      actuales.bcv?.eur && { actual: actuales.bcv.eur, fecha: actuales.bcv.fecha },
      'EUR',
      'BCV',
    ),
    variacion(
      actuales.binance && { actual: actuales.binance.usdt, fecha: actuales.binance.fecha },
      'USDT',
      'BINANCE',
    ),
  ])
  return { ...actuales, variacion: { usd, eur, usdt } }
}

let temporizador = null

/**
 * Actualiza la tasa del BCV dos veces al día (env.tasas.horasBcv, hora de Caracas)
 * aunque nadie tenga el sistema abierto. Al arrancar recupera la que se haya perdido.
 */
export function programarActualizacionBcv() {
  const ejecutar = async () => {
    try {
      const [usd] = await leerUltimas()
      if (bcvVencida(usd)) {
        refrescoEnCurso ??= refrescar({ bcv: true, binance: false, usuarioId: null }).finally(
          () => {
            refrescoEnCurso = null
          },
        )
        const avisos = await refrescoEnCurso
        logger.info({ avisos }, 'tasas: actualización programada del BCV')
      }
    } catch (err) {
      logger.warn({ err }, 'tasas: falló la actualización programada del BCV')
    }
    temporizador = setTimeout(ejecutar, proximoHorarioBcv().getTime() - Date.now())
    temporizador.unref()
  }
  ejecutar()
  importarHistorialBcv()
    .then((n) => n && logger.info(`tasas: ${n} tasas históricas del BCV importadas`))
    .catch((err) => logger.warn({ err }, 'tasas: no se pudo importar el historial del BCV'))
  return () => clearTimeout(temporizador)
}
