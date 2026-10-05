import { useEffect, useRef } from 'react'
import { Button } from './Button.jsx'
import { Icono } from './Icono.jsx'

const anchos = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

/** Modal accesible sobre <dialog>: Escape y el botón ✕ lo cierran. */
export function Modal({ titulo, descripcion, tamano = 'md', onClose, pie, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialogo = ref.current
    dialogo?.showModal()
    return () => dialogo?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-labelledby="modal-titulo"
      className={`m-auto max-h-[90vh] w-[calc(100%-2rem)] ${anchos[tamano]} flex-col overflow-hidden rounded-2xl border border-linea bg-superficie p-0 text-tinta shadow-2xl open:flex`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-linea px-6 py-4">
        <div>
          <h2 id="modal-titulo" className="text-lg font-semibold">
            {titulo}
          </h2>
          {descripcion && <p className="mt-0.5 text-sm text-pizarra">{descripcion}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 rounded-lg p-1.5 text-pizarra hover:bg-superficie-2 hover:text-tinta"
          aria-label="Cerrar"
        >
          <Icono nombre="cerrar" />
        </button>
      </header>
      <div className="overflow-y-auto px-6 py-5">{children}</div>
      {pie && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-linea bg-papel/60 px-6 py-3">
          {pie}
        </footer>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  titulo,
  mensaje,
  textoConfirmar,
  variante = 'primario',
  pendiente,
  error,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      titulo={titulo}
      tamano="sm"
      onClose={onCancel}
      pie={
        <>
          <Button variante="secundario" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variante={variante} onClick={onConfirm} disabled={pendiente}>
            {pendiente ? 'Procesando…' : textoConfirmar}
          </Button>
        </>
      }
    >
      <p className="leading-relaxed">{mensaje}</p>
      {error && (
        <p className="mt-3 rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta">{error}</p>
      )}
    </Modal>
  )
}
