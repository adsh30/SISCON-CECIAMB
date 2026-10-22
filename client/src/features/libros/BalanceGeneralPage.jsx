import { Link } from 'react-router'
import { useBalanceGeneral } from '../../api/libros.js'
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

function TablaCuentas({ titulo, seccion, extraRenglon }) {
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
              <th className="py-2 px-3 font-semibold">Cuenta / Denominación</th>
              <th className="py-2 px-3 font-semibold text-right w-44">Saldo (Bs)</th>
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

            {extraRenglon}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-linea bg-superficie-2/70 font-bold text-tinta">
              <td colSpan={2} className="py-2.5 px-3 text-right">
                TOTAL {titulo}:
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

export default function BalanceGeneralPage() {
  const [filtros, cambiar] = useFiltrosLibro(CLAVES)
  const { data: respuesta, isPending, isError } = useBalanceGeneral(filtros)

  const data = respuesta?.data
  const totales = data?.totales

  const nivel = filtros.nivel || ''
  const incluirCeros = filtros.incluirCeros === 'true'

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">Balance General</h1>
          <p className="mt-0.5 text-sm text-pizarra">
            Estado de Situación Financiera clasificado (VEN-NIF) al corte de{' '}
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
            libro="balance-general"
            filtros={filtros}
            deshabilitado={isPending || isError || !data}
          />
        </div>
      </div>

      {/* Filtros */}
      <FiltrosLibro filtros={filtros} cambiar={cambiar} />

      {/* Tarjetas KPI y Cuadre Patrimonial */}
      {totales && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <span className="text-xs font-medium text-pizarra">Total Activo</span>
            <p className="mt-1 font-mono text-xl font-bold text-tinta">
              {formatoMonto(totales.totalActivo)} <span className="text-xs font-normal">Bs</span>
            </p>
            <span className="mt-1 block text-xs text-pizarra/80">Recursos y derechos</span>
          </div>

          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <span className="text-xs font-medium text-pizarra">Total Pasivo</span>
            <p className="mt-1 font-mono text-xl font-bold text-tinta">
              {formatoMonto(totales.totalPasivo)} <span className="text-xs font-normal">Bs</span>
            </p>
            <span className="mt-1 block text-xs text-pizarra/80">Obligaciones y deudas</span>
          </div>

          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            <span className="text-xs font-medium text-pizarra">Total Patrimonio</span>
            <p className="mt-1 font-mono text-xl font-bold text-tinta">
              {formatoMonto(totales.totalPatrimonio)} <span className="text-xs font-normal">Bs</span>
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-pizarra">
              <span>Resultado:</span>
              <span
                className={`font-semibold font-mono ${
                  data.patrimonio.esUtilidad ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatoMonto(data.patrimonio.resultadoEjercicio)} Bs
              </span>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between ${
              totales.cuadrado
                ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tinta">Ecuación Patrimonial</span>
              <Insignia variante={totales.cuadrado ? 'verde' : 'rojo'}>
                {totales.cuadrado ? 'Cuadrado' : 'Descuadre'}
              </Insignia>
            </div>
            <div className="mt-1">
              <p className="text-xs text-pizarra">
                {totales.cuadrado
                  ? 'Activo = Pasivo + Patrimonio'
                  : `Diferencia: ${formatoMonto(totales.diferencia)} Bs`}
              </p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-tinta">
                Pasivo + Pat: {formatoMonto(totales.totalPasivoPatrimonio)} Bs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estados de carga / error */}
      {isPending && (
        <div className="rounded-2xl border border-linea bg-superficie p-12 text-center text-pizarra">
          <p className="animate-pulse">Calculando saldos y estructura del Balance General…</p>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-alerta-linea bg-alerta-claro p-6 text-center text-alerta-texto">
          <p className="font-semibold">No se pudo cargar el Balance General.</p>
          <p className="mt-1 text-sm">Verifique los filtros o el período seleccionado.</p>
        </div>
      )}

      {/* Grillas de Activo, Pasivo y Patrimonio */}
      {data && (
        <div className="space-y-6">
          {/* 1. ACTIVO */}
          <TablaCuentas titulo="ACTIVO" seccion={data.activo} />

          {/* 2. PASIVO */}
          <TablaCuentas titulo="PASIVO" seccion={data.pasivo} />

          {/* 3. PATRIMONIO */}
          <TablaCuentas
            titulo="PATRIMONIO"
            seccion={data.patrimonio}
            extraRenglon={
              <tr className="bg-superficie-2/30 font-semibold border-t border-linea">
                <td className="py-2.5 px-3 font-mono text-xs text-marca">3.2.02</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-tinta">
                      {data.patrimonio.esUtilidad
                        ? 'Utilidad Neta del Ejercicio'
                        : 'Pérdida Neta del Ejercicio'}
                    </span>
                    <Insignia variante={data.patrimonio.esUtilidad ? 'verde' : 'rojo'}>
                      {data.patrimonio.esUtilidad ? 'Superávit' : 'Déficit'}
                    </Insignia>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span
                    className={`font-mono font-bold ${
                      data.patrimonio.esUtilidad ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatoMonto(data.patrimonio.resultadoEjercicio)}
                  </span>
                </td>
              </tr>
            }
          />

          {/* Bloque de verificación y total Pasivo + Patrimonio */}
          <div className="rounded-2xl border border-linea bg-superficie p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-pizarra">
                Consolidación General
              </span>
              <p className="mt-0.5 text-base font-bold text-tinta">
                Total Pasivo y Patrimonio
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs text-pizarra block">Suma Pasivo + Patrimonio</span>
                <span className="font-mono text-xl font-bold text-tinta">
                  {formatoMonto(totales?.totalPasivoPatrimonio)} Bs
                </span>
              </div>
              <div className="text-right border-l border-linea pl-6">
                <span className="text-xs text-pizarra block">Total Activo</span>
                <span className="font-mono text-xl font-bold text-marca">
                  {formatoMonto(totales?.totalActivo)} Bs
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
