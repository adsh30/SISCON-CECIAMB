import { useState } from 'react'
import { usePermisos } from '../../api/auth.js'
import { useCentrosCosto } from '../../api/centrosCosto.js'
import { useTiposComprobante } from '../../api/comprobantes.js'
import { consultaLibro, descargarExcel, filtrosExportacion } from '../../api/libros.js'
import { usePeriodos } from '../../api/periodos.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { buttonClass } from '../../components/ui/buttonClass.js'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoEntero, formatoMonto } from '../../lib/formato.js'
import { POR_PAGINA } from './filtros.js'

const campo = `${claseCampo} border-linea py-1.5`

/** Atajo de fechas: cada período (mes) y el ejercicio completo */
function SelectorPeriodo({ filtros, cambiar }) {
  const { can } = usePermisos()
  const { data } = usePeriodos({ enabled: can('periodos') })
  const ejercicios = data?.ejercicios ?? []
  if (!ejercicios.length) return null

  const valor = `${filtros.desde}|${filtros.hasta}`
  const opciones = ejercicios.flatMap((e) => [
    `${e.fechaInicio}|${e.fechaFin}`,
    ...e.periodos.map((p) => `${p.fechaInicio}|${p.fechaFin}`),
  ])

  return (
    <label className="flex items-center gap-2 text-sm text-pizarra">
      Período
      <select
        value={opciones.includes(valor) ? valor : ''}
        onChange={(e) => {
          const [desde, hasta] = e.target.value.split('|')
          if (desde) cambiar({ desde, hasta })
        }}
        className={`${campo} w-auto`}
      >
        <option value="">Rango libre</option>
        {[...ejercicios].reverse().map((e) => (
          <optgroup key={e.id} label={e.nombre}>
            <option value={`${e.fechaInicio}|${e.fechaFin}`}>{e.nombre} completo</option>
            {e.periodos.map((p) => (
              <option key={p.id} value={`${p.fechaInicio}|${p.fechaFin}`}>
                {p.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

/** Filtros comunes a los dos libros; `children` agrega los propios (cuentas en el Mayor) */
export function FiltrosLibro({ filtros, cambiar, children }) {
  const { data: tipos = [] } = useTiposComprobante()
  const { data: centros = [] } = useCentrosCosto()

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-linea bg-superficie p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SelectorPeriodo filtros={filtros} cambiar={cambiar} />
        <label className="flex items-center gap-2 text-sm text-pizarra">
          Desde
          <input
            type="date"
            required
            value={filtros.desde}
            onChange={(e) => {
              const desde = e.target.value
              if (!desde) return
              // Si la fecha inicial pasa a la final, el rango se corre con ella
              cambiar({ desde, hasta: desde > filtros.hasta ? desde : filtros.hasta })
            }}
            className={campo}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-pizarra">
          Hasta
          <input
            type="date"
            required
            value={filtros.hasta}
            min={filtros.desde}
            onChange={(e) => {
              const hasta = e.target.value
              if (!hasta) return
              cambiar({ hasta, desde: hasta < filtros.desde ? hasta : filtros.desde })
            }}
            className={campo}
          />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm text-pizarra">
          <span className="mb-1 block">Tipo de comprobante</span>
          <select
            value={filtros.tipoId}
            onChange={(e) => cambiar({ tipoId: e.target.value })}
            className={campo}
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} · {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-pizarra">
          <span className="mb-1 block">Centro de costo</span>
          <select
            value={filtros.centroCostoId}
            onChange={(e) => cambiar({ centroCostoId: e.target.value })}
            className={campo}
          >
            <option value="">Todos los centros</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </label>
        {children}
      </div>
    </div>
  )
}

/** Excel (descarga directa) e impresión / PDF (pestaña aparte con el libro completo) */
export function BotonesExportar({ libro, filtros, deshabilitado }) {
  const avisar = useAvisos()
  const [descargando, setDescargando] = useState(false)

  const excel = async () => {
    setDescargando(true)
    try {
      const nombre = await descargarExcel(libro, filtros)
      avisar('Libro descargado en Excel', 'exito', nombre)
    } catch (e) {
      avisar(e.message, 'alerta')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variante="secundario" onClick={excel} disabled={deshabilitado || descargando}>
        <Icono nombre="descargar" className="size-4" />
        {descargando ? 'Generando…' : 'Excel'}
      </Button>
      <a
        href={`/imprimir/libros/${libro}?${consultaLibro(filtrosExportacion(filtros))}`}
        target="_blank"
        rel="noreferrer"
        aria-disabled={deshabilitado}
        onClick={(e) => deshabilitado && e.preventDefault()}
        className={buttonClass('secundario', deshabilitado ? 'pointer-events-none opacity-60' : '')}
      >
        <Icono nombre="imprimir" className="size-4" />
        Imprimir o PDF
      </a>
    </div>
  )
}

/** Tarjetas con los totales del rango completo (no solo de la página) */
export function TotalesLibro({ meta, unidad, etiquetaRenglones, verificarCuadre }) {
  const cuadrado = meta && meta.totales.debe === meta.totales.haber
  const tarjetas = [
    [unidad, meta ? formatoEntero(meta.total) : '—'],
    [etiquetaRenglones, meta ? formatoEntero(meta.totales.renglones) : '—'],
    ['Total Debe (Bs)', meta ? formatoMonto(meta.totales.debe) : '—'],
    ['Total Haber (Bs)', meta ? formatoMonto(meta.totales.haber) : '—'],
  ]
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tarjetas.map(([titulo, valor], i) => (
        <div key={titulo} className="rounded-xl border border-linea bg-superficie px-4 py-3">
          <p className="text-xs text-pizarra">{titulo}</p>
          <p className="cifras mt-1 text-lg font-bold">{valor}</p>
          {i === 3 && verificarCuadre && meta?.total > 0 && (
            <p
              className={`mt-0.5 text-xs font-semibold ${cuadrado ? 'text-exito' : 'text-alerta'}`}
            >
              {cuadrado ? '✓ Debe y Haber cuadran' : '✗ Debe y Haber no cuadran'}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export function Paginacion({ meta, filtros, cambiar, cantidad, unidad }) {
  if (!meta || meta.total === 0) return null
  const inicio = (meta.pagina - 1) * meta.porPagina + (cantidad ? 1 : 0)
  const fin = (meta.pagina - 1) * meta.porPagina + cantidad
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-pizarra">
      <span className="cifras">
        {formatoEntero(inicio)}–{formatoEntero(fin)} de {formatoEntero(meta.total)} {unidad}
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
  )
}
