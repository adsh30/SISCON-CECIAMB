import { useDeferredValue, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useComprobantes, useTiposComprobante } from '../../api/comprobantes.js'
import { AccountPicker } from '../../components/ui/AccountPicker.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { buttonClass } from '../../components/ui/buttonClass.js'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ESTADOS, montoComprobante, numeroComprobante } from '../../lib/comprobantes.js'
import { formatoEntero, formatoFecha, formatoMonto } from '../../lib/formato.js'
import { TiposModal } from './TiposModal.jsx'

const POR_PAGINA = [10, 25, 50, 100]
const CLAVES = ['tipoId', 'estado', 'desde', 'hasta', 'buscar', 'cuentaId', 'pagina', 'porPagina']

/** Filtros guardados en la dirección: se conservan al recargar y al volver de un comprobante */
function useFiltros() {
  const [params, setParams] = useSearchParams()
  const filtros = Object.fromEntries(CLAVES.map((k) => [k, params.get(k) ?? '']))
  filtros.pagina = Number(filtros.pagina) || 1
  filtros.porPagina = POR_PAGINA.includes(Number(filtros.porPagina))
    ? Number(filtros.porPagina)
    : 25

  const cambiar = (cambios, { conservarPagina = false } = {}) => {
    const nuevo = { ...filtros, ...cambios }
    if (!conservarPagina) nuevo.pagina = 1
    setParams(
      Object.fromEntries(
        Object.entries(nuevo).filter(
          ([k, v]) =>
            v !== '' &&
            v != null &&
            !(k === 'pagina' && v === 1) &&
            !(k === 'porPagina' && v === 25),
        ),
      ),
      { replace: true },
    )
  }
  return [filtros, cambiar]
}

function Pestana({ activa, onClick, children, cantidad }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
        activa ? 'border-marca text-marca' : 'border-transparent text-pizarra hover:text-tinta'
      }`}
    >
      {children}
      <span className="cifras rounded-full bg-superficie-2 px-2 py-0.5 text-xs text-pizarra">
        {formatoEntero(cantidad ?? 0)}
      </span>
    </button>
  )
}

export default function ComprobantesPage() {
  const [filtros, cambiar] = useFiltros()
  const [buscar, setBuscar] = useState(filtros.buscar)
  const buscarDiferido = useDeferredValue(buscar)
  const consulta = { ...filtros, buscar: buscarDiferido }
  if (buscarDiferido !== filtros.buscar) consulta.pagina = 1

  const { can } = usePermisos()
  const navigate = useNavigate()
  const { data, isPending, isError, error, isFetching } = useComprobantes(consulta)
  const { data: tipos = [] } = useTiposComprobante()
  const [verTipos, setVerTipos] = useState(false)
  const [cuentaFiltro, setCuentaFiltro] = useState(null)

  const comprobantes = data?.data ?? []
  const meta = data?.meta
  const porTipo = meta?.porTipo ?? {}
  const totalTodos = Object.values(porTipo).reduce((a, n) => a + n, 0)
  // Pestañas: los tipos activos y los inactivos que aún tienen comprobantes
  const pestanas = tipos.filter((t) => t.activo || porTipo[t.id])
  const hayFiltros = ['estado', 'desde', 'hasta', 'cuentaId'].some((k) => filtros[k]) || !!buscar
  const nuevoHref = `/app/comprobantes/nuevo${filtros.tipoId ? `?tipo=${filtros.tipoId}` : ''}`

  const confirmarBusqueda = (texto) => {
    setBuscar(texto)
    cambiar({ buscar: texto })
  }

  const desde = meta ? (meta.pagina - 1) * meta.porPagina + (comprobantes.length ? 1 : 0) : 0
  const hasta = meta ? (meta.pagina - 1) * meta.porPagina + comprobantes.length : 0

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comprobantes</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Asientos contables por partida doble. Se registran como borrador y, al aprobarlos,
            reciben su número correlativo y pasan a los libros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('comprobantes', 'full') && (
            <Button variante="secundario" onClick={() => setVerTipos(true)}>
              <Icono nombre="ajustes" className="size-4" />
              Tipos de comprobante
            </Button>
          )}
          {can('comprobantes', 'escritura') && (
            <Link to={nuevoHref} className={buttonClass('primario')}>
              <Icono nombre="mas" className="size-4" />
              Nuevo comprobante
            </Link>
          )}
        </div>
      </div>

      {/* Pestañas por categoría (RF-05.6) */}
      <div className="mt-6 flex overflow-x-auto border-b border-linea" role="tablist">
        <Pestana
          activa={!filtros.tipoId}
          onClick={() => cambiar({ tipoId: '' })}
          cantidad={totalTodos}
        >
          Todos
        </Pestana>
        {pestanas.map((t) => (
          <Pestana
            key={t.id}
            activa={filtros.tipoId === String(t.id)}
            onClick={() => cambiar({ tipoId: String(t.id) })}
            cantidad={porTipo[t.id]}
          >
            {t.nombre}
          </Pestana>
        ))}
      </div>

      {/* Filtros */}
      <div className="mt-4 space-y-3 rounded-2xl border border-linea bg-superficie p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-linea bg-papel p-0.5"
            role="group"
            aria-label="Estado"
          >
            {[['', 'Todos'], ...Object.entries(ESTADOS).map(([k, e]) => [k, e.plural])].map(
              ([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => cambiar({ estado: valor })}
                  aria-pressed={filtros.estado === valor}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    filtros.estado === valor
                      ? 'bg-superficie text-marca shadow-sm'
                      : 'text-pizarra hover:text-tinta'
                  }`}
                >
                  {etiqueta}
                </button>
              ),
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-pizarra">
            Desde
            <input
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => cambiar({ desde: e.target.value })}
              className={`${claseCampo} border-linea py-1.5`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-pizarra">
            Hasta
            <input
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => cambiar({ hasta: e.target.value })}
              className={`${claseCampo} border-linea py-1.5`}
            />
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-[1.3fr_1.3fr_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Icono
              nombre="buscar"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-pizarra"
            />
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onBlur={(e) => confirmarBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmarBusqueda(e.currentTarget.value)}
              placeholder="Buscar por número, concepto, referencia o beneficiario…"
              className={`${claseCampo} border-linea pl-9`}
            />
          </label>
          <AccountPicker
            aria-label="Filtrar por cuenta"
            value={filtros.cuentaId ? Number(filtros.cuentaId) : null}
            seleccion={cuentaFiltro}
            soloActivas={false}
            placeholder="Filtrar por cuenta…"
            onChange={(c) => {
              setCuentaFiltro(c)
              cambiar({ cuentaId: c ? String(c.id) : '' })
            }}
          />
          <Button
            variante="fantasma"
            disabled={!hayFiltros}
            onClick={() => {
              setBuscar('')
              setCuentaFiltro(null)
              cambiar({ estado: '', desde: '', hasta: '', buscar: '', cuentaId: '' })
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Resultados */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-papel text-left text-pizarra">
            <tr>
              <th className="px-4 py-3 font-medium">Número</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 text-right font-medium">Monto (Bs)</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Registrado por</th>
            </tr>
          </thead>
          <tbody className={isFetching && !isPending ? 'opacity-60' : ''}>
            {isPending && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-pizarra">
                  Cargando comprobantes…
                </td>
              </tr>
            )}
            {isError && !data && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-alerta">
                  {error.message}
                </td>
              </tr>
            )}
            {!isPending && !isError && comprobantes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-pizarra">
                  {hayFiltros || filtros.tipoId
                    ? 'Ningún comprobante coincide con los filtros.'
                    : 'Aún no hay comprobantes registrados.'}
                </td>
              </tr>
            )}
            {comprobantes.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/app/comprobantes/${c.id}`)}
                className="cursor-pointer border-t border-linea hover:bg-superficie-2/60"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    to={`/app/comprobantes/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`cifras font-semibold hover:underline ${c.codigo ? 'text-marca' : 'text-pizarra'}`}
                  >
                    {numeroComprobante(c)}
                  </Link>
                  <span className="block text-xs text-pizarra">{c.tipo.nombre}</span>
                </td>
                <td className="cifras px-4 py-3 whitespace-nowrap">{formatoFecha(c.fecha)}</td>
                <td className="px-4 py-3">
                  <span className={c.estado === 'ANULADO' ? 'line-through' : ''}>{c.concepto}</span>
                  {c.referencia && (
                    <span className="block text-xs text-pizarra">Ref. {c.referencia}</span>
                  )}
                </td>
                <td className="cifras px-4 py-3 text-right whitespace-nowrap">
                  {formatoMonto(montoComprobante(c))}
                </td>
                <td className="px-4 py-3">
                  <Insignia tono={ESTADOS[c.estado].tono}>{ESTADOS[c.estado].nombre}</Insignia>
                </td>
                <td className="px-4 py-3 text-pizarra">{c.creadoPor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-pizarra">
          <span className="cifras">
            {formatoEntero(desde)}–{formatoEntero(hasta)} de {formatoEntero(meta.total)}{' '}
            comprobantes
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              Mostrar
              <select
                value={filtros.porPagina}
                onChange={(e) => cambiar({ porPagina: Number(e.target.value) })}
                className={`${claseCampo} w-auto border-linea py-1`}
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
            <span className="cifras">
              {meta.pagina} / {meta.paginas}
            </span>
            <Button
              variante="secundario"
              tamano="sm"
              disabled={meta.pagina >= meta.paginas}
              onClick={() => cambiar({ pagina: meta.pagina + 1 }, { conservarPagina: true })}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {verTipos && <TiposModal onClose={() => setVerTipos(false)} />}
    </div>
  )
}
