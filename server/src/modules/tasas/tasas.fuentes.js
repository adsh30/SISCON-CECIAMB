// Consulta de tasas en fuentes externas: BCV (vía ve.dolarapi.com) y Binance P2P.
import { env } from '../../config/env.js'
import { redondear } from '../../utils/money.js'

const TIMEOUT_MS = 10_000
export const MIN_OFERTAS = 3

async function fetchJson(url, opciones = {}) {
  const res = await fetch(url, {
    ...opciones,
    headers: { accept: 'application/json', ...opciones.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).host}`)
  return res.json()
}

function positivo(valor) {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Los precios llegan como número JSON; se pasan a string con 4 decimales exactos. */
const aTasa = (n) => redondear(String(n), 4)

function fechaDe(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null
}

/** Tasa oficial del BCV: { usd, eur, fecha } (eur puede ser null). */
export async function consultarBcv() {
  const [usd, eur] = await Promise.all([
    fetchJson(env.tasas.bcvUsdUrl),
    fetchJson(env.tasas.bcvEurUrl).catch(() => null),
  ])
  const usdValor = positivo(usd?.promedio ?? usd?.price)
  if (!usdValor) throw new Error('La fuente del BCV no devolvió la tasa del dólar')
  const eurValor = positivo(eur?.promedio ?? eur?.price)
  return {
    usd: aTasa(usdValor),
    eur: eurValor ? aTasa(eurValor) : null,
    fecha: fechaDe(usd.fechaActualizacion),
  }
}

export function mediana(numeros) {
  const xs = numeros.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  if (xs.length < MIN_OFERTAS) return null
  const mitad = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[mitad] : (xs[mitad - 1] + xs[mitad]) / 2
}

async function ofertasP2p(tradeType) {
  const data = await fetchJson(env.tasas.binanceP2pUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      asset: 'USDT',
      fiat: 'VES',
      tradeType,
      page: 1,
      rows: 10,
      payTypes: [],
      countries: [],
      proMerchantAds: false,
      publisherType: null,
    }),
  })
  return (data?.data ?? []).map((d) => Number(d?.adv?.price))
}

/** Referencia USDT/VES de Binance P2P: mediana de compra y venta y su promedio. */
export async function consultarBinance() {
  const [compras, ventas] = await Promise.all([
    ofertasP2p('BUY').catch(() => []),
    ofertasP2p('SELL').catch(() => []),
  ])
  const compra = mediana(compras)
  const venta = mediana(ventas)
  if (compra == null && venta == null) {
    throw new Error(`Binance P2P no devolvió al menos ${MIN_OFERTAS} ofertas`)
  }
  const promedio = compra != null && venta != null ? (compra + venta) / 2 : (compra ?? venta)
  return {
    usdt: aTasa(promedio),
    compra: compra != null ? aTasa(compra) : null,
    venta: venta != null ? aTasa(venta) : null,
  }
}

/** Historial oficial del BCV desde 2023: [{ fecha, moneda: 'USD'|'EUR', tasa }] */
export async function consultarHistorialBcv() {
  const [usd, eur] = await Promise.all([
    fetchJson(env.tasas.bcvUsdHistorialUrl),
    fetchJson(env.tasas.bcvEurHistorialUrl).catch(() => []),
  ])
  const filas = (lista, moneda) =>
    (Array.isArray(lista) ? lista : []).flatMap((d) => {
      const valor = positivo(d?.promedio)
      const fecha = fechaDe(d?.fecha)
      return valor && fecha ? [{ fecha, moneda, tasa: aTasa(valor) }] : []
    })
  return [...filas(usd, 'USD'), ...filas(eur, 'EUR')]
}
