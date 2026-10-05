// Copia de server/src/utils/money.js: mantener ambas iguales.
// Aritmética decimal exacta para montos y tasas (nunca float).
// Los valores viajan como string ('12450.00', '871.3689') y se operan con BigInt.

const ESCALA = 8n // decimales internos
const FACTOR = 10n ** ESCALA

/** '871.3689' → 87136890000n (escalado a 8 decimales) */
export function aEscalado(valor) {
  const s = String(valor).trim()
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Número inválido: ${valor}`)
  const negativo = s.startsWith('-')
  const [ent, dec = ''] = s.replace('-', '').split('.')
  const decimales = (dec + '0'.repeat(Number(ESCALA))).slice(0, Number(ESCALA))
  const n = BigInt(ent) * FACTOR + BigInt(decimales)
  return negativo ? -n : n
}

/** Redondeo half-up de un escalado a `decimales` y vuelta a string. */
export function deEscalado(n, decimales = 2) {
  const quitar = 10n ** (ESCALA - BigInt(decimales))
  const negativo = n < 0n
  let abs = negativo ? -n : n
  abs = (abs + quitar / 2n) / quitar
  const base = 10n ** BigInt(decimales)
  const ent = abs / base
  const dec = (abs % base).toString().padStart(decimales, '0')
  const s = decimales > 0 ? `${ent}.${dec}` : `${ent}`
  return negativo && abs !== 0n ? `-${s}` : s
}

export function multiplicar(a, b, decimales = 2) {
  return deEscalado((aEscalado(a) * aEscalado(b)) / FACTOR, decimales)
}

export function dividir(a, b, decimales = 2) {
  const divisor = aEscalado(b)
  if (divisor === 0n) throw new Error('División entre cero')
  return deEscalado((aEscalado(a) * FACTOR) / divisor, decimales)
}

export function redondear(valor, decimales = 2) {
  return deEscalado(aEscalado(valor), decimales)
}

export function sumar(...valores) {
  return deEscalado(
    valores.reduce((acc, v) => acc + aEscalado(v), 0n),
    2,
  )
}
