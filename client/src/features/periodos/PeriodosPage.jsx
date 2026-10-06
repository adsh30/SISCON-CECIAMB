import { useState } from 'react'
import { usePermisos } from '../../api/auth.js'
import {
  useCerrarPeriodo,
  useEliminarEjercicio,
  usePeriodos,
  useReabrirPeriodo,
} from '../../api/periodos.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx'
import { formatoFecha, formatoFechaHora } from '../../lib/formato.js'
import { NuevoEjercicioModal } from './NuevoEjercicioModal.jsx'

function ReabrirModal({ periodo, onClose, onListo }) {
  const [motivo, setMotivo] = useState('')
  const reabrir = useReabrirPeriodo()
  const valido = motivo.trim().length >= 10
  return (
    <Modal
      titulo={`Reabrir ${periodo.nombre}`}
      descripcion="Volverá a aceptar comprobantes nuevos y cambios."
      tamano="sm"
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variante="peligro"
            disabled={!valido || reabrir.isPending}
            onClick={() =>
              reabrir.mutate({ id: periodo.id, motivo: motivo.trim() }, { onSuccess: onListo })
            }
          >
            {reabrir.isPending ? 'Reabriendo…' : 'Reabrir período'}
          </Button>
        </>
      }
    >
      <label htmlFor="motivo-reapertura" className="text-sm font-medium">
        Motivo de la reapertura
      </label>
      <textarea
        id="motivo-reapertura"
        rows={3}
        maxLength={255}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ejemplo: registrar una factura de proveedor recibida tarde"
        className={`mt-1.5 ${claseCampo} border-linea`}
        autoFocus
      />
      <p className="mt-1 text-xs text-pizarra">
        Mínimo 10 caracteres. Queda guardado en el período y en la bitácora.
      </p>
      {reabrir.isError && (
        <p className="mt-3 rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta">
          {reabrir.error.message}
        </p>
      )}
    </Modal>
  )
}

function TarjetaPeriodo({ p, esActual, puedeCerrar, puedeReabrir, onCerrar, onReabrir }) {
  const cerrado = p.estado === 'CERRADO'
  return (
    <li
      className={`flex flex-col rounded-2xl border bg-superficie p-4 ${
        esActual ? 'border-marca ring-3 ring-marca/10' : 'border-linea'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="cifras text-xs text-pizarra">
            Período {String(p.numero).padStart(2, '0')}
          </span>
          <h3 className="font-semibold">{p.nombre}</h3>
        </div>
        <Insignia tono={cerrado ? 'neutro' : 'exito'}>
          <Icono nombre={cerrado ? 'candado' : 'abierto'} className="mr-1 size-3.5" />
          {cerrado ? 'Cerrado' : 'Abierto'}
        </Insignia>
      </div>
      <p className="cifras mt-1 text-xs text-pizarra">
        {formatoFecha(p.fechaInicio)} al {formatoFecha(p.fechaFin)}
      </p>
      {esActual && <p className="mt-2 text-xs font-semibold text-marca">Período actual</p>}

      <div className="mt-2 flex-1 space-y-1 text-xs text-pizarra">
        {cerrado && p.cerradoPor && (
          <p>
            Cerrado por {p.cerradoPor} el {formatoFechaHora(p.cerradoEn)}
          </p>
        )}
        {p.motivoReapertura && (
          <p title={p.motivoReapertura}>
            Reabierto por {p.reabiertoPor} el {formatoFechaHora(p.reabiertoEn)}:{' '}
            <em className="text-tinta">«{p.motivoReapertura}»</em>
          </p>
        )}
      </div>

      {(puedeCerrar || puedeReabrir) && (
        <div className="mt-3 border-t border-linea pt-3">
          {puedeCerrar && (
            <Button
              tamano="sm"
              variante="secundario"
              className="w-full"
              onClick={() => onCerrar(p)}
            >
              <Icono nombre="candado" className="size-4" /> Cerrar período
            </Button>
          )}
          {puedeReabrir && (
            <Button tamano="sm" variante="fantasma" className="w-full" onClick={() => onReabrir(p)}>
              <Icono nombre="abierto" className="size-4" /> Reabrir
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

export default function PeriodosPage() {
  const { data, isPending, isError, error } = usePeriodos()
  const { can } = usePermisos()
  const avisar = useAvisos()
  const cerrar = useCerrarPeriodo()
  const eliminar = useEliminarEjercicio()
  const [elegido, setElegido] = useState(null)
  const [modal, setModal] = useState({ tipo: null })
  const cerrarModal = () => {
    cerrar.reset()
    eliminar.reset()
    setModal({ tipo: null })
  }

  if (isPending) return <p className="py-10 text-center text-pizarra">Cargando…</p>
  if (isError) return <p className="py-10 text-center text-alerta">{error.message}</p>

  const { ejercicios, hoy, periodoActualId } = data
  const todos = ejercicios
    .flatMap((e) => e.periodos)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
  // Reglas del servidor, para mostrar solo el botón que corresponde
  const siguienteACerrar = todos.find((p) => p.estado === 'ABIERTO')
  const cerrable = siguienteACerrar && siguienteACerrar.fechaInicio <= hoy ? siguienteACerrar : null
  const ultimoCerrado = todos.findLast((p) => p.estado === 'CERRADO')
  const actual = todos.find((p) => p.id === periodoActualId)

  const ejercicio =
    ejercicios.find((e) => e.id === elegido) ??
    ejercicios.find((e) => e.periodos.some((p) => p.id === periodoActualId)) ??
    ejercicios[0]

  const extremos = ejercicios.length ? [ejercicios[0].id, ejercicios.at(-1).id] : []
  const puedeEliminar =
    ejercicio &&
    can('periodos', 'full') &&
    extremos.includes(ejercicio.id) &&
    ejercicio.periodos.every((p) => p.estado === 'ABIERTO')

  // Sugerencia: el año siguiente al último ejercicio (o el actual si no hay ninguno)
  const ultimo = ejercicios[0]
  const sugerido = ultimo
    ? {
        anio: Number(ultimo.fechaFin.slice(0, 4)) + (ultimo.fechaFin.endsWith('12-31') ? 1 : 0),
        mes: (Number(ultimo.fechaFin.slice(5, 7)) % 12) + 1,
      }
    : { anio: Number(hoy.slice(0, 4)), mes: 1 }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ejercicios y períodos</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Cada ejercicio económico tiene 12 períodos mensuales. En un período cerrado no se pueden
            registrar ni modificar comprobantes. Se cierran en orden, mes a mes.
          </p>
        </div>
        {can('periodos', 'escritura') && (
          <Button onClick={() => setModal({ tipo: 'nuevo' })}>
            <Icono nombre="mas" className="size-4" /> Nuevo ejercicio
          </Button>
        )}
      </div>

      <div
        className={`mt-6 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 ${
          actual ? 'border-linea bg-superficie' : 'border-aviso/30 bg-aviso-claro'
        }`}
      >
        <Icono
          nombre="periodos"
          className={`size-5 shrink-0 ${actual ? 'text-marca' : 'text-aviso'}`}
        />
        {actual ? (
          <p>
            Período actual: <strong>{actual.nombre}</strong>{' '}
            <Insignia tono={actual.estado === 'CERRADO' ? 'neutro' : 'exito'}>
              {actual.estado === 'CERRADO' ? 'Cerrado' : 'Abierto'}
            </Insignia>
          </p>
        ) : (
          <p className="text-aviso">
            No hay un período contable para hoy ({formatoFecha(hoy)}).
            {can('periodos', 'escritura') && ' Cree el ejercicio con Nuevo ejercicio.'}
          </p>
        )}
        {cerrable && can('periodos', 'escritura') && (
          <p className="text-sm text-pizarra sm:ml-auto">
            Próximo a cerrar: <strong className="text-tinta">{cerrable.nombre}</strong>
          </p>
        )}
      </div>

      {ejercicios.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-linea bg-superficie px-6 py-12 text-center">
          <Icono nombre="periodos" className="mx-auto size-8 text-pizarra" />
          <p className="mt-3 font-semibold">Aún no hay ejercicios económicos</p>
          <p className="mt-1 text-sm text-pizarra">
            Cree el primero para empezar a registrar comprobantes.
          </p>
        </div>
      ) : (
        <>
          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Ejercicios"
          >
            {ejercicios.map((e) => (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={ejercicio.id === e.id}
                onClick={() => setElegido(e.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  ejercicio.id === e.id
                    ? 'bg-marca text-white shadow-sm'
                    : 'border border-linea bg-superficie text-pizarra hover:text-tinta'
                }`}
              >
                {e.nombre}
              </button>
            ))}
          </div>

          <section
            className="mt-4 rounded-2xl border border-linea bg-superficie p-5"
            role="tabpanel"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{ejercicio.nombre}</h2>
                <p className="cifras text-sm text-pizarra">
                  Del {formatoFecha(ejercicio.fechaInicio)} al {formatoFecha(ejercicio.fechaFin)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <div className="flex justify-between text-xs text-pizarra">
                    <span>Cerrados</span>
                    <span className="cifras font-semibold text-tinta">
                      {ejercicio.cerrados} de 12
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-superficie-2">
                    <div
                      className="h-full rounded-full bg-marca"
                      style={{ width: `${(ejercicio.cerrados / 12) * 100}%` }}
                    />
                  </div>
                </div>
                <Insignia tono={ejercicio.estado === 'CERRADO' ? 'neutro' : 'exito'}>
                  {ejercicio.estado === 'CERRADO' ? 'Ejercicio cerrado' : 'En curso'}
                </Insignia>
                {puedeEliminar && (
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => setModal({ tipo: 'eliminar', ejercicio })}
                  >
                    <Icono nombre="papelera" className="size-4" /> Eliminar
                  </Button>
                )}
              </div>
            </div>

            <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ejercicio.periodos.map((p) => (
                <TarjetaPeriodo
                  key={p.id}
                  p={p}
                  esActual={p.id === periodoActualId}
                  puedeCerrar={can('periodos', 'escritura') && cerrable?.id === p.id}
                  puedeReabrir={can('periodos', 'full') && ultimoCerrado?.id === p.id}
                  onCerrar={(per) => setModal({ tipo: 'cerrar', periodo: per })}
                  onReabrir={(per) => setModal({ tipo: 'reabrir', periodo: per })}
                />
              ))}
            </ol>
          </section>
        </>
      )}

      {modal.tipo === 'nuevo' && (
        <NuevoEjercicioModal
          anioSugerido={sugerido.anio}
          mesSugerido={sugerido.mes}
          onClose={cerrarModal}
          onCreado={(e) => {
            setElegido(e.id)
            avisar('Ejercicio creado', 'exito', `${e.nombre} · 12 períodos abiertos`)
            cerrarModal()
          }}
        />
      )}
      {modal.tipo === 'cerrar' && (
        <ConfirmDialog
          titulo={`Cerrar ${modal.periodo.nombre}`}
          mensaje={`Después del cierre no se podrán registrar ni modificar comprobantes con fecha entre el ${formatoFecha(modal.periodo.fechaInicio)} y el ${formatoFecha(modal.periodo.fechaFin)}. Solo el administrador puede reabrirlo, indicando el motivo.`}
          textoConfirmar="Cerrar período"
          pendiente={cerrar.isPending}
          error={cerrar.error?.message}
          onCancel={cerrarModal}
          onConfirm={() =>
            cerrar.mutate(modal.periodo.id, {
              onSuccess: (p) => {
                avisar('Período cerrado', 'exito', p.nombre)
                cerrarModal()
              },
            })
          }
        />
      )}
      {modal.tipo === 'reabrir' && (
        <ReabrirModal
          periodo={modal.periodo}
          onClose={cerrarModal}
          onListo={(p) => {
            avisar('Período reabierto', 'exito', p.nombre)
            cerrarModal()
          }}
        />
      )}
      {modal.tipo === 'eliminar' && (
        <ConfirmDialog
          titulo={`Eliminar ${modal.ejercicio.nombre}`}
          mensaje="Se eliminarán el ejercicio y sus 12 períodos. Use esta opción solo para corregir un ejercicio creado por error."
          textoConfirmar="Eliminar ejercicio"
          variante="peligro"
          pendiente={eliminar.isPending}
          error={eliminar.error?.message}
          onCancel={cerrarModal}
          onConfirm={() =>
            eliminar.mutate(modal.ejercicio.id, {
              onSuccess: () => {
                avisar('Ejercicio eliminado', 'exito', modal.ejercicio.nombre)
                setElegido(null)
                cerrarModal()
              },
            })
          }
        />
      )}
    </div>
  )
}
