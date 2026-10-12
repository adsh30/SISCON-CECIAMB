import { Link } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useCuentas } from '../../api/cuentas.js'
import { useLibro } from '../../api/libros.js'
import { AccountPicker } from '../../components/ui/AccountPicker.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { esCero } from '../../lib/comprobantes.js'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'
import { BotonesExportar, FiltrosLibro, Paginacion, TotalesLibro } from './ComponentesLibro.jsx'
import { esNegativo, useFiltrosLibro } from './filtros.js'

const CLAVES = ['desde', 'hasta', 'tipoId', 'centroCostoId', 'cuentaDesde', 'cuentaHasta']

/** ¿`codigo` va después de `hasta` en el plan (sin ser subcuenta suya)? */
const despuesDe = (codigo, hasta) => codigo > hasta && !codigo.startsWith(`${hasta}.`)

function Saldo({ valor, className = '' }) {
  // Saldo negativo = contrario a la naturaleza de la cuenta: se resalta
  return (
    <span className={`cifras ${esNegativo(valor) ? 'text-alerta' : ''} ${className}`}>
      {formatoMonto(valor)}
    </span>
  )
}

function FiltroCuentas({ filtros, cambiar }) {
  // Misma consulta que usa el selector: comparte la caché
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
            // Elegir solo la primera cuenta consulta esa cuenta (y sus subcuentas)
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

function CuentaMayor({ c, verComprobantes }) {
  return (
    <section className="overflow-hidden rounded-xl border border-linea bg-superficie">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea bg-superficie-2/60 px-4 py-3">
        <h2 className="font-semibold">
          <span className="cifras text-marca">{c.cuenta.codigo}</span> {c.cuenta.nombre}
        </h2>
        <Insignia tono={c.cuenta.naturaleza === 'DEUDORA' ? 'marca' : 'neutro'}>
          Naturaleza {c.cuenta.naturaleza === 'DEUDORA' ? 'deudora' : 'acreedora'}
        </Insignia>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-pizarra">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Comprobante</th>
              <th className="px-4 py-2 font-medium">Concepto</th>
              <th className="px-4 py-2 font-medium">C. costo</th>
              <th className="px-4 py-2 text-right font-medium">Debe</th>
              <th className="px-4 py-2 text-right font-medium">Haber</th>
              <th className="px-4 py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-linea">
              <td colSpan={6} className="px-4 py-1.5 text-right font-medium text-pizarra">
                Saldo anterior
              </td>
              <td className="px-4 py-1.5 text-right font-semibold">
                <Saldo valor={c.saldoAnterior} />
              </td>
            </tr>
            {c.movimientos.length === 0 && (
              <tr className="border-t border-linea/60">
                <td colSpan={7} className="px-4 py-2 text-center text-pizarra">
                  Sin movimientos en el rango.
                </td>
              </tr>
            )}
            {c.movimientos.map((m, i) => (
              <tr key={`${m.comprobanteId}-${i}`} className="border-t border-linea/60 align-top">
                <td className="cifras px-4 py-1.5 whitespace-nowrap">{formatoFecha(m.fecha)}</td>
                <td className="px-4 py-1.5 whitespace-nowrap">
                  {verComprobantes ? (
                    <Link
                      to={`/app/comprobantes/${m.comprobanteId}`}
                      className="cifras text-marca hover:underline"
                    >
                      {m.comprobante}
                    </Link>
                  ) : (
                    <span className="cifras">{m.comprobante}</span>
                  )}
                </td>
                <td className="px-4 py-1.5">
                  {m.concepto}
                  {m.descripcion && (
                    <span className="block text-xs text-pizarra">{m.descripcion}</span>
                  )}
                </td>
                <td className="px-4 py-1.5 text-pizarra">{m.centroCodigo}</td>
                <td className="cifras px-4 py-1.5 text-right">
                  {esCero(m.debe) ? '' : formatoMonto(m.debe)}
                </td>
                <td className="cifras px-4 py-1.5 text-right">
                  {esCero(m.haber) ? '' : formatoMonto(m.haber)}
                </td>
                <td className="px-4 py-1.5 text-right">
                  <Saldo valor={m.saldo} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-tinta/20 font-bold">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right">
                Totales y saldo final
              </td>
              <td className="cifras px-4 py-2 text-right">{formatoMonto(c.totalDebe)}</td>
              <td className="cifras px-4 py-2 text-right">{formatoMonto(c.totalHaber)}</td>
              <td className="px-4 py-2 text-right">
                <Saldo valor={c.saldoFinal} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

/** Libro Mayor (RF-06.2): por cuenta, saldo anterior, movimientos y saldo acumulado */
export default function LibroMayorPage() {
  const [filtros, cambiar] = useFiltrosLibro(CLAVES)
  const { data, isPending, isError, error, isFetching } = useLibro('mayor', filtros)
  const { can } = usePermisos()

  const cuentas = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro Mayor</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Cada cuenta con su saldo anterior, sus movimientos y el saldo acumulado renglón por
            renglón. Las cuentas deudoras suman el Debe; las acreedoras, el Haber.
          </p>
        </div>
        <BotonesExportar libro="mayor" filtros={filtros} deshabilitado={!meta?.total} />
      </div>

      <FiltrosLibro filtros={filtros} cambiar={cambiar}>
        <FiltroCuentas filtros={filtros} cambiar={cambiar} />
      </FiltrosLibro>
      <TotalesLibro
        meta={meta}
        unidad="Cuentas"
        etiquetaRenglones="Movimientos"
        // El mayor completo cuadra; una cuenta o un centro de costo por separado, no
        verificarCuadre={!filtros.centroCostoId && !filtros.cuentaDesde && !filtros.cuentaHasta}
      />

      <div className={`mt-4 space-y-4 ${isFetching && !isPending ? 'opacity-60' : ''}`}>
        {isPending && (
          <p className="rounded-xl border border-linea bg-superficie px-4 py-10 text-center text-pizarra">
            Cargando el libro…
          </p>
        )}
        {isError && !data && (
          <p className="rounded-xl border border-linea bg-superficie px-4 py-10 text-center text-alerta">
            {error.message}
          </p>
        )}
        {!isPending && !isError && cuentas.length === 0 && (
          <p className="rounded-xl border border-linea bg-superficie px-4 py-10 text-center text-pizarra">
            Ninguna cuenta tiene movimientos ni saldo en este rango.
          </p>
        )}
        {cuentas.map((c) => (
          <CuentaMayor key={c.cuenta.id} c={c} verComprobantes={can('comprobantes')} />
        ))}
      </div>

      <Paginacion
        meta={meta}
        filtros={filtros}
        cambiar={cambiar}
        cantidad={cuentas.length}
        unidad="cuentas"
      />
    </div>
  )
}
