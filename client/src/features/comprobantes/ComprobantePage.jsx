import { useParams, useSearchParams } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useComprobante } from '../../api/comprobantes.js'
import { ComprobanteEditor } from './ComprobanteEditor.jsx'
import { ComprobanteVista } from './ComprobanteVista.jsx'

/** /app/comprobantes/nuevo y /app/comprobantes/:id: borrador editable o vista de solo lectura */
export default function ComprobantePage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { can } = usePermisos()
  const nuevo = id === 'nuevo'
  const { data, isPending, isError, error } = useComprobante(nuevo ? null : id)

  if (nuevo) {
    if (!can('comprobantes', 'escritura')) return <SinPermiso />
    return <ComprobanteEditor tipoInicial={params.get('tipo')} />
  }
  if (isPending) return <p className="py-16 text-center text-pizarra">Cargando comprobante…</p>
  if (isError) return <p className="py-16 text-center text-alerta">{error.message}</p>
  if (data.estado === 'BORRADOR' && can('comprobantes', 'escritura')) {
    // key: al guardar o cambiar de comprobante el editor arranca con los datos nuevos
    return <ComprobanteEditor key={`${data.id}-${data.actualizadoEn}`} comprobante={data} />
  }
  return <ComprobanteVista comprobante={data} />
}

function SinPermiso() {
  return (
    <p className="py-16 text-center text-pizarra">
      Su rol puede consultar comprobantes, pero no registrarlos.
    </p>
  )
}
