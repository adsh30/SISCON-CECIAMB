import { Link, useNavigate } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { Button } from '../../components/ui/Button.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { Tarjeta } from './Tarjeta.jsx'
import { formatoEntero, formatoFecha, formatoMonto } from '../../lib/formato.js'

const COLORES_CATEGORIA = {
  VEN: 'bg-blue-500',
  COM: 'bg-emerald-500',
  HON: 'bg-amber-500',
  NOM: 'bg-purple-500',
  DIA: 'bg-slate-500',
  AJU: 'bg-rose-500',
  ING: 'bg-teal-500',
  EGR: 'bg-orange-500',
}

/**
 * Tablero contable de inicio (RF-09):
 * Presenta el resumen del mes en curso, comprobantes por categoría,
 * borradores pendientes de aprobación, últimos aprobados y accesos directos.
 */
export function DashboardContable({ comprobantes: c }) {
  const navigate = useNavigate()
  const { can } = usePermisos()
  const puedeEscribir = can('comprobantes', 'escritura')
  const puedeLibros = can('libros', 'lectura')

  if (!c) return null

  const totalMontoNum = Number(c.totalMovilizadoMes || 0)

  return (
    <div className="mt-6 space-y-4">
      {/* Tarjeta principal de resumen contable */}
      <Tarjeta
        titulo="Operación contable del mes"
        subtitulo="Comprobantes registrados, distribución por categoría y últimos movimientos aprobados"
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            {puedeEscribir && (
              <Button
                variante="primario"
                tamano="sm"
                onClick={() => navigate('/app/comprobantes/nuevo')}
              >
                <Icono nombre="mas" className="size-4" />
                Nuevo comprobante
              </Button>
            )}
            {puedeEscribir && (
              <Button
                variante="secundario"
                tamano="sm"
                onClick={() => navigate('/app/comprobantes/importar')}
              >
                <Icono nombre="archivo" className="size-4" />
                Importar CSV
              </Button>
            )}
            {puedeLibros && (
              <Button
                variante="secundario"
                tamano="sm"
                onClick={() => navigate('/app/libros/diario')}
              >
                <Icono nombre="libros" className="size-4" />
                Libro Diario
              </Button>
            )}
          </div>
        }
      >
        {/* Métricas destacadas */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-linea bg-superficie-2/50 p-4">
            <span className="text-xs font-medium text-pizarra">Total movilizado (mes)</span>
            <p className="cifras mt-1 text-xl font-bold tracking-tight text-tinta">
              Bs {formatoMonto(c.totalMovilizadoMes)}
            </p>
            <p className="mt-1 text-xs text-pizarra">En comprobantes aprobados</p>
          </div>

          <div className="rounded-xl border border-linea bg-superficie-2/50 p-4">
            <span className="text-xs font-medium text-pizarra">Comprobantes aprobados</span>
            <p className="cifras mt-1 text-xl font-bold tracking-tight text-exito">
              {formatoEntero(c.aprobadosMes)}
            </p>
            <Link
              to="/app/comprobantes?estado=APROBADO"
              className="mt-1 text-xs text-marca hover:underline inline-block"
            >
              Ver aprobados →
            </Link>
          </div>

          <div
            className={`rounded-xl border p-4 transition-colors ${
              c.borradores > 0
                ? 'border-aviso/40 bg-aviso-claro/40'
                : 'border-linea bg-superficie-2/50'
            }`}
          >
            <span className="text-xs font-medium text-pizarra">Borradores pendientes</span>
            <p
              className={`cifras mt-1 text-xl font-bold tracking-tight ${
                c.borradores > 0 ? 'text-aviso' : 'text-tinta'
              }`}
            >
              {formatoEntero(c.borradores)}
            </p>
            <Link
              to="/app/comprobantes?estado=BORRADOR"
              className="mt-1 text-xs font-medium text-marca hover:underline inline-block"
            >
              Revisar borradores →
            </Link>
          </div>

          <div className="rounded-xl border border-linea bg-superficie-2/50 p-4">
            <span className="text-xs font-medium text-pizarra">Anulados del mes</span>
            <p className="cifras mt-1 text-xl font-bold tracking-tight text-pizarra">
              {formatoEntero(c.anuladosMes)}
            </p>
            <Link
              to="/app/comprobantes?estado=ANULADO"
              className="mt-1 text-xs text-marca hover:underline inline-block"
            >
              Ver historial anulados →
            </Link>
          </div>
        </div>

        {/* Distribución por categoría y últimos movimientos */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Columna izquierda: Categorías */}
          <div>
            <h3 className="text-sm font-semibold text-tinta">
              Distribución por categoría (Aprobados)
            </h3>
            {c.porCategoria?.length > 0 ? (
              <div className="mt-3 space-y-2.5">
                {c.porCategoria.map((cat) => {
                  const montoNum = Number(cat.monto || 0)
                  const porcentaje =
                    totalMontoNum > 0 ? ((montoNum / totalMontoNum) * 100).toFixed(1) : 0
                  const colorBarra = COLORES_CATEGORIA[cat.codigo] || 'bg-marca'

                  return (
                    <div key={cat.tipoId} className="rounded-lg p-2 hover:bg-superficie-2/50 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`size-2.5 rounded-full ${colorBarra}`} />
                          <span className="font-semibold text-tinta">{cat.nombre}</span>
                          <span className="text-pizarra">({cat.cantidad})</span>
                        </div>
                        <div className="cifras flex items-center gap-2 font-medium">
                          <span className="text-tinta">Bs {formatoMonto(cat.monto)}</span>
                          <span className="text-pizarra text-[11px] w-12 text-right">
                            {porcentaje}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-linea overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colorBarra}`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs text-pizarra">
                No hay comprobantes aprobados en este período todavía.
              </p>
            )}
          </div>

          {/* Columna derecha: Últimos aprobados */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-tinta">Últimos comprobantes aprobados</h3>
              <Link to="/app/comprobantes" className="text-xs text-marca hover:underline">
                Ver todos →
              </Link>
            </div>

            {c.ultimosAprobados?.length > 0 ? (
              <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea">
                {c.ultimosAprobados.map((u) => (
                  <li key={u.id} className="p-3 text-xs hover:bg-superficie-2/50 transition-colors">
                    <Link to={`/app/comprobantes/${u.id}`} className="block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="cifras font-mono font-semibold text-marca">
                          {u.codigo}
                        </span>
                        <span className="cifras font-semibold text-tinta">
                          Bs {formatoMonto(u.monto)}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-medium text-tinta" title={u.concepto}>
                        {u.concepto}
                      </p>
                      <p className="mt-0.5 text-pizarra">
                        {u.tipoNombre} · {formatoFecha(u.fecha)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-pizarra">
                No hay movimientos aprobados recientemente.
              </p>
            )}
          </div>
        </div>
      </Tarjeta>
    </div>
  )
}

