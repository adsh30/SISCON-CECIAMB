import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useSesion } from '../../api/auth.js'
import { useComprobante } from '../../api/comprobantes.js'
import { useEmpresa } from '../../api/empresa.js'
import { ESTADOS, esCero, numeroComprobante } from '../../lib/comprobantes.js'
import {
  formatoFecha,
  formatoFechaHoraCaracas,
  formatoMonto,
  nombreCompleto,
} from '../../lib/formato.js'

const ahoraUtc = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

/** Comprobante en formato carta, listo para imprimir o guardar como PDF (RF-05.9) */
export default function ImprimirComprobante() {
  const { id } = useParams()
  const { data: c, isError, error } = useComprobante(id)
  const { data: empresa, isPending: cargandoEmpresa } = useEmpresa()
  const { data: usuario } = useSesion()
  const listo = c && !cargandoEmpresa

  useEffect(() => {
    if (!c) return
    document.title = `${numeroComprobante(c)} · ${c.tipo.nombre}`
  }, [c])

  // Abre el diálogo de impresión en cuanto todo está cargado (logo incluido)
  useEffect(() => {
    if (!listo) return
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [listo])

  if (isError && !c) return <p className="p-10 text-center">{error.message}</p>
  if (!listo) return <p className="p-10 text-center">Preparando comprobante…</p>

  const marca = c.estado !== 'APROBADO' ? ESTADOS[c.estado].nombre.toUpperCase() : null

  return (
    <div className="hoja min-h-screen">
      <div className="no-imprimir sticky top-0 flex justify-center gap-2 border-b border-[#e5e7eb] bg-[#f9fafb] p-3">
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

      <article className="relative mx-auto max-w-[216mm] p-8 text-[12px] leading-snug print:p-0">
        {marca && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center text-[110px] font-black tracking-widest text-[#dc2626]/10 -rotate-[25deg]"
          >
            {marca}
          </span>
        )}

        <header className="flex items-start justify-between gap-6 border-b-2 border-[#111827] pb-3">
          <div className="flex items-center gap-4">
            {empresa?.tieneLogo && (
              <img
                src={`/api/v1/empresa/logo?v=${encodeURIComponent(empresa.actualizadoEn)}`}
                alt=""
                className="h-16 w-auto max-w-[45mm] object-contain"
              />
            )}
            <div>
              <p className="text-[15px] font-bold">{empresa?.razonSocial}</p>
              {empresa?.rif && <p>RIF {empresa.rif}</p>}
              {empresa?.direccion && <p>{empresa.direccion}</p>}
              <p>{[empresa?.ciudad, empresa?.estado].filter(Boolean).join(', ')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-wide uppercase">Comprobante de {c.tipo.nombre}</p>
            <p className="font-mono text-[16px] font-bold">{numeroComprobante(c)}</p>
            <p>Fecha: {formatoFecha(c.fecha)}</p>
            <p>Período: {c.periodo.nombre}</p>
          </div>
        </header>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold">Concepto:</dt>
          <dd>{c.concepto}</dd>
          {c.referencia && (
            <>
              <dt className="font-semibold">Referencia:</dt>
              <dd>{c.referencia}</dd>
            </>
          )}
          {c.beneficiario && (
            <>
              <dt className="font-semibold">Beneficiario:</dt>
              <dd>{c.beneficiario}</dd>
            </>
          )}
          {c.estado === 'ANULADO' && (
            <>
              <dt className="font-semibold">Anulado:</dt>
              <dd>
                {formatoFechaHoraCaracas(c.anuladoEn)} por {c.anuladoPor}. Motivo:{' '}
                {c.motivoAnulacion}
              </dd>
            </>
          )}
        </dl>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-y border-[#111827] text-left">
              <th className="py-1.5 pr-2">Cuenta</th>
              <th className="py-1.5 pr-2">Descripción</th>
              <th className="py-1.5 pr-2">C. costo</th>
              <th className="py-1.5 pl-2 text-right">Debe</th>
              <th className="py-1.5 pl-2 text-right">Haber</th>
            </tr>
          </thead>
          <tbody>
            {c.renglones.map((r) => (
              <tr key={r.id} className="border-b border-[#e5e7eb] align-top break-inside-avoid">
                <td className="py-1 pr-2">
                  <span className="font-mono">{r.cuentaCodigo}</span>
                  <span className="block">{r.cuentaNombre}</span>
                </td>
                <td className="py-1 pr-2">{r.descripcion ?? ''}</td>
                <td className="py-1 pr-2">{r.centroCodigo ?? ''}</td>
                <td className="cifras py-1 pl-2 text-right">
                  {esCero(r.debe) ? '' : formatoMonto(r.debe)}
                </td>
                <td className="cifras py-1 pl-2 text-right">
                  {esCero(r.haber) ? '' : formatoMonto(r.haber)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-y-2 border-[#111827] font-bold">
              <td colSpan={3} className="py-1.5 text-right">
                Totales Bs
              </td>
              <td className="cifras py-1.5 pl-2 text-right">{formatoMonto(c.totalDebe)}</td>
              <td className="cifras py-1.5 pl-2 text-right">{formatoMonto(c.totalHaber)}</td>
            </tr>
          </tfoot>
        </table>

        <section className="mt-16 grid grid-cols-3 gap-8 text-center break-inside-avoid">
          {[
            ['Elaborado por', c.creadoPor],
            ['Revisado por', ''],
            ['Aprobado por', c.aprobadoPor ?? ''],
          ].map(([titulo, nombre]) => (
            <div key={titulo}>
              <div className="h-8 border-b border-[#111827]">{nombre}</div>
              <p className="mt-1 font-semibold">{titulo}</p>
            </div>
          ))}
        </section>

        <footer className="mt-8 border-t border-[#e5e7eb] pt-2 text-[10px] text-[#6b7280]">
          Emitido el {formatoFechaHoraCaracas(ahoraUtc())} por {nombreCompleto(usuario)} ·
          SISCON-CECIAMB
        </footer>
      </article>
    </div>
  )
}
