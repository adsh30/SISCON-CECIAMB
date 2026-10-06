import { useEventoBitacora } from '../../api/bitacora.js'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import {
  ACCIONES,
  compararDatos,
  describirEvento,
  formatoIp,
  formatoValor,
  nombreCampo,
  nombreModulo,
} from '../../lib/bitacora.js'
import { formatoFechaHoraCaracas, formatoRelativo, nombreCompleto } from '../../lib/formato.js'

function Dato({ etiqueta, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-linea py-2 text-sm">
      <dt className="shrink-0 text-pizarra">{etiqueta}</dt>
      <dd className="min-w-0 text-right break-words">{children || '—'}</dd>
    </div>
  )
}

function TablaCambios({ antes, despues }) {
  const filas = compararDatos(antes, despues)
  if (!filas.length) {
    return <p className="text-sm text-pizarra">Este evento no guarda datos adicionales.</p>
  }
  const soloDespues = antes == null
  const soloAntes = despues == null
  return (
    <div className="overflow-x-auto rounded-xl border border-linea">
      <table className="w-full text-sm">
        <thead className="bg-papel text-left text-pizarra">
          <tr>
            <th className="px-3 py-2 font-medium">Campo</th>
            {!soloDespues && <th className="px-3 py-2 font-medium">Antes</th>}
            {!soloAntes && <th className="px-3 py-2 font-medium">Después</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr
              key={f.campo}
              className={`border-t border-linea ${f.cambio ? 'bg-aviso-claro/60' : ''}`}
            >
              <td className="px-3 py-2 font-medium">
                {nombreCampo(f.campo)}
                {f.cambio && <span className="sr-only"> (cambió)</span>}
              </td>
              {!soloDespues && (
                <td
                  className={`px-3 py-2 break-all ${f.cambio ? 'text-alerta line-through decoration-alerta/40' : 'text-pizarra'}`}
                >
                  {formatoValor(f.antes)}
                </td>
              )}
              {!soloAntes && (
                <td className={`px-3 py-2 break-all ${f.cambio ? 'font-semibold text-exito' : ''}`}>
                  {formatoValor(f.despues)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EventoModal({ id, onClose }) {
  const { data: e, isPending, isError, error } = useEventoBitacora(id)

  return (
    <Modal titulo={`Evento N.º ${id}`} tamano="lg" onClose={onClose}>
      {isPending ? (
        <p className="py-8 text-center text-pizarra">Cargando…</p>
      ) : isError ? (
        <p className="py-8 text-center text-alerta">{error.message}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Insignia tono={ACCIONES[e.accion]?.tono}>
              {ACCIONES[e.accion]?.nombre ?? e.accion}
            </Insignia>
            <span className="font-semibold">{describirEvento(e).texto}</span>
          </div>

          <dl className="mt-4">
            <Dato etiqueta="Fecha y hora (Caracas)">
              {formatoFechaHoraCaracas(e.fecha)}{' '}
              <span className="text-pizarra">({formatoRelativo(e.fecha)})</span>
            </Dato>
            <Dato etiqueta="Usuario">
              {e.usuarioId ? `${nombreCompleto(e)} · ${e.email}` : 'Sistema (automático)'}
            </Dato>
            <Dato etiqueta="Módulo">{nombreModulo(e.entidad)}</Dato>
            <Dato etiqueta="ID afectado">{e.entidadId}</Dato>
            <Dato etiqueta="Dirección IP">{formatoIp(e.ip)}</Dato>
            <Dato etiqueta="Navegador">
              <span className="text-xs text-pizarra">{e.agente}</span>
            </Dato>
          </dl>

          <h3 className="mt-5 mb-2 font-semibold">Datos registrados</h3>
          <p className="ayuda mb-3 text-sm text-pizarra">
            Los campos que cambiaron aparecen primero y resaltados: tachado en rojo el valor
            anterior y en verde el nuevo.
          </p>
          <TablaCambios antes={e.antes} despues={e.despues} />
        </>
      )}
    </Modal>
  )
}
