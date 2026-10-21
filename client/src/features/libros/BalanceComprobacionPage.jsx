import { Link } from 'react-router'
import { useCuentas } from '../../api/cuentas.js'
import { useBalance } from '../../api/libros.js'
import { AccountPicker } from '../../components/ui/AccountPicker.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoEntero, formatoMonto } from '../../lib/formato.js'
import { BotonesExportar, FiltrosLibro, Paginacion } from './ComponentesLibro.jsx'
import { useFiltrosLibro } from './filtros.js'

const CLAVES = [
  'desde',
  'hasta',
  'tipoId',
  'centroCostoId',
  'cuentaDesde',
  'cuentaHasta',
  'modo',
  'incluirCeros',
]

const despuesDe = (codigo, hasta) => codigo > hasta && !codigo.startsWith(`${hasta}.`)

function FiltroCuentas({ filtros, cambiar }) {
  const { data: cuentas = [] } = useCuentas({ soloMovimiento: undefined, soloActivas: undefined })
  const idDe = (codigo) => cuentas.find((c) => c.codigo === codigo)?.id ?? null

  return (
    <>
      <div className="text-sm text-pizarra">
        <span className="mb-1 block">Desde la cuenta</span>
        <AccountPicker
          aria-label="Desde la cuenta"
          value={idDe(filtros.cuentaDesde)}
          soloMovimiento={false}
          soloActivas={false}
          placeholder="Primera cuenta…"
          onChange={(c) => {
            const codigo = c?.codigo ?? ''
            const hasta =
              codigo && (!filtros.cuentaHasta || despuesDe(codigo, filtros.cuentaHasta))
                ? codigo
                : filtros.cuentaHasta
            cambiar({ cuentaDesde: codigo, cuentaHasta: hasta })
          }}
        />
      </div>
      <div className="text-sm text-pizarra">
        <span className="mb-1 block">Hasta la cuenta</span>
        <div className="flex gap-2">
          <AccountPicker
            aria-label="Hasta la cuenta"
            value={idDe(filtros.cuentaHasta)}
            soloMovimiento={false}
            soloActivas={false}
            placeholder="Última cuenta…"
            className="flex-1"
            onChange={(c) => {
              const codigo = c?.codigo ?? ''
              const desde =
                codigo && filtros.cuentaDesde && despuesDe(filtros.cuentaDesde, codigo)
                  ? codigo
                  : filtros.cuentaDesde
              cambiar({ cuentaHasta: codigo, cuentaDesde: desde })
            }}
          />
          {(filtros.cuentaDesde || filtros.cuentaHasta) && (
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => cambiar({ cuentaDesde: '', cuentaHasta: '' })}
            >
              Todas
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function MontoCol({ valor, esGrupo }) {
  const num = Number(valor || 0)
  if (num === 0) {
    return <span className="text-pizarra/35 font-mono">—</span>
  }
  return (
    <span className={`cifras font-mono ${esGrupo ? 'font-semibold text-tinta' : 'text-tinta'}`}>
      {formatoMonto(valor)}
    </span>
  )
}

export default function BalanceComprobacionPage() {
  const [filtros, cambiar] = useFiltrosLibro(CLAVES)
  const { data: respuesta, isPending, isError } = useBalance(filtros)

  const items = respuesta?.data ?? []
  const meta = respuesta?.meta
  const totales = meta?.totales

  const modo = filtros.modo || 'movimiento'
  const incluirCeros = filtros.incluirCeros === 'true'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">Balance de Comprobación</h1>
          <p className="mt-0.5 text-sm text-pizarra">
            Comprobación de sumas y saldos a 8 columnas · Verificación estricta de partida doble
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-linea bg-superficie-2/70 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => cambiar({ modo: 'movimiento' })}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                modo === 'movimiento'
                  ? 'bg-superficie text-tinta shadow-xs font-semibold'
                  : 'text-pizarra hover:text-tinta'
              }`}
            >
              Solo movimientos
            </button>
            <button
              type="button"
              onClick={() => cambiar({ modo: 'completo' })}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                modo === 'completo'
                  ? 'bg-superficie text-tinta shadow-xs font-semibold'
                  : 'text-pizarra hover:text-tinta'
              }`}
            >
              Árbol completo
            </button>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-xs text-pizarra cursor-pointer hover:bg-superficie-2 transition-colors">
            <input
              type="checkbox"
              checked={incluirCeros}
              onChange={(e) => cambiar({ incluirCeros: e.target.checked ? 'true' : '' })}
              className="accent-marca rounded"
            />
            <span>Incluir cuentas en cero</span>
          </label>

          <BotonesExportar
            libro="balance"
            filtros={filtros}
            deshabilitado={isPending || isError || !items.length}
          />
        </div>
      </div>

      <FiltrosLibro filtros={filtros} cambiar={cambiar}>
        <FiltroCuentas filtros={filtros} cambiar={cambiar} />
      </FiltrosLibro>

      {/* Tarjetas de Verificación de Cuadre */}
      {totales && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div
            className={`rounded-xl border p-4 transition-colors ${
              totales.cuadradoAnterior
                ? 'border-linea bg-superficie'
                : 'border-alerta/40 bg-alerta-claro/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-pizarra">1. Saldos Anteriores</span>
              <Insignia tono={totales.cuadradoAnterior ? 'exito' : 'alerta'}>
                {totales.cuadradoAnterior ? '✓ Cuadrado' : '✗ Descuadrado'}
              </Insignia>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-xs text-pizarra">Deudor: Bs {formatoMonto(totales.saldoAnteriorDeudor)}</span>
              <span className="text-xs text-pizarra">Acreedor: Bs {formatoMonto(totales.saldoAnteriorAcreedor)}</span>
            </div>
            {!totales.cuadradoAnterior && (
              <p className="mt-1 text-xs font-semibold text-alerta">
                Diferencia: Bs {formatoMonto(totales.diferenciaAnterior)}
              </p>
            )}
          </div>

          <div
            className={`rounded-xl border p-4 transition-colors ${
              totales.cuadradoMovimientos
                ? 'border-linea bg-superficie'
                : 'border-alerta/40 bg-alerta-claro/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-pizarra">2. Movimientos del Mes</span>
              <Insignia tono={totales.cuadradoMovimientos ? 'exito' : 'alerta'}>
                {totales.cuadradoMovimientos ? '✓ Cuadrado' : '✗ Descuadrado'}
              </Insignia>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-xs text-pizarra">Debe: Bs {formatoMonto(totales.movimientoDebe)}</span>
              <span className="text-xs text-pizarra">Haber: Bs {formatoMonto(totales.movimientoHaber)}</span>
            </div>
            {!totales.cuadradoMovimientos && (
              <p className="mt-1 text-xs font-semibold text-alerta">
                Diferencia: Bs {formatoMonto(totales.diferenciaMovimientos)}
              </p>
            )}
          </div>

          <div
            className={`rounded-xl border p-4 transition-colors ${
              totales.cuadradoActual
                ? 'border-linea bg-superficie'
                : 'border-alerta/40 bg-alerta-claro/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-pizarra">3. Saldos Actuales</span>
              <Insignia tono={totales.cuadradoActual ? 'exito' : 'alerta'}>
                {totales.cuadradoActual ? '✓ Cuadrado' : '✗ Descuadrado'}
              </Insignia>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-xs text-pizarra">Deudor: Bs {formatoMonto(totales.saldoActualDeudor)}</span>
              <span className="text-xs text-pizarra">Acreedor: Bs {formatoMonto(totales.saldoActualAcreedor)}</span>
            </div>
            {!totales.cuadradoActual && (
              <p className="mt-1 text-xs font-semibold text-alerta">
                Diferencia: Bs {formatoMonto(totales.diferenciaActual)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabla del Balance a 8 Columnas */}
      <div className="overflow-hidden rounded-2xl border border-linea bg-superficie shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-xs">
            <thead>
              <tr className="border-b border-linea bg-superficie-2/80 text-tinta font-semibold text-center">
                <th colSpan={2} className="px-3 py-2 text-left border-r border-linea">
                  Identificación de la Cuenta
                </th>
                <th colSpan={2} className="px-3 py-2 border-r border-linea">
                  Saldos Anteriores
                </th>
                <th colSpan={2} className="px-3 py-2 border-r border-linea">
                  Movimientos del Período
                </th>
                <th colSpan={2} className="px-3 py-2">
                  Saldos Actuales
                </th>
              </tr>
              <tr className="border-b border-linea bg-superficie text-pizarra text-left">
                <th className="px-3 py-2 w-36 font-semibold">Código</th>
                <th className="px-3 py-2 border-r border-linea font-semibold">Nombre de la Cuenta</th>
                <th className="px-3 py-2 text-right w-32 font-semibold">Deudor</th>
                <th className="px-3 py-2 text-right w-32 border-r border-linea font-semibold">Acreedor</th>
                <th className="px-3 py-2 text-right w-32 font-semibold">Debe</th>
                <th className="px-3 py-2 text-right w-32 border-r border-linea font-semibold">Haber</th>
                <th className="px-3 py-2 text-right w-32 font-semibold">Deudor</th>
                <th className="px-3 py-2 text-right w-32 font-semibold">Acreedor</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-linea">
              {isPending ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-pizarra">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-marca border-t-transparent" />
                      <span>Calculando sumas y saldos del balance…</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-alerta">
                    Ocurrió un error al cargar el Balance de Comprobación. Intente de nuevo.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-pizarra">
                    No se encontraron cuentas con movimientos ni saldos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const esGrupo = !c.esMovimiento
                  const sangria = esGrupo ? (c.nivel - 1) * 14 : c.nivel * 14

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors hover:bg-superficie-2/50 ${
                        esGrupo
                          ? 'bg-superficie-2/30 font-semibold text-tinta'
                          : 'text-tinta'
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.esMovimiento ? (
                          <Link
                            to={`/app/libros/mayor?desde=${filtros.desde}&hasta=${filtros.hasta}&cuentaDesde=${c.codigo}&cuentaHasta=${c.codigo}`}
                            className="font-mono text-marca hover:underline inline-flex items-center gap-1"
                            title="Ver en el Libro Mayor"
                          >
                            <span>{c.codigo}</span>
                            <Icono nombre="mayor" className="size-3 text-pizarra/60" />
                          </Link>
                        ) : (
                          <span className="font-mono text-tinta font-bold">{c.codigo}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-linea">
                        <div
                          style={{ paddingLeft: `${sangria}px` }}
                          className="flex items-center gap-2"
                        >
                          {esGrupo && (
                            <span className="text-[10px] uppercase tracking-wider text-pizarra font-normal">
                              Nivel {c.nivel}
                            </span>
                          )}
                          <span className={esGrupo ? 'font-bold text-tinta' : 'font-medium'}>
                            {c.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MontoCol valor={c.saldoAnteriorDeudor} esGrupo={esGrupo} />
                      </td>
                      <td className="px-3 py-2 text-right border-r border-linea">
                        <MontoCol valor={c.saldoAnteriorAcreedor} esGrupo={esGrupo} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MontoCol valor={c.movimientoDebe} esGrupo={esGrupo} />
                      </td>
                      <td className="px-3 py-2 text-right border-r border-linea">
                        <MontoCol valor={c.movimientoHaber} esGrupo={esGrupo} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MontoCol valor={c.saldoActualDeudor} esGrupo={esGrupo} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MontoCol valor={c.saldoActualAcreedor} esGrupo={esGrupo} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {totales && (
              <tfoot>
                <tr className="border-t-2 border-linea bg-superficie-2/90 font-bold text-tinta">
                  <td colSpan={2} className="px-3 py-3 text-right border-r border-linea text-xs">
                    Totales y Sumas Iguales ({formatoEntero(meta?.total ?? 0)} cuentas):
                  </td>
                  <td className="cifras px-3 py-3 text-right font-mono">
                    Bs {formatoMonto(totales.saldoAnteriorDeudor)}
                  </td>
                  <td className="cifras px-3 py-3 text-right font-mono border-r border-linea">
                    Bs {formatoMonto(totales.saldoAnteriorAcreedor)}
                  </td>
                  <td className="cifras px-3 py-3 text-right font-mono">
                    Bs {formatoMonto(totales.movimientoDebe)}
                  </td>
                  <td className="cifras px-3 py-3 text-right font-mono border-r border-linea">
                    Bs {formatoMonto(totales.movimientoHaber)}
                  </td>
                  <td className="cifras px-3 py-3 text-right font-mono">
                    Bs {formatoMonto(totales.saldoActualDeudor)}
                  </td>
                  <td className="cifras px-3 py-3 text-right font-mono">
                    Bs {formatoMonto(totales.saldoActualAcreedor)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Paginacion
        meta={meta}
        filtros={filtros}
        cambiar={cambiar}
        cantidad={items.length}
        unidad="cuentas"
      />
    </div>
  )
}

