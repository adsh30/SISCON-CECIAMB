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

/** 'YYYY-MM-DD' → 'dd/mm/aaaa' */
export function formatoFecha(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
