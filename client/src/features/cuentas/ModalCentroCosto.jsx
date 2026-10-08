import { useState } from 'react'
import { useActualizarCentroCosto, useCrearCentroCosto } from '../../api/centrosCosto.js'
import { Button } from '../../components/ui/Button.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Campo, Interruptor } from '../../components/ui/Formulario.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useAvisos } from '../../components/ui/Avisos.jsx'

export function ModalCentroCosto({ centroCosto, onClose }) {
  const avisar = useAvisos()
  const esEdicion = !!centroCosto
  const crear = useCrearCentroCosto()
  const actualizar = useActualizarCentroCosto()

  const [codigo, setCodigo] = useState(centroCosto?.codigo || '')
  const [nombre, setNombre] = useState(centroCosto?.nombre || '')
  const [descripcion, setDescripcion] = useState(centroCosto?.descripcion || '')
  const [activo, setActivo] = useState(centroCosto ? !!centroCosto.activo : true)
  const [error, setError] = useState(null)

  const pendiente = crear.isPending || actualizar.isPending

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)

    if (!codigo.trim() && !esEdicion) {
      setError('El código del centro de costo es requerido')
      return
    }
    if (!nombre.trim()) {
      setError('El nombre del centro de costo es requerido')
      return
    }

    try {
      if (esEdicion) {
        await actualizar.mutateAsync({
          id: centroCosto.id,
          datos: {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            activo,
          },
        })
        avisar('Centro de costo actualizado', 'exito', `${centroCosto.codigo} — ${nombre}`)
      } else {
        await crear.mutateAsync({
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          activo,
        })
        avisar('Centro de costo creado con éxito', 'exito', `${codigo.toUpperCase()} — ${nombre}`)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar el centro de costo')
    }
  }

  return (
    <Modal
      titulo={esEdicion ? `Editar Centro de Costo ${centroCosto.codigo}` : 'Nuevo Centro de Costo'}
      descripcion="Defina áreas o departamentos operativos del hospital"
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose} disabled={pendiente}>
            Cancelar
          </Button>
          <Button variante="primario" onClick={guardar} disabled={pendiente}>
            {pendiente ? 'Guardando…' : esEdicion ? 'Guardar Cambios' : 'Crear Centro de Costo'}
          </Button>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-alerta-claro px-4 py-2.5 text-sm text-alerta">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo etiqueta="Código" id="codigo" ayuda="Ej. EME, QUI, ADM">
            <input
              id="codigo"
              type="text"
              value={codigo}
              disabled={esEdicion}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Código"
              className={`${claseCampo} font-mono uppercase`}
            />
          </Campo>

          <Campo etiqueta="Nombre del área / departamento" id="nombre" className="sm:col-span-2">
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Emergencia y Triaje"
              className={claseCampo}
            />
          </Campo>
        </div>

        <Campo etiqueta="Descripción o alcance" id="descripcion">
          <textarea
            id="descripcion"
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional. Notas adicionales sobre este centro de costo"
            className={claseCampo}
          />
        </Campo>

        <Interruptor
          id="activo"
          checked={activo}
          onChange={setActivo}
          etiqueta="Centro de costo activo"
          descripcion="Los centros inactivos no se podrán seleccionar en nuevos comprobantes"
        />
      </form>
    </Modal>
  )
}
