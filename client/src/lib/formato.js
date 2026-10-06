// Formatos venezolanos: 1.234.567,89 y dd/mm/aaaa

const montoFmt = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea un monto (string decimal o número) como 1.234.567,89 */
export function formatoMonto(valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  return montoFmt.format(Number(valor))
}

export function formatoPorcentaje(valor) {
  return `${montoFmt.format(Number(valor))} %`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'YYYY-MM-DD' → '05-oct.' */
export function formatoFechaCorta(iso) {
  if (!iso) return ''
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${MESES[Number(m) - 1]}.`
}

/** 'YYYY-MM-DD HH:mm:ss' en UTC → hora local '2:35 p. m.' */
export function formatoHora(utc) {
  if (!utc) return ''
  return new Date(utc.replace(' ', 'T') + 'Z').toLocaleTimeString('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const horaCaracasFmt = new Intl.DateTimeFormat('es-VE', {
  timeZone: 'America/Caracas',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Date o ISO → hora de Caracas en 12 h: '12:26 p. m.' */
export function formatoHoraCaracas(fecha) {
  if (!fecha) return ''
  return horaCaracasFmt.format(new Date(fecha))
}

/** '17:00' → '5:00 p. m.' (hora fija de Caracas) */
export function formatoHora12(hhmm) {
  const [h, m = '00'] = hhmm.split(':')
  const hora = Number(h)
  return `${hora % 12 || 12}:${m.padStart(2, '0')} ${hora < 12 ? 'a. m.' : 'p. m.'}`
}

/** 'YYYY-MM-DD' → 'dd/mm/aaaa' */
export function formatoFecha(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** 'YYYY-MM-DD HH:mm:ss' en UTC → '05/10/2026 2:35 p. m.' en hora local */
export function formatoFechaHora(utc) {
  if (!utc) return ''
  const d = new Date(utc.replace(' ', 'T') + 'Z')
  return `${d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })}`
}

export const nombreCompleto = (u) => [u?.nombre, u?.apellido].filter(Boolean).join(' ')

const relativoFmt = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** 'YYYY-MM-DD HH:mm:ss' en UTC → 'hace 5 minutos', 'ayer'… */
export function formatoRelativo(utc, ahora = Date.now()) {
  if (!utc) return ''
  const seg = Math.round((new Date(utc.replace(' ', 'T') + 'Z').getTime() - ahora) / 1000)
  const abs = Math.abs(seg)
  if (abs < 45) return 'hace un momento'
  if (abs < 3600) return relativoFmt.format(Math.round(seg / 60), 'minute')
  if (abs < 86_400) return relativoFmt.format(Math.round(seg / 3600), 'hour')
  return relativoFmt.format(Math.round(seg / 86_400), 'day')
}

const enteroFmt = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 })
export const formatoEntero = (n) => enteroFmt.format(Number(n) || 0)

const fechaHoraCaracasFmt = new Intl.DateTimeFormat('es-VE', {
  timeZone: 'America/Caracas',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

/** 'YYYY-MM-DD HH:mm:ss' en UTC → '06/10/2026, 12:33:50 p. m.' en hora de Caracas */
export function formatoFechaHoraCaracas(utc) {
  if (!utc) return ''
  return fechaHoraCaracasFmt.format(new Date(utc.replace(' ', 'T') + 'Z'))
}
