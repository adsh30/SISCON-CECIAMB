import { Link } from 'react-router'
import { useEstadoResultados } from '../../api/libros.js'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'
import { BotonesExportar, FiltrosLibro } from './ComponentesLibro.jsx'
import { useFiltrosLibro } from './filtros.js'

const CLAVES = ['desde', 'hasta', 'tipoId', 'centroCostoId', 'nivel', 'incluirCeros']

function MontoItem({ valor, esGrupo, esTotal }) {
  const num = Number(valor || 0)
  if (num === 0 && !esTotal) {
    return <span className="text-pizarra/35 font-mono">—</span>
  }
  return (
    <span
      className={`cifras font-mono ${
        esTotal
          ? 'font-bold text-tinta text-base'
          : esGrupo
            ? 'font-semibold text-tinta'
            : 'text-tinta/90'
      }`}
    >
      {formatoMonto(valor)}
    </span>
  )
}

function TablaGrupo({ titulo, seccion, etiquetaTotal }) {
  const cuentas = seccion?.cuentas ?? []
  return (
    <div className="rounded-2xl border border-linea bg-superficie shadow-xs overflow-hidden">
      <div className="flex items-center justify-between border-b border-linea bg-superficie-2/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-marca/10 text-marca">
            {seccion?.codigo}
          </span>
          <h2 className="font-bold text-tinta tracking-tight">{titulo}</h2>
        </div>
        <div className="text-right">
          <span className="text-xs text-pizarra mr-2">Total</span>
          <span className="font-mono font-bold text-tinta text-sm">
            {formatoMonto(seccion?.total)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-linea bg-superficie-2/30 text-xs text-pizarra">
              <th className="py-2 px-3 font-semibold w-32">Código</th>
              <th className="py-2 px-3 font-semibold">Concepto / Denominación</th>
              <th className="py-2 px-3 font-semibold text-right w-44">Monto (Bs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea/60">
            {cuentas
              .filter((c) => c.codigo !== seccion?.codigo)
              .map((c) => {
                const esGrupo = !c.esMovimiento
                const sangria = esGrupo ? (c.nivel - 1) * 16 : c.nivel * 16
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-superficie-2/40 transition-colors ${
                      esGrupo ? 'bg-superficie-2/20 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-xs text-pizarra whitespace-nowrap">
                      {c.codigo}
                    </td>
                    <td className="py-2 px-3">
                      <div style={{ paddingLeft: `${sangria}px` }} className="flex items-center gap-2">
                        <span>{c.nombre}</span>
                        {c.esMovimiento && (
                          <Link
                            to={`/app/libros/mayor?cuentaDesde=${c.codigo}&cuentaHasta=${c.codigo}`}
                            title="Ver en Libro Mayor"
                            className="opacity-0 hover:opacity-100 text-marca transition-opacity p-0.5 rounded hover:bg-marca/10"
                          >
                            <Icono nombre="mayor" className="size-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <MontoItem valor={c.saldo} esGrupo={esGrupo} />
                    </td>
                  </tr>
                )
              })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-linea bg-superficie-2/70 font-bold text-tinta">
              <td colSpan={2} className="py-2.5 px-3 text-right">
                {etiquetaTotal || `TOTAL ${titulo}`}:
              </td>
              <td className="py-2.5 px-3 text-right">
                <MontoItem valor={seccion?.total} esTotal />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function EstadoResultadosPage() {
  const [filtros, cambiar] = useFiltrosLibro(CLAVES)
  const { data: respuesta, isPending, isError } = useEstadoResultados(filtros)

  const data = respuesta?.data
  const totales = data?.totales

  const nivel = filtros.nivel || ''
  const incluirCeros = filtros.incluirCeros === 'true'

  // Margen bruto porcentual
  const ingresosNum = Number(totales?.totalIngresos || 0)
  const utilidadBrutaNum = Number(totales?.utilidadBruta || 0)
  const utilidadNetaNum = Number(totales?.utilidadNeta || 0)
  const margenBrutoPct = ingresosNum > 0 ? ((utilidadBrutaNum / ingresosNum) * 100).toFixed(1) : '0.0'
  const margenNetoPct = ingresosNum > 0 ? ((utilidadNetaNum / ingresosNum) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">Estado de Resultados</h1>
          <p className="mt-0.5 text-sm text-pizarra">
            Rendimiento financiero (Ganancias y Pérdidas) del{' '}
            <span className="font-semibold text-tinta">{formatoFecha(filtros.desde)}</span> al{' '}
            <span className="font-semibold text-tinta">{formatoFecha(filtros.hasta)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de nivel */}
          <div className="flex items-center gap-2 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-xs text-pizarra">
            <span>Nivel:</span>
            <select
              value={nivel}
              onChange={(e) => cambiar({ nivel: e.target.value })}
              className="bg-transparent font-medium text-tinta focus:outline-hidden cursor-pointer"
            >
              <option value="">Todas las cuentas</option>
              <option value="1">Nivel 1 (Grupos)</option>
              <option value="2">Nivel 2 (Subgrupos)</option>
              <option value="3">Nivel 3 (Cuentas)</option>
            </select>
          </div>

          {/* Toggle ceros */}
          <label className="flex items-center gap-2 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-xs text-pizarra cursor-pointer hover:bg-superficie-2 transition-colors">
            <input
              type="checkbox"
              checked={incluirCeros}
              onChange={(e) => cambiar({ incluirCeros: e.target.checked ? 'true' : '' })}
              className="accent-marca rounded"
            />
            <span>Incluir ceros</span>
          </label>

          <BotonesExportar
            libro="estado-resultados"
            filtros={filtros}
            deshabilitado={isPending || isError || !data}
          />
        </div>
      </div>

      {/* Filtros */}
      <FiltrosLibro filtros={filtros} cambiar={cambiar} />

      {/* Tarjetas KPI de Rendimiento */}
      {totales && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <span className="text-xs font-medium text-pizarra">Total Ingresos</span>
            <p className="mt-1 font-mono text-xl font-bold text-tinta">
              {formatoMonto(totales.totalIngresos)} <span className="text-xs font-normal">Bs</span>
            </p>
            <span className="mt-1 block text-xs text-pizarra/80">Servicios hospitalarios</span>
          </div>

          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <span className="text-xs font-medium text-pizarra">Total Costos</span>
            <p className="mt-1 font-mono text-xl font-bold text-tinta">
              {formatoMonto(totales.totalCostos)} <span className="text-xs font-normal">Bs</span>
            </p>
            <span className="mt-1 block text-xs text-pizarra/80">Costos asistenciales</span>
          </div>

          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-pizarra">Utilidad Bruta</span>
              <span className="font-mono text-xs font-semibold text-marca">{margenBrutoPct}%</span>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-marca">
              {formatoMonto(totales.utilidadBruta)} <span className="text-xs font-normal">Bs</span>
            </p>
            <span className="mt-1 block text-xs text-pizarra/80">Margen de operación</span>
          </div>

          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <span className="text-xs font-medium text-pizarra">Total Gastos</span>
            <p className="mt-1 font-mono text-xl font-bold text-tinta">
              {formatoMonto(totales.totalGastos)} <span className="text-xs font-normal">Bs</span>
            </p>
            <span className="mt-1 block text-xs text-pizarra/80">Operación y administración</span>
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between ${
              totales.esUtilidad
                ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tinta">
                {totales.esUtilidad ? 'Utilidad Neta' : 'Pérdida Neta'}
              </span>
              <Insignia variante={totales.esUtilidad ? 'verde' : 'rojo'}>
                {totales.esUtilidad ? 'Superávit' : 'Déficit'}
              </Insignia>
            </div>
            <div className="mt-1">
              <p
                className={`font-mono text-xl font-bold ${
                  totales.esUtilidad ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {formatoMonto(totales.utilidadNeta)} <span className="text-xs font-normal">Bs</span>
              </p>
              <span className="text-xs text-pizarra/90 font-mono">Margen neto: {margenNetoPct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Estados de carga / error */}
      {isPending && (
        <div className="rounded-2xl border border-linea bg-superficie p-12 text-center text-pizarra">
          <p className="animate-pulse">Calculando ingresos, costos y resultados del período…</p>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-alerta-linea bg-alerta-claro p-6 text-center text-alerta-texto">
          <p className="font-semibold">No se pudo cargar el Estado de Resultados.</p>
          <p className="mt-1 text-sm">Verifique el rango de fechas seleccionado.</p>
        </div>
      )}

      {/* Secciones contables */}
      {data && (
        <div className="space-y-6">
          {/* 1. INGRESOS */}
          <TablaGrupo titulo="INGRESOS" seccion={data.ingresos} etiquetaTotal="TOTAL INGRESOS" />

          {/* 2. COSTOS */}
          <TablaGrupo titulo="COSTOS" seccion={data.costos} etiquetaTotal="TOTAL COSTOS" />

          {/* Subtotal: Utilidad Bruta */}
          <div className="rounded-2xl border border-linea bg-superficie-2/50 p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-pizarra">
                Margen Bruto
              </span>
              <span className="text-sm font-semibold text-tinta">
                Ingresos − Costos de Salud
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-pizarra mr-3">Utilidad Bruta:</span>
              <span className="font-mono text-lg font-bold text-marca">
                {formatoMonto(data.utilidadBruta)} Bs
              </span>
            </div>
          </div>

          {/* 3. GASTOS */}
          <TablaGrupo titulo="GASTOS" seccion={data.gastos} etiquetaTotal="TOTAL GASTOS OPERATIVOS" />

          {/* Resultado Final Neto */}
          <div
            className={`rounded-2xl border p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 ${
              totales.esUtilidad
                ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-rose-500/40 bg-rose-50/70 dark:bg-rose-950/30'
            }`}
          >
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-pizarra">
                Resultado Final del Período
              </span>
              <p className="mt-0.5 text-lg font-bold text-tinta">
                {totales.esUtilidad
                  ? 'Utilidad Neta del Ejercicio (Superávit)'
                  : 'Pérdida Neta del Ejercicio (Déficit)'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-pizarra block">Resultado Neto</span>
              <span
                className={`font-mono text-2xl font-bold ${
                  totales.esUtilidad ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {formatoMonto(totales.utilidadNeta)} Bs
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
