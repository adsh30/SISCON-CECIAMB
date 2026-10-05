import { useState } from 'react'
import { useCrearRol, useEditarRol } from '../../api/roles.js'
import { Button } from '../../components/ui/Button.jsx'
import { Campo } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Modal } from '../../components/ui/Modal.jsx'

const COLORES = [
  '#004191',
  '#0f766e',
  '#7c3aed',
  '#a15c07',
  '#be185d',
  '#0369a1',
  '#4d7c0f',
  '#64748b',
]

/** Crear (sin `rol`) o editar nombre, descripción y color de un rol. */
export function RolFormModal({ rol, onClose, onGuardado }) {
  const editando = !!rol
  const crear = useCrearRol()
  const editar = useEditarRol()
  const mutacion = editando ? editar : crear
  const [nombre, setNombre] = useState(rol?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '')
  const [color, setColor] = useState(rol?.color ?? COLORES[2])

  const guardar = (e) => {
    e.preventDefault()
    const datos = { nombre, descripcion, color }
    if (editando) editar.mutate({ id: rol.id, ...datos }, { onSuccess: onGuardado })
    else crear.mutate(datos, { onSuccess: onGuardado })
  }

  const errorNombre = mutacion.error?.details?.find((d) => d.campo === 'nombre')?.mensaje

  return (
    <Modal
      titulo={editando ? 'Editar rol' : 'Nuevo rol'}
      descripcion={
        editando
          ? 'El código interno del rol no cambia.'
          : 'El rol nuevo empieza solo con acceso a Inicio. Luego marque sus permisos.'
      }
      tamano="sm"
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-rol"
            disabled={mutacion.isPending || nombre.trim().length < 2}
          >
            {mutacion.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </>
      }
    >
      <form id="form-rol" onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Nombre del rol" id="rol-nombre" error={errorNombre}>
          <input
            id="rol-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Supervisor de caja"
            autoFocus
            maxLength={60}
            className={`${claseCampo} border-linea`}
          />
        </Campo>
        <Campo etiqueta="Descripción (opcional)" id="rol-desc">
          <textarea
            id="rol-desc"
            value={descripcion ?? ''}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            maxLength={255}
            placeholder="Para qué sirve este rol"
            className={`${claseCampo} border-linea`}
          />
        </Campo>
        <fieldset>
          <legend className="text-sm font-medium">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className={`size-8 rounded-full ring-offset-2 ring-offset-superficie ${color === c ? 'ring-2 ring-tinta' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </fieldset>
        {mutacion.isError && !errorNombre && (
          <p className="rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta">
            {mutacion.error.message}
          </p>
        )}
      </form>
    </Modal>
  )
}
