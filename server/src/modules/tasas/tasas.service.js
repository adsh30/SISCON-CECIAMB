import { db } from '../../config/db.js'
import { logger } from '../../config/logger.js'
import { dividir, multiplicar, sumar } from '../../utils/money.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import { consultarBcv, consultarBinance } from './tasas.fuentes.js'
import * as repo from './tasas.repository.js'

export const MINUTOS_REFRESCO = { BCV: 60, BINANCE: 10 }

export function fechaHoyVE(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora)
}

// 'YYYY-MM-DD HH:mm:ss' (UTC) → Date
const fechaUtc = (s) => new Date(s.replace(' ', 'T') + 'Z')

function vencida(fila, minutos) {
  return !fila || Date.now() - fechaUtc(fila.obtenida_en).getTime() > minutos * 60_000
}

/** Brecha porcentual de Binance sobre el BCV: (bin - bcv) / bin × 100 */
export function calcularBrecha(bcv, binance) {
  if (!bcv || !binance) return null
  const diferencia = sumar(binance, `-${bcv}`)
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
 * (BCV cada hora, Binance cada 10 min) o si se fuerza.
 */
export async function obtenerActuales({ forzar = false, usuarioId = null, ctx } = {}) {
  let [usd, eur, usdt] = await leerUltimas()
  const pedir = {
    bcv: forzar || vencida(usd, MINUTOS_REFRESCO.BCV),
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
