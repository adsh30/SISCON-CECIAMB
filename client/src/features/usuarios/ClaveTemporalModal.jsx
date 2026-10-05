import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { Modal } from '../../components/ui/Modal.jsx'

/** Muestra una sola vez la clave temporal generada por el sistema. */
export function ClaveTemporalModal({ email, clave, motivo, onClose }) {
  const [copiada, setCopiada] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(clave)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }

  return (
    <Modal
      titulo={motivo === 'creado' ? 'Usuario creado' : 'Clave restablecida'}
      tamano="sm"
      onClose={onClose}
      pie={<Button onClick={onClose}>Listo</Button>}
    >
      <p>
        Clave temporal de <strong>{email}</strong>:
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded-lg border border-linea bg-papel px-4 py-3 text-center font-mono text-xl tracking-wider select-all">
          {clave}
        </code>
        <Button variante="secundario" onClick={copiar} title="Copiar clave">
          <Icono nombre={copiada ? 'check' : 'copiar'} className="size-4" />
          {copiada ? 'Copiada' : 'Copiar'}
        </Button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-pizarra">
        Entréguela personalmente. Con ella entra una sola vez y el sistema le pide elegir una clave
        propia. Por seguridad, esta clave no se vuelve a mostrar.
      </p>
    </Modal>
  )
}
