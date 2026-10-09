import { AccountPicker } from '../../components/ui/AccountPicker.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { MontoInput } from '../../components/ui/MontoInput.jsx'
import { esCero, totalesRenglones } from '../../lib/comprobantes.js'
import { renglonVacio } from './renglones.js'

const COLUMNAS =
  'lg:grid lg:grid-cols-[2rem_minmax(15rem,2.2fr)_minmax(8rem,0.9fr)_minmax(10rem,1.6fr)_9.5rem_9.5rem_2.25rem] lg:items-start lg:gap-2'

// Orden en que Enter recorre los campos de un renglón
const CAMPOS = ['cuenta', 'centro', 'desc', 'debe', 'haber']

const idCampo = (clave, campo) => `ren-${clave}-${campo}`

/**
 * Si el campo ya existe se enfoca en el acto, para que un Enter tecleado enseguida caiga en
 * él; si es de un renglón recién agregado, se espera a que React lo pinte.
 */
function enfocar(clave, campo) {
  const el = document.getElementById(idCampo(clave, campo))
  if (el) el.focus()
  else requestAnimationFrame(() => document.getElementById(idCampo(clave, campo))?.focus())
}

/**
 * Grilla de captura de renglones. Teclado: Enter pasa al campo siguiente; en Debe o Haber
 * salta al renglón siguiente y, en el último, agrega uno nuevo con la diferencia por cuadrar.
 */
export function GrillaRenglones({ renglones, onChange, centros, errores = {} }) {
  const actualizar = (clave, cambios) =>
    onChange(renglones.map((r) => (r.clave === clave ? { ...r, ...cambios } : r)))

  const agregar = () => {
    const anterior = renglones.at(-1)
    const { diferencia } = totalesRenglones(renglones)
    // El renglón nuevo trae lo que falta para cuadrar, en la columna contraria
    const falta = diferencia.startsWith('-') ? { debe: diferencia.slice(1) } : { haber: diferencia }
    const nuevo = renglonVacio({
      centroCostoId: anterior?.centroCostoId ?? '',
      descripcion: anterior?.descripcion ?? '',
      ...(diferencia === '0.00' ? {} : falta),
    })
    onChange([...renglones, nuevo])
    enfocar(nuevo.clave, 'cuenta')
  }

  const quitar = (clave) => {
    const quedan = renglones.filter((r) => r.clave !== clave)
    onChange(quedan.length ? quedan : [renglonVacio()])
  }

  const avanzar = (indice, campo) => {
    const r = renglones[indice]
    const siguiente = CAMPOS[CAMPOS.indexOf(campo) + 1]
    // Con monto en Debe no hace falta pasar por Haber
    const saltarHaber = campo === 'debe' && !esCero(r.debe)
    if (siguiente && !saltarHaber) return enfocar(r.clave, siguiente)
    if (indice < renglones.length - 1) return enfocar(renglones[indice + 1].clave, 'cuenta')
    agregar()
  }

  const alEnter = (indice, campo) => (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      avanzar(indice, campo)
    }
  }

  return (
    <div className="rounded-2xl border border-linea bg-superficie">
      <div
        className={`hidden border-b border-linea bg-papel px-3 py-2 text-xs font-semibold tracking-wide text-pizarra uppercase ${COLUMNAS}`}
        aria-hidden="true"
      >
        <span>#</span>
        <span>Cuenta</span>
        <span>Centro de costo</span>
        <span>Descripción</span>
        <span className="text-right">Debe</span>
        <span className="text-right">Haber</span>
        <span />
      </div>

      <ol className="divide-y divide-linea">
        {renglones.map((r, i) => {
          const error = errores[i]
          return (
            <li key={r.clave} className={`space-y-2 px-3 py-3 lg:space-y-0 ${COLUMNAS}`}>
              <div className="flex items-center justify-between lg:block">
                <span className="cifras pt-2.5 text-sm font-semibold text-pizarra">{i + 1}</span>
                <button
                  type="button"
                  onClick={() => quitar(r.clave)}
                  className="rounded-lg p-1.5 text-pizarra hover:bg-alerta-claro hover:text-alerta lg:hidden"
                  aria-label={`Quitar renglón ${i + 1}`}
                >
                  <Icono nombre="papelera" className="size-4" />
                </button>
              </div>

              <div>
                <span className="mb-1 block text-xs text-pizarra lg:hidden">Cuenta</span>
                <AccountPicker
                  id={idCampo(r.clave, 'cuenta')}
                  aria-label={`Cuenta del renglón ${i + 1}`}
                  value={r.cuentaId}
                  seleccion={r.cuenta}
                  error={error?.campo === 'cuentaId'}
                  placeholder="Código o nombre de la cuenta…"
                  onChange={(cuenta) => {
                    actualizar(r.clave, {
                      cuentaId: cuenta?.id ?? null,
                      cuenta: cuenta ? { codigo: cuenta.codigo, nombre: cuenta.nombre } : null,
                    })
                    if (cuenta) enfocar(r.clave, 'centro')
                  }}
                />
              </div>

              <div>
                <span className="mb-1 block text-xs text-pizarra lg:hidden">Centro de costo</span>
                <select
                  id={idCampo(r.clave, 'centro')}
                  aria-label={`Centro de costo del renglón ${i + 1}`}
                  value={r.centroCostoId ?? ''}
                  onChange={(e) => actualizar(r.clave, { centroCostoId: e.target.value })}
                  onKeyDown={alEnter(i, 'centro')}
                  className={`${claseCampo} border-linea text-sm`}
                >
                  <option value="">—</option>
                  {centros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} · {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="mb-1 block text-xs text-pizarra lg:hidden">Descripción</span>
                <input
                  id={idCampo(r.clave, 'desc')}
                  aria-label={`Descripción del renglón ${i + 1}`}
                  value={r.descripcion}
                  maxLength={255}
                  onChange={(e) => actualizar(r.clave, { descripcion: e.target.value })}
                  onKeyDown={alEnter(i, 'desc')}
                  placeholder="Opcional"
                  className={`${claseCampo} border-linea text-sm`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 lg:contents">
                <label className="block">
                  <span className="mb-1 block text-xs text-pizarra lg:hidden">Debe</span>
                  <MontoInput
                    id={idCampo(r.clave, 'debe')}
                    aria-label={`Debe del renglón ${i + 1}`}
                    value={r.debe}
                    error={error?.campo === 'debe'}
                    onChange={(m) =>
                      actualizar(r.clave, esCero(m) ? { debe: m } : { debe: m, haber: '' })
                    }
                    onKeyDown={alEnter(i, 'debe')}
                    className="text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-pizarra lg:hidden">Haber</span>
                  <MontoInput
                    id={idCampo(r.clave, 'haber')}
                    aria-label={`Haber del renglón ${i + 1}`}
                    value={r.haber}
                    error={error?.campo === 'haber'}
                    onChange={(m) =>
                      actualizar(r.clave, esCero(m) ? { haber: m } : { haber: m, debe: '' })
                    }
                    onKeyDown={alEnter(i, 'haber')}
                    className="text-sm"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => quitar(r.clave)}
                className="mt-1 hidden rounded-lg p-1.5 text-pizarra hover:bg-alerta-claro hover:text-alerta lg:block"
                aria-label={`Quitar renglón ${i + 1}`}
                title="Quitar renglón"
              >
                <Icono nombre="papelera" className="size-4" />
              </button>

              {error && (
                <p className="text-sm text-alerta lg:col-span-full lg:col-start-2">
                  {error.mensaje}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      <div className="border-t border-linea px-3 py-2">
        <button
          type="button"
          onClick={agregar}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-marca hover:bg-marca-claro"
        >
          <Icono nombre="mas" className="size-4" />
          Agregar renglón
        </button>
        <span className="ayuda ml-3 text-xs text-pizarra">
          Enter pasa al campo siguiente; en el último renglón agrega uno nuevo con lo que falta por
          cuadrar.
        </span>
      </div>
    </div>
  )
}
