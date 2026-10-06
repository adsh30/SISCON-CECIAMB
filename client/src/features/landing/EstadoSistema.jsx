import { useHealth } from '../../api/health.js'

export function EstadoSistema() {
  const { data, isPending, isError } = useHealth()
  const ok = data?.data.baseDatos.estado === 'ok'

  const [color, texto] = isPending
    ? ['bg-pizarra/40', 'Comprobando conexión…']
    : isError || !ok
      ? ['bg-alerta', 'Sin conexión con el servidor']
      : ['bg-exito', 'Sistema en línea']

  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span className={`size-2 rounded-full ${color}`} aria-hidden="true" />
      {texto}
    </span>
  )
}
