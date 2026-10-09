// Estados, montos y totales de los comprobantes (mismas reglas que el servidor)
import { aEscalado, restar, sumar } from './money.js'

export const ESTADOS = {
  BORRADOR: { nombre: 'Borrador', plural: 'Borradores', tono: 'aviso' },
  APROBADO: { nombre: 'Aprobado', plural: 'Aprobados', tono: 'exito' },
  ANULADO: { nombre: 'Anulado', plural: 'Anulados', tono: 'alerta' },
}

/** Número para mostrar: el correlativo o, si aún no lo tiene, el borrador */
export const numeroComprobante = (c) => c.codigo ?? `Borrador #${c.id}`

/**
 * Convierte lo que escribe el usuario a '1234.56'.
 * Acepta 1.234,56 · 1234,56 · 1234.56 (punto del teclado numérico) · 1234.
 * Devuelve '' si está vacío y null si no es un monto válido.
 */
export function parsearMonto(texto) {
  let s = String(texto ?? '')
    .replace(/bs\.?|\s/gi, '')
    .trim()
  if (!s) return ''
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d{1,16}(\.\d{0,2})?$/.test(s)) return null
  const [ent, dec = ''] = s.split('.')
  return `${BigInt(ent)}.${dec.padEnd(2, '0')}`
}

/** '1234.50' → '1234,50' para editar sin separadores de miles */
export const montoEditable = (m) => (m ? m.replace('.', ',') : '')

export const esCero = (m) => !m || aEscalado(m) === 0n

export function totalesRenglones(renglones) {
  const debe = sumar('0', ...renglones.map((r) => r.debe || '0'))
  const haber = sumar('0', ...renglones.map((r) => r.haber || '0'))
  const diferencia = restar(debe, haber)
  return { debe, haber, diferencia, cuadrado: diferencia === '0.00' && debe !== '0.00' }
}

/** Monto del comprobante para listados: el mayor total (en un borrador descuadrado difieren) */
export const montoComprobante = (c) =>
  aEscalado(c.totalDebe) >= aEscalado(c.totalHaber) ? c.totalDebe : c.totalHaber
