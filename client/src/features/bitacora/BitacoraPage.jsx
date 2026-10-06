import { useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useBitacora, useOpcionesBitacora, urlExportarBitacora } from '../../api/bitacora.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import {
  ACCIONES,
  describirEvento,
  formatoIp,
  nombreAccion,
  nombreModulo,
} from '../../lib/bitacora.js'
import {
  formatoEntero,
  formatoFechaHoraCaracas,
  formatoRelativo,
  nombreCompleto,
} from '../../lib/formato.js'
import { hoyCaracas, rangoDePreset } from '../../lib/series.js'
import { EventoModal } from './EventoModal.jsx'

const POR_PAGINA = [10, 25, 50, 100]
const CLAVES = ['desde', 'hasta', 'usuarioId', 'accion', 'entidad', 'buscar', 'pagina', 'porPagina']

const PERIODOS = [
  { etiqueta: 'Hoy', rango: () => ({ desde: hoyCaracas(), hasta: hoyCaracas() }) },
  { etiqueta: '7 días', rango: () => rangoDePreset('7d') },
  { etiqueta: '30 días', rango: () => rangoDePreset('30d') },
  { etiqueta: 'Todo', rango: () => ({ desde: '', hasta: '' }) },
]

/** Filtros guardados en la dirección: se conservan al recargar y se pueden compartir */
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

export default function BitacoraPage() {
  const [filtros, cambiar] = useFiltros()
  const [buscar, setBuscar] = useState(filtros.buscar)
  const buscarDiferido = useDeferredValue(buscar)
  const consulta = { ...filtros, buscar: buscarDiferido }
  if (buscarDiferido !== filtros.buscar) consulta.pagina = 1

  const { data, isPending, isError, error, isFetching } = useBitacora(consulta)
  const { data: opciones } = useOpcionesBitacora()
  const [eventoId, setEventoId] = useState(null)
  const [exportando, setExportando] = useState(false)
  const avisar = useAvisos()

  const eventos = data?.data ?? []
  const meta = data?.meta
  const hayFiltros =
    ['desde', 'hasta', 'usuarioId', 'accion', 'entidad'].some((k) => filtros[k]) || !!buscar
  const periodoActivo = PERIODOS.find((p) => {
    const r = p.rango()
    return r.desde === filtros.desde && r.hasta === filtros.hasta
  })

  const confirmarBusqueda = (texto) => {
    setBuscar(texto)
    cambiar({ buscar: texto })
  }

  const exportar = async () => {
    setExportando(true)
    try {
      const res = await fetch(urlExportarBitacora(consulta), { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? 'No se pudo exportar')
      }
      const nombre =
        res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ?? 'bitacora.csv'
      const url = URL.createObjectURL(await res.blob())
      const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre })
      enlace.click()
      URL.revokeObjectURL(url)
      avisar('Bitácora exportada', 'exito', `${nombre} · se abre con Excel`)
    } catch (e) {
      avisar(e.message, 'alerta')
    } finally {
      setExportando(false)
    }
  }

  const desde = meta ? (meta.pagina - 1) * meta.porPagina + (eventos.length ? 1 : 0) : 0
  const hasta = meta ? (meta.pagina - 1) * meta.porPagina + eventos.length : 0

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bitácora de auditoría</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Todo lo que ocurre en el sistema queda registrado: quién, qué, cuándo y desde dónde.
            Nadie puede modificar ni borrar estos registros.
          </p>
        </div>
        <Button variante="secundario" onClick={exportar} disabled={exportando || !meta?.total}>
          <Icono nombre="archivo" className="size-4" />
          {exportando ? 'Exportando…' : 'Exportar a Excel (CSV)'}
        </Button>
      </div>

      {/* Filtros */}
      <div className="mt-6 space-y-3 rounded-2xl border border-linea bg-superficie p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-linea bg-papel p-0.5"
            role="group"
            aria-label="Período"
          >
            {PERIODOS.map((p) => (
              <button
                key={p.etiqueta}
                type="button"
                onClick={() => cambiar(p.rango())}
                aria-pressed={periodoActivo === p}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  periodoActivo === p
                    ? 'bg-superficie text-marca shadow-sm'
                    : 'text-pizarra hover:text-tinta'
                }`}
              >
                {p.etiqueta}
              </button>
            ))}
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

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
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
              placeholder="Buscar por usuario, correo, IP o dato…"
              className={`${claseCampo} border-linea pl-9`}
            />
          </label>
          <select
            value={filtros.usuarioId}
            onChange={(e) => cambiar({ usuarioId: e.target.value })}
            className={`${claseCampo} border-linea`}
            aria-label="Filtrar por usuario"
          >
            <option value="">Todos los usuarios</option>
            {opciones?.usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {nombreCompleto(u)}
              </option>
            ))}
          </select>
          <select
            value={filtros.accion}
            onChange={(e) => cambiar({ accion: e.target.value })}
            className={`${claseCampo} border-linea`}
            aria-label="Filtrar por acción"
          >
            <option value="">Todas las acciones</option>
            {(opciones?.acciones ?? Object.keys(ACCIONES)).map((a) => (
              <option key={a} value={a}>
                {nombreAccion(a)}
              </option>
            ))}
          </select>
          <select
            value={filtros.entidad}
            onChange={(e) => cambiar({ entidad: e.target.value })}
            className={`${claseCampo} border-linea`}
            aria-label="Filtrar por módulo"
          >
            <option value="">Todos los módulos</option>
            {opciones?.entidades.map((m) => (
              <option key={m} value={m}>
                {nombreModulo(m)}
              </option>
            ))}
          </select>
          <Button
            variante="fantasma"
            disabled={!hayFiltros}
            onClick={() => {
              setBuscar('')
              cambiar({ desde: '', hasta: '', usuarioId: '', accion: '', entidad: '', buscar: '' })
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Resultados */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-papel text-left text-pizarra">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha y hora</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3">
                <span className="sr-only">Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody className={isFetching && !isPending ? 'opacity-60' : ''}>
            {isPending && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-pizarra">
                  Cargando bitácora…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-alerta">
                  {error.message}
                </td>
              </tr>
            )}
            {!isPending && !isError && eventos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-pizarra">
                  {hayFiltros
                    ? 'Ningún evento coincide con los filtros.'
                    : 'Aún no hay eventos registrados.'}
                </td>
              </tr>
            )}
            {eventos.map((e) => (
              <tr
                key={e.id}
                onClick={() => setEventoId(e.id)}
                className="cursor-pointer border-t border-linea hover:bg-superficie-2/60"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="cifras block">{formatoFechaHoraCaracas(e.fecha)}</span>
                  <span className="text-xs text-pizarra">{formatoRelativo(e.fecha)}</span>
                </td>
                <td className="px-4 py-3">
                  {e.usuarioId ? (
                    <>
                      <span className="block font-medium">{nombreCompleto(e)}</span>
                      <span className="text-xs text-pizarra">{e.email}</span>
                    </>
                  ) : (
                    <span className="text-pizarra">Sistema</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Insignia tono={ACCIONES[e.accion]?.tono}>{nombreAccion(e.accion)}</Insignia>
                </td>
                <td className="px-4 py-3">
                  {describirEvento(e).texto}
                  {e.entidadId && <span className="text-xs text-pizarra"> · ID {e.entidadId}</span>}
                </td>
                <td className="cifras px-4 py-3 text-pizarra">{formatoIp(e.ip)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setEventoId(e.id)
                    }}
                    className="font-semibold text-marca hover:underline"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-pizarra">
          <span className="cifras">
            {formatoEntero(desde)}–{formatoEntero(hasta)} de {formatoEntero(meta.total)} eventos
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

      {eventoId && <EventoModal id={eventoId} onClose={() => setEventoId(null)} />}
    </div>
  )
}
