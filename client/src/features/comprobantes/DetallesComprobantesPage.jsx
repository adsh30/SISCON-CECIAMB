import { useDeferredValue, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { urlDescargaDetallesExcel, useDetallesComprobantes } from '../../api/comprobantes.js'
import { Button } from '../../components/ui/Button.jsx'
import { buttonClass } from '../../components/ui/buttonClass.js'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ESTADOS } from '../../lib/comprobantes.js'
import { formatoEntero, formatoFecha, formatoMonto } from '../../lib/formato.js'

const CRITERIOS = [
  { id: 'todo', etiqueta: 'Todo' },
  { id: 'documento', etiqueta: 'Documento / N° Doc' },
  { id: 'monto', etiqueta: 'Monto' },
  { id: 'concepto', etiqueta: 'Concepto' },
]

const POR_PAGINA = [25, 50, 100, 200]
const CLAVES = ['criterio', 'busqueda', 'desde', 'hasta', 'estado', 'pagina', 'porPagina']

function useFiltros() {
  const [params, setParams] = useSearchParams()
  const filtros = Object.fromEntries(CLAVES.map((k) => [k, params.get(k) ?? '']))
  if (!filtros.criterio) filtros.criterio = 'todo'
  filtros.pagina = Number(filtros.pagina) || 1
  filtros.porPagina = POR_PAGINA.includes(Number(filtros.porPagina))
    ? Number(filtros.porPagina)
    : 50

  const cambiar = (cambios, { conservarPagina = false } = {}) => {
    const nuevo = { ...filtros, ...cambios }
    if (!conservarPagina) nuevo.pagina = 1
    setParams(
      Object.fromEntries(
        Object.entries(nuevo).filter(
          ([k, v]) =>
            v !== '' &&
            v != null &&
            !(k === 'criterio' && v === 'todo') &&
            !(k === 'pagina' && v === 1) &&
            !(k === 'porPagina' && v === 50),
        ),
      ),
      { replace: true },
    )
  }
  return [filtros, cambiar]
}

export default function DetallesComprobantesPage() {
  const [filtros, cambiar] = useFiltros()
  const [busqueda, setBusqueda] = useState(filtros.busqueda)
  const busquedaDiferida = useDeferredValue(busqueda)

  const consulta = {
    ...filtros,
    busqueda: busquedaDiferida,
  }
  if (busquedaDiferida !== filtros.busqueda) consulta.pagina = 1

  const { data, isPending, isError, error, isFetching } = useDetallesComprobantes(consulta)

  const renglones = data?.datos ?? []
  const meta = data?.meta
  const totales = data?.totales ?? { totalDebe: 0, totalHaber: 0, diferencia: 0 }

  const totalFilas = meta?.total ?? 0
  const desde = meta ? (meta.pagina - 1) * meta.porPagina + (renglones.length ? 1 : 0) : 0
  const hasta = meta ? (meta.pagina - 1) * meta.porPagina + renglones.length : 0

  const hayFiltros =
    filtros.criterio !== 'todo' ||
    Boolean(filtros.busqueda) ||
    Boolean(filtros.desde) ||
    Boolean(filtros.hasta) ||
    Boolean(filtros.estado)

  const limpiarFiltros = () => {
    setBusqueda('')
    cambiar({ criterio: 'todo', busqueda: '', desde: '', hasta: '', estado: '' })
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pizarra">
            <Link to="/app/comprobantes" className="hover:text-marca hover:underline">
              Comprobantes
            </Link>
            <span>/</span>
            <span>Consulta analítica</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Detalles de Comprobantes</h1>
          <p className="mt-1 text-sm text-pizarra">
            Búsqueda detallada de renglones contables por documento, monto, concepto y fecha (estilo Sparrow).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/comprobantes"
            className={buttonClass({ variante: 'secundario', tamano: 'sm' })}
          >
            ← Volver a Comprobantes
          </Link>
          <a
            href={urlDescargaDetallesExcel(consulta)}
            download
            className={buttonClass({ variante: 'secundario', tamano: 'sm' })}
            title="Descargar listado analítico en formato Excel"
          >
            <Icono nombre="descargar" className="size-4 text-emerald-600 dark:text-emerald-400" />
            Exportar Excel
          </a>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="mt-6 rounded-2xl border border-linea bg-superficie p-5 shadow-xs">
        <div className="space-y-4">
          {/* Criterios tipo pestañas o pills */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-pizarra">
              Filtrar búsqueda por:
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CRITERIOS.map((c) => {
                const activo = filtros.criterio === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => cambiar({ criterio: c.id })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activo
                        ? 'bg-marca text-white shadow-xs'
                        : 'bg-superficie-2 text-pizarra hover:bg-superficie-3 hover:text-tinta'
                    }`}
                  >
                    {c.etiqueta}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Campos de filtro */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-pizarra">
                {filtros.criterio === 'documento'
                  ? 'N° de documento / Factura'
                  : filtros.criterio === 'monto'
                    ? 'Monto exacto (ej. 150.00)'
                    : filtros.criterio === 'concepto'
                      ? 'Concepto o detalle'
                      : 'Texto, monto o referencia'}
              </label>
              <div className="relative">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                    cambiar({ busqueda: e.target.value })
                  }}
                  placeholder={
                    filtros.criterio === 'documento'
                      ? 'Ej. 000123, FAI-449...'
                      : filtros.criterio === 'monto'
                        ? 'Ej. 1250.50'
                        : filtros.criterio === 'concepto'
                          ? 'Ej. Pago honorarios, nómina...'
                          : 'Buscar en cualquier campo...'
                  }
                  className={`${claseCampo} pl-9`}
                />
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-pizarra">
                  <Icono nombre="buscar" className="size-4" />
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-pizarra">Desde la fecha</label>
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => cambiar({ desde: e.target.value })}
                className={claseCampo}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-pizarra">Hasta la fecha</label>
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => cambiar({ hasta: e.target.value })}
                className={claseCampo}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-pizarra">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => cambiar({ estado: e.target.value })}
                className={claseCampo}
              >
                <option value="">Todos los estados</option>
                {Object.entries(ESTADOS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2 md:col-span-2">
              {hayFiltros && (
                <Button
                  variante="fantasma"
                  tamano="sm"
                  onClick={limpiarFiltros}
                  className="w-full text-xs text-alerta hover:bg-alerta-claro"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de totales y balance (cuadrado / descuadrado) */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-linea bg-superficie p-3.5 shadow-xs">
          <div>
            <span className="text-xs font-medium text-pizarra">Total Debe</span>
            <div className="cifras text-lg font-bold text-tinta">
              {formatoMonto(totales.totalDebe)}
            </div>
          </div>
          <span className="rounded-lg bg-superficie-2 px-2.5 py-1 text-xs font-medium text-pizarra">
            {formatoEntero(totalFilas)} renglones
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-linea bg-superficie p-3.5 shadow-xs">
          <div>
            <span className="text-xs font-medium text-pizarra">Total Haber</span>
            <div className="cifras text-lg font-bold text-tinta">
              {formatoMonto(totales.totalHaber)}
            </div>
          </div>
          <span className="rounded-lg bg-superficie-2 px-2.5 py-1 text-xs font-medium text-pizarra">
            Bs.
          </span>
        </div>

        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 shadow-xs ${
            totales.diferencia === 0
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
              : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-pizarra">Diferencia (Saldo)</span>
            <div
              className={`cifras text-lg font-bold ${
                totales.diferencia === 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {formatoMonto(totales.diferencia)}
            </div>
          </div>
          {totales.diferencia === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              <Icono nombre="check" className="size-3.5" />
              Cuadrado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              Descuadrado
            </span>
          )}
        </div>
      </div>

      {/* Grilla / Tabla */}
      <div className="mt-4 overflow-hidden rounded-xl border border-linea bg-superficie shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-linea bg-superficie-2/70 text-xs font-semibold uppercase tracking-wider text-pizarra">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Cuenta Contable</th>
                <th className="px-3 py-3">N° Doc</th>
                <th className="px-4 py-3">Detalle / Concepto</th>
                <th className="px-3 py-3 text-right">Debe</th>
                <th className="px-3 py-3 text-right">Haber</th>
                <th className="px-3 py-3">Centro Costo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {isPending ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-pizarra">
                    Cargando renglones contables…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-alerta">
                    Error al cargar los detalles: {error?.message}
                  </td>
                </tr>
              ) : renglones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-pizarra">
                    No se encontraron renglones con los filtros especificados.
                  </td>
                </tr>
              ) : (
                renglones.map((r) => (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-superficie-2/50"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      <Link
                        to={`/app/comprobantes/${r.comprobanteId}`}
                        className="text-marca hover:underline"
                        title={r.conceptoComprobante || 'Ver comprobante'}
                      >
                        {r.comprobanteCodigo || `Comp #${r.comprobanteNumero}`}
                      </Link>
                      <div className="text-[11px] text-pizarra/80">
                        {r.tipo?.nombre ?? 'General'} · Reng. #{r.renglon}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-pizarra">
                      {formatoFecha(r.fecha)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="cifras text-xs font-semibold text-tinta">
                        {r.cuenta?.codigo}
                      </div>
                      <div className="max-w-[200px] truncate text-xs text-pizarra" title={r.cuenta?.nombre}>
                        {r.cuenta?.nombre}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-tinta font-medium">
                      {r.referencia || <span className="text-pizarra/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-tinta">
                      <div className="max-w-[260px] truncate font-medium" title={r.descripcion}>
                        {r.descripcion || r.conceptoComprobante || '—'}
                      </div>
                      {r.descripcion && r.conceptoComprobante && r.descripcion !== r.conceptoComprobante && (
                        <div className="max-w-[260px] truncate text-[11px] text-pizarra" title={r.conceptoComprobante}>
                          Comp: {r.conceptoComprobante}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      <span className={`cifras ${Number(r.debe) > 0 ? 'text-tinta' : 'text-pizarra/40'}`}>
                        {formatoMonto(r.debe)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      <span className={`cifras ${Number(r.haber) > 0 ? 'text-tinta' : 'text-pizarra/40'}`}>
                        {formatoMonto(r.haber)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-pizarra">
                      {r.centroCosto ? (
                        <span title={r.centroCosto.nombre}>
                          {r.centroCosto.codigo}
                        </span>
                      ) : (
                        <span className="text-pizarra/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {ESTADOS[r.estado] ? (
                        <Insignia tono={ESTADOS[r.estado].tono}>
                          {ESTADOS[r.estado].nombre}
                        </Insignia>
                      ) : (
                        r.estado
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y selector de cantidad */}
        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-4 py-3 text-sm text-pizarra">
            <span className="cifras">
              {formatoEntero(desde)}–{formatoEntero(hasta)} de {formatoEntero(meta.total)} renglones
              {isFetching && <span className="ml-2 text-xs text-marca">Actualizando…</span>}
            </span>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs">
                Por página:
                <select
                  value={filtros.porPagina}
                  onChange={(e) => cambiar({ porPagina: Number(e.target.value) })}
                  className={`${claseCampo} w-auto py-1 text-xs`}
                >
                  {POR_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                variante="secundario"
                tamano="sm"
                disabled={meta.pagina <= 1}
                onClick={() => cambiar({ pagina: meta.pagina - 1 }, { conservarPagina: true })}
              >
                ← Anterior
              </Button>
              <span className="cifras text-xs">
                {meta.pagina} / {Math.max(1, Math.ceil(meta.total / meta.porPagina))}
              </span>
              <Button
                variante="secundario"
                tamano="sm"
                disabled={meta.pagina >= Math.ceil(meta.total / meta.porPagina)}
                onClick={() => cambiar({ pagina: meta.pagina + 1 }, { conservarPagina: true })}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
