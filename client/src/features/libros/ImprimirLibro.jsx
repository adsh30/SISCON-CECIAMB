import { Fragment, useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { useSesion } from '../../api/auth.js'
import { useCentrosCosto } from '../../api/centrosCosto.js'
import { useTiposComprobante } from '../../api/comprobantes.js'
import { useEmpresa } from '../../api/empresa.js'
import { useLibro } from '../../api/libros.js'
import { esCero } from '../../lib/comprobantes.js'
import {
  formatoEntero,
  formatoFecha,
  formatoFechaHoraCaracas,
  formatoMonto,
  nombreCompleto,
} from '../../lib/formato.js'
import { mesEnCurso } from './filtros.js'

const LIBROS = { diario: 'Libro Diario', mayor: 'Libro Mayor' }
const CLAVES = ['desde', 'hasta', 'tipoId', 'centroCostoId', 'cuentaDesde', 'cuentaHasta']
const ahoraUtc = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const monto = (v) => (esCero(v) ? '' : formatoMonto(v))

function Diario({ data, meta }) {
  return (
    <table className="mt-4 w-full border-collapse">
      <thead>
        <tr className="border-y border-[#111827] text-left">
          <th className="py-1.5 pr-2">Fecha</th>
          <th className="py-1.5 pr-2">Cuenta</th>
          <th className="py-1.5 pr-2">Descripción</th>
          <th className="py-1.5 pr-2">C. costo</th>
          <th className="py-1.5 pl-2 text-right">Debe</th>
          <th className="py-1.5 pl-2 text-right">Haber</th>
        </tr>
      </thead>
      <tbody>
        {data.map((c) => (
          <Fragment key={c.id}>
            <tr className="border-t border-[#9ca3af] break-after-avoid">
              <td className="pt-2 pr-2 font-semibold whitespace-nowrap">{formatoFecha(c.fecha)}</td>
              <td colSpan={5} className="pt-2 font-semibold">
                <span className="font-mono">{c.codigo}</span> · {c.concepto}
                {c.referencia && <span className="font-normal"> · Ref. {c.referencia}</span>}
              </td>
            </tr>
            {c.renglones.map((r) => (
              <tr key={r.renglon} className="align-top break-inside-avoid">
                <td />
                <td className={`py-0.5 pr-2 ${esCero(r.debe) ? 'pl-8' : ''}`}>
                  <span className="font-mono">{r.cuentaCodigo}</span> {r.cuentaNombre}
                </td>
                <td className="py-0.5 pr-2">{r.descripcion ?? ''}</td>
                <td className="py-0.5 pr-2">{r.centroCodigo ?? ''}</td>
                <td className="cifras py-0.5 pl-2 text-right">{monto(r.debe)}</td>
                <td className="cifras py-0.5 pl-2 text-right">{monto(r.haber)}</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-y-2 border-[#111827] font-bold">
          <td colSpan={4} className="py-1.5 text-right">
            Totales Bs ({formatoEntero(meta.total)} comprobantes)
          </td>
          <td className="cifras py-1.5 pl-2 text-right">{formatoMonto(meta.totales.debe)}</td>
          <td className="cifras py-1.5 pl-2 text-right">{formatoMonto(meta.totales.haber)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function Mayor({ data, meta }) {
  return (
    <>
      {data.map((c) => (
        <table key={c.cuenta.id} className="mt-5 w-full border-collapse">
          <thead>
            <tr>
              <th colSpan={7} className="pb-1 text-left text-[12px]">
                <span className="font-mono">{c.cuenta.codigo}</span> {c.cuenta.nombre}
                <span className="ml-2 font-normal">
                  (naturaleza {c.cuenta.naturaleza === 'DEUDORA' ? 'deudora' : 'acreedora'})
                </span>
              </th>
            </tr>
            <tr className="border-y border-[#111827] text-left">
              <th className="py-1 pr-2">Fecha</th>
              <th className="py-1 pr-2">Comprobante</th>
              <th className="py-1 pr-2">Concepto</th>
              <th className="py-1 pr-2">C. costo</th>
              <th className="py-1 pl-2 text-right">Debe</th>
              <th className="py-1 pl-2 text-right">Haber</th>
              <th className="py-1 pl-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="py-0.5 text-right font-semibold">
                Saldo anterior
              </td>
              <td className="cifras py-0.5 pl-2 text-right font-semibold">
                {formatoMonto(c.saldoAnterior)}
              </td>
            </tr>
            {c.movimientos.map((m, i) => (
              <tr key={i} className="align-top break-inside-avoid">
                <td className="py-0.5 pr-2 whitespace-nowrap">{formatoFecha(m.fecha)}</td>
                <td className="py-0.5 pr-2 font-mono whitespace-nowrap">{m.comprobante}</td>
                <td className="py-0.5 pr-2">
                  {m.concepto}
                  {m.descripcion && <span> · {m.descripcion}</span>}
                </td>
                <td className="py-0.5 pr-2">{m.centroCodigo ?? ''}</td>
                <td className="cifras py-0.5 pl-2 text-right">{monto(m.debe)}</td>
                <td className="cifras py-0.5 pl-2 text-right">{monto(m.haber)}</td>
                <td className="cifras py-0.5 pl-2 text-right">{formatoMonto(m.saldo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#111827] font-bold break-inside-avoid">
              <td colSpan={4} className="py-1 text-right">
                Totales y saldo final
              </td>
              <td className="cifras py-1 pl-2 text-right">{formatoMonto(c.totalDebe)}</td>
              <td className="cifras py-1 pl-2 text-right">{formatoMonto(c.totalHaber)}</td>
              <td className="cifras py-1 pl-2 text-right">{formatoMonto(c.saldoFinal)}</td>
            </tr>
          </tfoot>
        </table>
      ))}
      <p className="mt-6 flex justify-end gap-8 border-y-2 border-[#111827] py-1.5 font-bold break-inside-avoid">
        <span>Totales generales Bs ({formatoEntero(meta.total)} cuentas)</span>
        <span className="cifras">Debe {formatoMonto(meta.totales.debe)}</span>
        <span className="cifras">Haber {formatoMonto(meta.totales.haber)}</span>
      </p>
    </>
  )
}

/** Libro completo en formato carta, listo para imprimir o guardar como PDF (RF-06.4) */
export default function ImprimirLibro() {
  const { libro } = useParams()
  const [params] = useSearchParams()
  const filtros = Object.fromEntries(CLAVES.map((k) => [k, params.get(k) ?? '']))
  if (!filtros.desde || !filtros.hasta) Object.assign(filtros, mesEnCurso())
  const valido = libro in LIBROS

  const { data, isError, error } = useLibro(valido ? libro : 'diario', { ...filtros, todo: true })
  const { data: empresa, isPending: cargandoEmpresa } = useEmpresa()
  const { data: usuario } = useSesion()
  const { data: tipos = [] } = useTiposComprobante()
  const { data: centros = [] } = useCentrosCosto()
  const listo = valido && data && !cargandoEmpresa

  useEffect(() => {
    if (valido) document.title = `${LIBROS[libro]} · ${filtros.desde} a ${filtros.hasta}`
  }, [valido, libro, filtros.desde, filtros.hasta])

  // Abre el diálogo de impresión en cuanto todo está cargado (logo incluido)
  useEffect(() => {
    if (!listo) return
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [listo])

  if (!valido) return <Navigate to="/app" replace />
  if (isError && !data) return <p className="p-10 text-center">{error.message}</p>
  if (!listo) return <p className="p-10 text-center">Preparando el libro…</p>

  const tipo = tipos.find((t) => String(t.id) === filtros.tipoId)
  const centro = centros.find((c) => String(c.id) === filtros.centroCostoId)
  const detalles = [
    `Desde ${formatoFecha(filtros.desde)} hasta ${formatoFecha(filtros.hasta)}`,
    filtros.cuentaDesde || filtros.cuentaHasta
      ? `Cuentas ${filtros.cuentaDesde || 'desde el inicio'} a ${filtros.cuentaHasta || 'el final'}`
      : null,
    tipo ? `Tipo: ${tipo.codigo} ${tipo.nombre}` : null,
    centro ? `Centro de costo: ${centro.codigo} ${centro.nombre}` : null,
  ].filter(Boolean)

  return (
    <div className="hoja min-h-screen">
      <div className="no-imprimir sticky top-0 z-10 flex justify-center gap-2 border-b border-[#e5e7eb] bg-[#f9fafb] p-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-[#fff]"
        >
          Imprimir o guardar como PDF
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-semibold"
        >
          Cerrar
        </button>
      </div>

      <article
        className={`mx-auto p-8 text-[10.5px] leading-snug print:p-0 ${
          libro === 'mayor' ? 'apaisada max-w-[279mm]' : 'max-w-[216mm]'
        }`}
      >
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#111827] pb-3">
          <div className="flex items-center gap-4">
            {empresa?.tieneLogo && (
              <img
                src={`/api/v1/empresa/logo?v=${encodeURIComponent(empresa.actualizadoEn)}`}
                alt=""
                className="h-14 w-auto max-w-[40mm] object-contain"
              />
            )}
            <div>
              <p className="text-[14px] font-bold">{empresa?.razonSocial}</p>
              {empresa?.rif && <p>RIF {empresa.rif}</p>}
              {empresa?.direccion && <p>{empresa.direccion}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-bold">{LIBROS[libro]}</p>
            {detalles.map((d) => (
              <p key={d}>{d}</p>
            ))}
          </div>
        </header>

        {data.meta.total === 0 ? (
          <p className="mt-8 text-center">No hay movimientos aprobados en este rango.</p>
        ) : libro === 'diario' ? (
          <Diario data={data.data} meta={data.meta} />
        ) : (
          <Mayor data={data.data} meta={data.meta} />
        )}

        <footer className="mt-8 border-t border-[#e5e7eb] pt-2 text-[9px] text-[#6b7280]">
          Emitido el {formatoFechaHoraCaracas(ahoraUtc())} por {nombreCompleto(usuario)} ·
          SISCON-CECIAMB
        </footer>
      </article>
    </div>
  )
}
