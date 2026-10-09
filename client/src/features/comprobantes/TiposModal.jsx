import { useState } from 'react'
import { useGuardarTipo, useTiposComprobante } from '../../api/comprobantes.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Modal } from '../../components/ui/Modal.jsx'

const vacio = { codigo: '', nombre: '', descripcion: '', orden: '' }

/** Catálogo de tipos (RF-04.1): el código es también el prefijo del número y no cambia */
export function TiposModal({ onClose }) {
  const { data: tipos = [] } = useTiposComprobante()
  const guardar = useGuardarTipo()
  const avisar = useAvisos()
  const [form, setForm] = useState(null) // null | { id?, ...campos }

  const enviar = (e) => {
    e.preventDefault()
    const { id, codigo, ...resto } = form
    const datos = { ...resto, orden: resto.orden === '' ? undefined : Number(resto.orden) }
    guardar.mutate(
      { id, datos: id ? datos : { codigo, ...datos } },
      {
        onSuccess: (t) => {
          avisar(id ? 'Tipo actualizado' : 'Tipo creado', 'exito', `${t.codigo} · ${t.nombre}`)
          setForm(null)
        },
      },
    )
  }

  const alternar = (t) =>
    guardar.mutate(
      { id: t.id, datos: { activo: !t.activo } },
      {
        onSuccess: (r) =>
          avisar(r.activo ? 'Tipo habilitado' : 'Tipo deshabilitado', 'exito', r.nombre),
        onError: (e) => avisar(e.message, 'alerta'),
      },
    )

  const campo = (k) => ({
    value: form[k] ?? '',
    onChange: (e) => setForm({ ...form, [k]: e.target.value }),
  })

  return (
    <Modal
      titulo="Tipos de comprobante"
      descripcion="Cada tipo lleva su propia numeración por período: VEN-2026-10-0001, COM-2026-10-0001…"
      tamano="lg"
      onClose={onClose}
      pie={
        <Button variante="secundario" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <ul className="divide-y divide-linea rounded-xl border border-linea">
        {tipos.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="cifras w-12 font-mono font-semibold text-marca">{t.codigo}</span>
            <span className="min-w-40 flex-1">
              <span className="font-medium">{t.nombre}</span>
              {t.descripcion && <span className="block text-xs text-pizarra">{t.descripcion}</span>}
            </span>
            {!t.activo && <Insignia>Deshabilitado</Insignia>}
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() =>
                setForm({
                  id: t.id,
                  codigo: t.codigo,
                  nombre: t.nombre,
                  descripcion: t.descripcion ?? '',
                  orden: String(t.orden),
                })
              }
            >
              Editar
            </Button>
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={() => alternar(t)}
              disabled={guardar.isPending}
            >
              {t.activo ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </li>
        ))}
      </ul>

      {form ? (
        <form
          onSubmit={enviar}
          className="mt-4 grid gap-3 rounded-xl border border-linea bg-papel p-4 sm:grid-cols-[6rem_1fr_6rem]"
        >
          <label className="text-sm">
            Código
            <input
              {...campo('codigo')}
              disabled={!!form.id}
              maxLength={6}
              placeholder="DON"
              className={`${claseCampo} border-linea mt-1 font-mono uppercase`}
            />
          </label>
          <label className="text-sm">
            Nombre
            <input
              {...campo('nombre')}
              maxLength={60}
              placeholder="Donaciones"
              className={`${claseCampo} border-linea mt-1`}
            />
          </label>
          <label className="text-sm">
            Orden
            <input
              {...campo('orden')}
              inputMode="numeric"
              placeholder="100"
              className={`${claseCampo} border-linea mt-1`}
            />
          </label>
          <label className="text-sm sm:col-span-3">
            Descripción
            <input
              {...campo('descripcion')}
              maxLength={255}
              placeholder="Opcional"
              className={`${claseCampo} border-linea mt-1`}
            />
          </label>
          {guardar.error && (
            <p className="text-sm text-alerta sm:col-span-3">
              {guardar.error.details?.[0]?.mensaje ?? guardar.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <Button variante="secundario" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {form.id ? 'Guardar cambios' : 'Crear tipo'}
            </Button>
          </div>
        </form>
      ) : (
        <Button variante="secundario" className="mt-4" onClick={() => setForm(vacio)}>
          Nuevo tipo
        </Button>
      )}
    </Modal>
  )
}
