// Cálculo de períodos mensuales con fechas 'YYYY-MM-DD' (sin zonas horarias)

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const dos = (n) => String(n).padStart(2, '0')
const ultimoDia = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()

/** Los 12 períodos de un ejercicio que empieza en `mesInicio` de `anio` */
export function generarPeriodos(anio, mesInicio = 1) {
  return Array.from({ length: 12 }, (_, i) => {
    const indice = mesInicio - 1 + i
    const a = anio + Math.floor(indice / 12)
    const m = (indice % 12) + 1
    return {
      numero: i + 1,
      anio: a,
      mes: m,
      fecha_inicio: `${a}-${dos(m)}-01`,
      fecha_fin: `${a}-${dos(m)}-${dos(ultimoDia(a, m))}`,
    }
  })
}

/** 'YYYY-MM-DD' ± días */
export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export const nombrePeriodo = (p) => `${MESES[p.mes - 1]} ${p.anio}`

/** 'YYYY-MM-DD' → 'dd/mm/aaaa' para mensajes */
export const fechaVE = (f) => f.split('-').reverse().join('/')
