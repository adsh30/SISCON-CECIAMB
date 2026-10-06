import { AGRUPACIONES, PRESETS } from '../../lib/series.js'

const campo =
  'rounded-lg border border-linea bg-superficie px-2.5 py-1.5 text-sm focus:border-marca focus:ring-3 focus:ring-marca/15 focus:outline-none'

export function FiltroRango({ preset, setPreset, agrupacion, setAgrupacion, rango, setRango }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex flex-wrap rounded-lg border border-linea bg-papel p-0.5"
        role="group"
      >
        {PRESETS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => setPreset(p.valor)}
            aria-pressed={preset === p.valor}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              preset === p.valor
                ? 'bg-superficie text-marca shadow-sm'
                : 'text-pizarra hover:text-tinta'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>
      <select
        value={agrupacion}
        onChange={(e) => setAgrupacion(e.target.value)}
        className={campo}
        aria-label="Agrupar"
      >
        {AGRUPACIONES.map((a) => (
          <option key={a.valor} value={a.valor}>
            {a.etiqueta}
          </option>
        ))}
      </select>
      {preset === 'custom' && (
        <>
          <input
            type="date"
            aria-label="Desde"
            value={rango.desde}
            max={rango.hasta}
            onChange={(e) => e.target.value && setRango((r) => ({ ...r, desde: e.target.value }))}
            className={campo}
          />
          <input
            type="date"
            aria-label="Hasta"
            value={rango.hasta}
            min={rango.desde}
            onChange={(e) => e.target.value && setRango((r) => ({ ...r, hasta: e.target.value }))}
            className={campo}
          />
        </>
      )}
    </div>
  )
}
