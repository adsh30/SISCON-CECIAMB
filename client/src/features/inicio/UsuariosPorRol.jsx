import { Link } from 'react-router'
import { PuntoColor } from '../../components/ui/Formulario.jsx'
import { formatoEntero } from '../../lib/formato.js'
import { Tarjeta } from './Tarjeta.jsx'

/** Tabla con medidor por rol (adaptada de "Productos a reabastecer" de MGG) */
export function UsuariosPorRol({ usuarios }) {
  const max = Math.max(1, ...usuarios.porRol.map((r) => r.total))
  return (
    <Tarjeta
      titulo="Usuarios por rol"
      extra={
        <Link to="/app/usuarios" className="font-semibold text-marca hover:underline">
          Gestionar usuarios
        </Link>
      }
    >
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-pizarra">
              <th className="px-1 py-2 font-medium">Rol</th>
              <th className="px-1 py-2 text-right font-medium">Habilitados</th>
              <th className="px-1 py-2 text-right font-medium">Total</th>
              <th className="w-2/5 px-1 py-2 font-medium">
                <span className="sr-only">Proporción</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.porRol.map((r) => (
              <tr key={r.id} className="border-t border-linea">
                <td className="px-1 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <PuntoColor color={r.color} /> {r.nombre}
                  </span>
                </td>
                <td className="cifras px-1 py-2.5 text-right font-semibold">
                  {formatoEntero(r.activos)}
                </td>
                <td className="cifras px-1 py-2.5 text-right text-pizarra">
                  {formatoEntero(r.total)}
                </td>
                <td className="px-1 py-2.5">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-superficie-2"
                    title={`${r.activos} de ${r.total} habilitados`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(r.total / max) * 100}%`, backgroundColor: r.color }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-pizarra">
        {formatoEntero(usuarios.activos)} habilitados · {formatoEntero(usuarios.inactivos)}{' '}
        deshabilitados · {formatoEntero(usuarios.archivados)} archivados
      </p>
    </Tarjeta>
  )
}
