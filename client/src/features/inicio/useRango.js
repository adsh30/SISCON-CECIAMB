import { useState } from 'react'
import { rangoDePreset } from '../../lib/series.js'

/** Estado del filtro de período de una gráfica (como en el tablero de MGG) */
export function useRango(presetInicial = '30d', agrupacionInicial = 'day') {
  const [preset, setPresetEstado] = useState(presetInicial)
  const [agrupacion, setAgrupacion] = useState(agrupacionInicial)
  const [rango, setRango] = useState(() => rangoDePreset(presetInicial))

  const setPreset = (p) => {
    setPresetEstado(p)
    if (p !== 'custom') {
      setRango(rangoDePreset(p))
      // Para 12 meses, por día serían 365 puntos: se sugiere agrupar por mes
      setAgrupacion(p === '12m' ? 'month' : p === '90d' ? 'week' : 'day')
    }
  }
  return { preset, setPreset, agrupacion, setAgrupacion, rango, setRango }
}
