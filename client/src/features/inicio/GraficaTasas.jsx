import { useMemo } from 'react'
import { useHistorialTasas } from '../../api/dashboard.js'
import { GraficaLineas } from '../../components/ui/Graficas.jsx'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'
import { AGRUPACIONES, agrupar } from '../../lib/series.js'
import { FiltroRango } from './FiltroRango.jsx'
import { useRango } from './useRango.js'
import { Tarjeta } from './Tarjeta.jsx'

const SERIES_TASAS = [
  { clave: 'usd', etiqueta: '$ BCV', color: 'var(--color-marca)' },
  { clave: 'eur', etiqueta: '€ BCV', color: 'var(--color-exito)' },
  { clave: 'usdt', etiqueta: 'USDT Binance', color: 'var(--color-acento)' },
]

export function GraficaTasas({ serie, setSerie }) {
  const filtro = useRango('30d', 'day')
  const { data, isFetching, isError } = useHistorialTasas(filtro.rango)
  const actual = SERIES_TASAS.find((s) => s.clave === serie) ?? SERIES_TASAS[0]

  const datos = useMemo(
    () =>
      agrupar(
        (data?.[actual.clave] ?? []).map((f) => ({ fecha: f.fecha, valor: f.tasa })),
        filtro.agrupacion,
      ).map((p) => ({
        ...p,
        detalle: `${formatoFecha(p.hasta)}: Bs ${formatoMonto(p.valor)}`,
      })),
    [data, actual.clave, filtro.agrupacion],
  )

  const primero = datos[0]?.valor
  const ultimo = datos.at(-1)?.valor
  const cambio = primero && ultimo ? ((ultimo - primero) / primero) * 100 : null
  const plural = AGRUPACIONES.find((a) => a.valor === filtro.agrupacion)?.plural

  return (
    <Tarjeta
      titulo="Evolución de la tasa"
      extra={isFetching ? 'cargando…' : `${datos.length} ${plural}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg border border-linea bg-papel p-0.5"
          role="group"
          aria-label="Moneda"
        >
          {SERIES_TASAS.map((s) => (
            <button
              key={s.clave}
              type="button"
              onClick={() => setSerie(s.clave)}
              aria-pressed={serie === s.clave}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                serie === s.clave ? 'bg-superficie shadow-sm' : 'text-pizarra hover:text-tinta'
              }`}
              style={serie === s.clave ? { color: s.color } : undefined}
            >
              {s.etiqueta}
            </button>
          ))}
        </div>
        {cambio != null && (
          <span className="cifras text-xs text-pizarra">
            En el período:{' '}
            <strong className={cambio > 0 ? 'text-alerta' : cambio < 0 ? 'text-exito' : ''}>
              {cambio > 0 ? '↑' : cambio < 0 ? '↓' : ''}
              {formatoMonto(Math.abs(cambio))} %
            </strong>
          </span>
        )}
      </div>
      <FiltroRango {...filtro} />
      <div className="mt-3">
        {isError ? (
          <p className="py-10 text-center text-sm text-alerta">No se pudo cargar el historial.</p>
        ) : (
          <GraficaLineas
            datos={datos}
            color={actual.color}
            formato={formatoMonto}
            vacio={
              actual.clave === 'usdt'
                ? 'Binance no publica historial: la serie se arma con las consultas del sistema.'
                : undefined
            }
          />
        )}
      </div>
    </Tarjeta>
  )
}
