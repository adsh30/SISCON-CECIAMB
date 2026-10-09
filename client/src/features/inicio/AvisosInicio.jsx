import { Link } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useEmpresa } from '../../api/empresa.js'
import { Icono } from '../../components/ui/Icono.jsx'

function Aviso({ tono, icono, children, a, accion }) {
  const tonos = {
    normal: 'border-linea bg-superficie',
    aviso: 'border-aviso/30 bg-aviso-claro text-aviso',
  }
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${tonos[tono]}`}
    >
      <Icono nombre={icono} className={`size-5 ${tono === 'normal' ? 'text-marca' : ''}`} />
      <span className="flex-1">{children}</span>
      {a && (
        <Link to={a} className="font-semibold text-marca hover:underline">
          {accion}
        </Link>
      )}
    </div>
  )
}

/** Período contable de hoy, borradores pendientes y datos de la empresa, según el rol */
export function AvisosInicio({ periodoActual, comprobantes }) {
  const { can } = usePermisos()
  const { data: empresa } = useEmpresa({ enabled: can('empresa', 'escritura') })

  return (
    <div className="mt-6 space-y-2 empty:hidden">
      {periodoActual === null && (
        <Aviso tono="aviso" icono="periodos" a="/app/periodos" accion="Ir a Períodos">
          No hay un período contable para hoy: no se podrán registrar comprobantes con esta fecha.
        </Aviso>
      )}
      {periodoActual && (
        <Aviso
          tono="normal"
          icono={periodoActual.estado === 'CERRADO' ? 'candado' : 'periodos'}
          a="/app/periodos"
          accion="Ver períodos"
        >
          Período contable actual: <strong>{periodoActual.nombre}</strong> ·{' '}
          {periodoActual.estado === 'CERRADO' ? 'cerrado' : 'abierto'}
        </Aviso>
      )}
      {comprobantes?.borradores > 0 && (
        <Aviso
          tono="aviso"
          icono="comprobantes"
          a="/app/comprobantes?estado=BORRADOR"
          accion="Ver borradores"
        >
          {comprobantes.borradores === 1
            ? 'Hay 1 comprobante en borrador'
            : `Hay ${comprobantes.borradores} comprobantes en borrador`}{' '}
          pendiente{comprobantes.borradores === 1 ? '' : 's'} de aprobar: no cuentan en los libros
          todavía.
        </Aviso>
      )}
      {empresa && !empresa.completa && (
        <Aviso tono="aviso" icono="edificio" a="/app/empresa" accion="Completar datos">
          Falta el RIF de la empresa: hace falta para imprimir libros y comprobantes.
        </Aviso>
      )}
    </div>
  )
}
