import { createContext, useCallback, useContext, useState } from 'react'
import { Icono } from './Icono.jsx'

const AvisosContext = createContext(() => {})

const DURACION_MS = 6000

const TONOS = {
  exito: { borde: 'border-l-exito', icono: 'bg-exito-claro text-exito', simbolo: 'check' },
  alerta: { borde: 'border-l-alerta', icono: 'bg-alerta-claro text-alerta', simbolo: 'cerrar' },
  info: { borde: 'border-l-marca', icono: 'bg-marca-claro text-marca', simbolo: 'ayuda' },
}

/**
 * Avisos breves arriba al centro, donde queda la vista al cerrar un formulario.
 * `avisar(mensaje, tono, detalle)`: el detalle es una segunda línea opcional (p. ej. el nombre).
 * Un clic en cualquier parte del aviso lo cierra.
 */
export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const quitar = useCallback((id) => setAvisos((a) => a.filter((x) => x.id !== id)), [])

  const avisar = useCallback(
    (mensaje, tono = 'exito', detalle) => {
      const id = crypto.randomUUID()
      // Un aviso idéntico reemplaza al anterior en vez de apilarse
      setAvisos((a) => [
        ...a.filter((x) => x.mensaje !== mensaje || x.detalle !== detalle),
        { id, mensaje, tono, detalle },
      ])
      setTimeout(() => quitar(id), DURACION_MS)
    },
    [quitar],
  )

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {avisos.map((a) => {
          const t = TONOS[a.tono] ?? TONOS.exito
          return (
            <div
              key={a.id}
              onClick={() => quitar(a.id)}
              title="Clic para cerrar"
              className={`pointer-events-auto flex w-full cursor-pointer max-w-md items-center gap-3 rounded-xl border border-l-4 border-linea bg-superficie py-3 pr-2 pl-4 shadow-xl shadow-tinta/10 motion-safe:animate-[renglon-entra_200ms_ease-out] ${t.borde}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${t.icono}`}>
                <Icono nombre={t.simbolo} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-tinta">{a.mensaje}</p>
                {a.detalle && <p className="truncate text-sm text-pizarra">{a.detalle}</p>}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  quitar(a.id)
                }}
                className="rounded-lg p-1.5 text-pizarra hover:bg-superficie-2 hover:text-tinta"
                aria-label="Cerrar aviso"
              >
                <Icono nombre="cerrar" className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </AvisosContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useAvisos = () => useContext(AvisosContext)
