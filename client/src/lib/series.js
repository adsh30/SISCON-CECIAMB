// Series de tiempo para los gráficos del inicio. Las fechas son 'YYYY-MM-DD' (día de Caracas)
// y se operan como UTC para no depender de la zona horaria del navegador.

const DIA_MS = 86_400_000
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const aFecha = (iso) => new Date(`${iso}T00:00:00Z`)
const aIso = (d) => d.toISOString().slice(0, 10)

export const hoyCaracas = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date())

export const PRESETS = [
  { valor: '7d', etiqueta: '7 días', dias: 7 },
  { valor: '30d', etiqueta: '30 días', dias: 30 },
  { valor: '90d', etiqueta: '90 días', dias: 90 },
  { valor: '12m', etiqueta: '12 meses', dias: 365 },
  { valor: 'custom', etiqueta: 'Rango' },
]

export const AGRUPACIONES = [
  { valor: 'day', etiqueta: 'Por día', plural: 'días' },
  { valor: 'week', etiqueta: 'Por semana', plural: 'semanas' },
  { valor: 'month', etiqueta: 'Por mes', plural: 'meses' },
]

/** Rango { desde, hasta } que termina hoy (Caracas) */
export function rangoDePreset(preset) {
  const hasta = hoyCaracas()
  const dias = PRESETS.find((p) => p.valor === preset)?.dias ?? 30
  return { desde: aIso(new Date(aFecha(hasta).getTime() - (dias - 1) * DIA_MS)), hasta }
}

function inicioDe(iso, agrupacion) {
  const d = aFecha(iso)
  if (agrupacion === 'week') return aIso(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DIA_MS))
  if (agrupacion === 'month') return `${iso.slice(0, 7)}-01`
  return iso
}

function etiquetaDe(iso, agrupacion) {
  const [a, m, d] = iso.split('-')
  if (agrupacion === 'month') return `${MESES[Number(m) - 1]} ${a.slice(2)}`
  return `${d}/${m}`
}

/**
 * Agrupa puntos { fecha, valor } por día, semana (lunes) o mes.
 * modo 'ultimo' toma el último valor del período (tasas); 'suma' los acumula (eventos).
 */
export function agrupar(puntos, agrupacion, modo = 'ultimo') {
  const grupos = new Map()
  for (const p of [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const clave = inicioDe(p.fecha, agrupacion)
    const valor = Number(p.valor)
    const previo = grupos.get(clave)
    grupos.set(clave, {
      fecha: clave,
      hasta: p.fecha,
      etiqueta: etiquetaDe(clave, agrupacion),
      valor: modo === 'suma' ? (previo?.valor ?? 0) + valor : valor,
    })
  }
  return [...grupos.values()]
}

/** Días del rango sin eventos se completan con 0 (para que las barras no salten fechas) */
export function completarDias(puntos, desde, hasta) {
  const por = new Map(puntos.map((p) => [p.fecha, p]))
  const salida = []
  for (let t = aFecha(desde).getTime(); t <= aFecha(hasta).getTime(); t += DIA_MS) {
    const fecha = aIso(new Date(t))
    salida.push(por.get(fecha) ?? { fecha, valor: 0 })
  }
  return salida
}
