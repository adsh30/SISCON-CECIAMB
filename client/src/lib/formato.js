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

/** 'YYYY-MM-DD' → 'dd/mm/aaaa' */
export function formatoFecha(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
