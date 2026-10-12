import { Fragment } from 'react'
import { Link } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useLibro } from '../../api/libros.js'
import { esCero } from '../../lib/comprobantes.js'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'
import { BotonesExportar, FiltrosLibro, Paginacion, TotalesLibro } from './ComponentesLibro.jsx'
import { useFiltrosLibro } from './filtros.js'

const CLAVES = ['desde', 'hasta', 'tipoId', 'centroCostoId']

/** Libro Diario (RF-06.1): comprobantes aprobados en orden cronológico */
export default function LibroDiarioPage() {
  const [filtros, cambiar] = useFiltrosLibro(CLAVES)
  const { data, isPending, isError, error, isFetching } = useLibro('diario', filtros)
  const { can } = usePermisos()
  const verComprobantes = can('comprobantes')

  const comprobantes = data?.data ?? []
  const meta = data?.meta
  const vacio = !isPending && !isError && comprobantes.length === 0

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro Diario</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Los comprobantes aprobados en orden cronológico, con cada renglón y los totales de Debe
            y Haber. Los borradores y los anulados no forman parte del libro.
          </p>
        </div>
        <BotonesExportar libro="diario" filtros={filtros} deshabilitado={!meta?.total} />
      </div>

      <FiltrosLibro filtros={filtros} cambiar={cambiar} />
      <TotalesLibro
        meta={meta}
        unidad="Comprobantes"
        etiquetaRenglones="Renglones"
        // Con un centro de costo solo se ven sus renglones: no tienen por qué cuadrar
        verificarCuadre={!filtros.centroCostoId}
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-papel text-left text-pizarra">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cuenta</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">C. costo</th>
              <th className="px-4 py-3 text-right font-medium">Debe (Bs)</th>
              <th className="px-4 py-3 text-right font-medium">Haber (Bs)</th>
            </tr>
          </thead>
          <tbody className={isFetching && !isPending ? 'opacity-60' : ''}>
            {isPending && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-pizarra">
                  Cargando el libro…
                </td>
              </tr>
            )}
            {isError && !data && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-alerta">
                  {error.message}
                </td>
              </tr>
            )}
            {vacio && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-pizarra">
                  No hay comprobantes aprobados en este rango.
                </td>
              </tr>
            )}
            {comprobantes.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-t-2 border-linea bg-superficie-2/60">
                  <td className="cifras px-4 py-2 font-semibold whitespace-nowrap">
                    {formatoFecha(c.fecha)}
                  </td>
                  <td colSpan={5} className="px-4 py-2">
                    {verComprobantes ? (
                      <Link
                        to={`/app/comprobantes/${c.id}`}
                        className="cifras font-semibold text-marca hover:underline"
                      >
                        {c.codigo}
                      </Link>
                    ) : (
                      <span className="cifras font-semibold">{c.codigo}</span>
                    )}
                    <span className="ml-3 font-medium">{c.concepto}</span>
                    {c.referencia && (
                      <span className="ml-2 text-xs text-pizarra">Ref. {c.referencia}</span>
                    )}
                  </td>
                </tr>
                {c.renglones.map((r) => (
                  <tr key={r.renglon} className="border-t border-linea/60 align-top">
                    <td />
                    {/* Las cuentas al Haber van con sangría, como en el libro impreso */}
                    <td className={`py-1.5 pr-4 ${esCero(r.debe) ? 'pl-12' : 'pl-4'}`}>
                      <span className="cifras text-pizarra">{r.cuentaCodigo}</span> {r.cuentaNombre}
                    </td>
                    <td className="px-4 py-1.5 text-pizarra">{r.descripcion}</td>
                    <td className="px-4 py-1.5 text-pizarra">{r.centroCodigo}</td>
                    <td className="cifras px-4 py-1.5 text-right">
                      {esCero(r.debe) ? '' : formatoMonto(r.debe)}
                    </td>
                    <td className="cifras px-4 py-1.5 text-right">
                      {esCero(r.haber) ? '' : formatoMonto(r.haber)}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          {meta?.total > 0 && (
            <tfoot className="border-t-2 border-tinta/30 font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">
                  Totales del rango
                </td>
                <td className="cifras px-4 py-3 text-right">{formatoMonto(meta.totales.debe)}</td>
                <td className="cifras px-4 py-3 text-right">{formatoMonto(meta.totales.haber)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Paginacion
        meta={meta}
        filtros={filtros}
        cambiar={cambiar}
        cantidad={comprobantes.length}
        unidad="comprobantes"
      />
    </div>
  )
}
