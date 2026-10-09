import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, esErrorDeConexion } from '../../api/client.js'
import { Icono } from './Icono.jsx'

/**
 * Aviso fijo cuando se pierde la conexión con el sistema. Mientras dura, consulta el estado
 * cada 10 s; al volver, recarga lo que esté en pantalla y el aviso se quita solo.
 */
export function EstadoConexion() {
  const qc = useQueryClient()
  const [caido, setCaido] = useState(false)

  // Cualquier consulta o guardado que falle por conexión enciende el aviso; un éxito lo apaga
  useEffect(() => {
    // Los eventos de consultas y de guardados traen { action: { type, error } }
    const revisar = ({ action } = {}) => {
      if (action?.type === 'error' && esErrorDeConexion(action.error)) setCaido(true)
      else if (action?.type === 'success') setCaido(false)
    }
    const q = qc.getQueryCache().subscribe(revisar)
    const m = qc.getMutationCache().subscribe(revisar)
    const sinRed = () => setCaido(true)
    window.addEventListener('offline', sinRed)
    return () => {
      q()
      m()
      window.removeEventListener('offline', sinRed)
    }
  }, [qc])

  useEffect(() => {
    if (!caido) return
    const id = setInterval(async () => {
      try {
        await api('/health')
        setCaido(false)
        qc.refetchQueries({ type: 'active' })
      } catch {
        // sigue caído; se reintenta en 10 s
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [caido, qc])

  if (!caido) return null
  return (
    <div
      role="alert"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 border-b border-alerta/30 bg-alerta-claro px-4 py-2 text-sm text-alerta"
    >
      <Icono nombre="escudo" className="size-4 shrink-0" />
      <span>
        <strong>Sin conexión con el sistema.</strong> Lo que ve puede no estar al día y no se podrá
        guardar hasta que vuelva. Se reintenta solo cada 10 segundos.
      </span>
      <button
        type="button"
        onClick={() => qc.refetchQueries({ type: 'active' })}
        className="rounded-lg border border-alerta/40 px-2.5 py-1 font-semibold hover:bg-alerta/10"
      >
        Reintentar ahora
      </button>
    </div>
  )
}
