import { useMemo } from 'react'
import { useActividadPorDia } from '../../api/dashboard.js'
import { GraficaBarras } from '../../components/ui/Graficas.jsx'
import { formatoEntero, formatoFecha } from '../../lib/formato.js'
import { AGRUPACIONES, agrupar, completarDias } from '../../lib/series.js'
import { FiltroRango } from './FiltroRango.jsx'
import { useRango } from './useRango.js'
import { Tarjeta } from './Tarjeta.jsx'

export function GraficaActividad() {
  const filtro = useRango('30d', 'day')
  const { data, isFetching, isError } = useActividadPorDia(filtro.rango)

  const datos = useMemo(() => {
    const dias = completarDias(
      (data ?? []).map((d) => ({ fecha: d.fecha, valor: d.total })),
      filtro.rango.desde,
      filtro.rango.hasta,
    )
    return agrupar(dias, filtro.agrupacion, 'suma').map((p) => {
      const cuando =
        filtro.agrupacion === 'day' ? formatoFecha(p.fecha) : `Desde ${formatoFecha(p.fecha)}`
      return { ...p, detalle: `${cuando}: ${formatoEntero(p.valor)} eventos` }
    })
  }, [data, filtro.rango, filtro.agrupacion])

  const total = datos.reduce((s, d) => s + d.valor, 0)
  const plural = AGRUPACIONES.find((a) => a.valor === filtro.agrupacion)?.plural

  return (
    <Tarjeta
      titulo="Actividad en el sistema"
      extra={
        isFetching ? 'cargando…' : `${formatoEntero(total)} eventos en ${datos.length} ${plural}`
      }
    >
      <p className="ayuda mb-3 text-xs text-pizarra">
        Ingresos, cambios y demás acciones registradas en la bitácora.
      </p>
      <FiltroRango {...filtro} />
      <div className="mt-3">
        {isError ? (
          <p className="py-10 text-center text-sm text-alerta">No se pudo cargar la actividad.</p>
        ) : (
          <GraficaBarras
            datos={datos}
            formato={formatoEntero}
            vacio="Sin actividad en el período."
          />
        )}
      </div>
    </Tarjeta>
  )
}
