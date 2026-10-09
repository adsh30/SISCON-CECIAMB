import { useState } from 'react'
import { Link } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { Button } from '../../components/ui/Button.jsx'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { nombreAccion } from '../../lib/bitacora.js'
import { ESTADOS, esCero, numeroComprobante } from '../../lib/comprobantes.js'
import { formatoFecha, formatoFechaHoraCaracas, formatoMonto } from '../../lib/formato.js'
import { AnularModal, CopiarModal } from './AccionesComprobante.jsx'

function Dato({ etiqueta, children }) {
  return (
    <div>
      <dt className="text-xs text-pizarra">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium">{children || '—'}</dd>
    </div>
  )
}

/** Comprobante en solo lectura: aprobados, anulados y borradores para quien no puede editar */
export function ComprobanteVista({ comprobante: c }) {
  const { can } = usePermisos()
  const puedeModificar = can('comprobantes', 'escritura')
  const puedeAnular = can('comprobantes', 'full')
  const [dialogo, setDialogo] = useState(null) // 'duplicar' | 'reversar' | 'anular'
  const estado = ESTADOS[c.estado]

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/app/comprobantes" className="text-sm font-semibold text-marca hover:underline">
            ← Comprobantes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="cifras text-2xl font-bold tracking-tight">{numeroComprobante(c)}</h1>
            <Insignia tono={estado.tono}>{estado.nombre}</Insignia>
          </div>
          <p className="mt-1 text-pizarra">
            {c.tipo.nombre} · {formatoFecha(c.fecha)} · Período {c.periodo.nombre}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/imprimir/comprobantes/${c.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-sm font-semibold hover:border-marca/40"
          >
            <Icono nombre="imprimir" className="size-4" />
            Imprimir
          </a>
          {puedeModificar && (
            <Button variante="secundario" tamano="sm" onClick={() => setDialogo('duplicar')}>
              <Icono nombre="copiar" className="size-4" />
              Duplicar
            </Button>
          )}
          {puedeModificar && c.estado === 'APROBADO' && (
            <Button variante="secundario" tamano="sm" onClick={() => setDialogo('reversar')}>
              <Icono nombre="reverso" className="size-4" />
              Generar reverso
            </Button>
          )}
          {puedeAnular && c.estado === 'APROBADO' && (
            <Button variante="peligro" tamano="sm" onClick={() => setDialogo('anular')}>
              <Icono nombre="cerrar" className="size-4" />
              Anular
            </Button>
          )}
        </div>
      </div>

      {c.estado === 'ANULADO' && (
        <div className="mt-4 rounded-2xl border border-alerta/30 bg-alerta-claro px-4 py-3 text-sm text-alerta">
          <strong>Anulado</strong> por {c.anuladoPor} · {formatoFechaHoraCaracas(c.anuladoEn)}
          <span className="block">Motivo: {c.motivoAnulacion}</span>
          <span className="block">No cuenta en los libros.</span>
        </div>
      )}
      {c.estado === 'BORRADOR' && (
        <div className="mt-4 rounded-2xl border border-aviso/30 bg-aviso-claro px-4 py-3 text-sm text-aviso">
          Este comprobante es un borrador: todavía no tiene número ni cuenta en los libros.
        </div>
      )}

      <dl className="mt-6 grid gap-4 rounded-2xl border border-linea bg-superficie p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <Dato etiqueta="Concepto">{c.concepto}</Dato>
        </div>
        <Dato etiqueta="Referencia o documento">{c.referencia}</Dato>
        <Dato etiqueta="Beneficiario o tercero">{c.beneficiario}</Dato>
        <Dato etiqueta="Tipo">
          {c.tipo.codigo} · {c.tipo.nombre}
        </Dato>
        <Dato etiqueta="Origen">
          {c.origen && (
            <Link to={`/app/comprobantes/${c.origen.id}`} className="text-marca hover:underline">
              {c.origen.tipo === 'REVERSO' ? 'Reverso de ' : 'Copia de '}
              {c.origen.codigo ?? `Borrador #${c.origen.id}`}
            </Link>
          )}
        </Dato>
      </dl>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-linea bg-superficie">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-papel text-left text-pizarra">
            <tr>
              <th className="w-10 px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Cuenta</th>
              <th className="px-4 py-3 font-medium">Centro</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 text-right font-medium">Debe</th>
              <th className="px-4 py-3 text-right font-medium">Haber</th>
            </tr>
          </thead>
          <tbody>
            {c.renglones.map((r) => (
              <tr key={r.id} className="border-t border-linea">
                <td className="cifras px-4 py-2.5 text-pizarra">{r.renglon}</td>
                <td className="px-4 py-2.5">
                  <span className="cifras font-mono text-xs font-semibold text-marca">
                    {r.cuentaCodigo}
                  </span>{' '}
                  {r.cuentaNombre}
                </td>
                <td className="px-4 py-2.5 text-pizarra">{r.centroCodigo ?? '—'}</td>
                <td className="px-4 py-2.5 text-pizarra">{r.descripcion ?? ''}</td>
                <td className="cifras px-4 py-2.5 text-right">
                  {esCero(r.debe) ? '' : formatoMonto(r.debe)}
                </td>
                <td className="cifras px-4 py-2.5 text-right">
                  {esCero(r.haber) ? '' : formatoMonto(r.haber)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-linea font-semibold">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right">
                Totales
              </td>
              <td className="cifras px-4 py-3 text-right">{formatoMonto(c.totalDebe)}</td>
              <td className="cifras px-4 py-3 text-right">{formatoMonto(c.totalHaber)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Auditoría (RF-07.4) */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <dl className="grid gap-3 rounded-2xl border border-linea bg-superficie p-5 sm:grid-cols-2">
          <Dato etiqueta="Creado por">
            {c.creadoPor} · {formatoFechaHoraCaracas(c.creadoEn)}
          </Dato>
          <Dato etiqueta="Última modificación">
            {c.actualizadoPor} · {formatoFechaHoraCaracas(c.actualizadoEn)}
          </Dato>
          {c.aprobadoEn && (
            <Dato etiqueta="Aprobado por">
              {c.aprobadoPor} · {formatoFechaHoraCaracas(c.aprobadoEn)}
            </Dato>
          )}
          {c.anuladoEn && (
            <Dato etiqueta="Anulado por">
              {c.anuladoPor} · {formatoFechaHoraCaracas(c.anuladoEn)}
            </Dato>
          )}
        </dl>
        <div className="rounded-2xl border border-linea bg-superficie p-5">
          <h2 className="font-semibold">Historial</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {c.historial.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  <strong>{nombreAccion(h.accion)}</strong> · {h.usuario ?? 'Sistema'}
                </span>
                <span className="cifras text-pizarra">{formatoFechaHoraCaracas(h.fecha)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {(dialogo === 'duplicar' || dialogo === 'reversar') && (
        <CopiarModal comprobante={c} tipo={dialogo} onClose={() => setDialogo(null)} />
      )}
      {dialogo === 'anular' && <AnularModal comprobante={c} onClose={() => setDialogo(null)} />}
    </div>
  )
}
