import { createContext, useCallback, useContext, useState } from 'react'
import { Icono } from './Icono.jsx'

const AvisosContext = createContext(() => {})

/** Avisos breves (toasts) en la esquina inferior derecha. */
export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const avisar = useCallback((mensaje, tono = 'exito') => {
    const id = crypto.randomUUID()
    setAvisos((a) => [...a, { id, mensaje, tono }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4000)
  }, [])

  const tonos = {
    exito: 'border-exito/30 text-exito',
    alerta: 'border-alerta/30 text-alerta',
    info: 'border-marca/30 text-marca',
  }

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div
        className="fixed right-4 bottom-4 z-50 flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-2 rounded-xl border bg-superficie px-4 py-3 text-sm font-medium shadow-lg motion-safe:animate-[renglon-entra_200ms_ease-out] ${tonos[a.tono]}`}
          >
            <Icono nombre={a.tono === 'alerta' ? 'cerrar' : 'check'} className="size-4" />
            <span className="text-tinta">{a.mensaje}</span>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useAvisos = () => useContext(AvisosContext)
