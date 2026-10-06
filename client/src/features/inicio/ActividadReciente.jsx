import { Link } from 'react-router'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoFechaHora, formatoRelativo, nombreCompleto } from '../../lib/formato.js'
import { describirEvento } from '../../lib/bitacora.js'
import { Tarjeta } from './Tarjeta.jsx'

const TONOS = {
  marca: 'bg-marca-claro text-marca',
  exito: 'bg-exito-claro text-exito',
  alerta: 'bg-alerta-claro text-alerta',
  aviso: 'bg-aviso-claro text-aviso',
  neutro: 'bg-superficie-2 text-pizarra',
}

/** Feed de movimientos recientes (como el de MGG), alimentado por la bitácora */
export function ActividadReciente({ actividad }) {
  const { recientes, hoy } = actividad
  return (
    <Tarjeta
      titulo="Actividad reciente"
      extra={
        <Link to="/app/bitacora" className="font-semibold text-marca hover:underline">
          Ver bitácora completa
        </Link>
      }
    >
      <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Eventos hoy', hoy.eventos, 'text-tinta'],
          ['Ingresos hoy', hoy.ingresos, 'text-marca'],
          ['Fallidos hoy', hoy.fallidos, hoy.fallidos ? 'text-alerta' : 'text-tinta'],
        ].map(([k, v, tono]) => (
          <div key={k} className="rounded-xl bg-papel px-2 py-2.5">
            <dt className="text-xs text-pizarra">{k}</dt>
            <dd className={`cifras text-lg font-bold ${tono}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {recientes.length === 0 ? (
        <p className="py-6 text-center text-sm text-pizarra">Sin movimientos registrados aún.</p>
      ) : (
        <ol className="space-y-2">
          {recientes.map((e) => {
            const ev = describirEvento(e)
            return (
              <li key={e.id} className="flex gap-3 rounded-xl border border-linea p-2.5">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${TONOS[ev.tono]}`}
                >
                  <Icono nombre={ev.icono} className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ev.texto}</p>
                  <p className="truncate text-xs text-pizarra">
                    {nombreCompleto(e) || 'Sistema'} ·{' '}
                    <time dateTime={e.fecha} title={formatoFechaHora(e.fecha)}>
                      {formatoRelativo(e.fecha)}
                    </time>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Tarjeta>
  )
}
