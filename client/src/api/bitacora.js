import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './client.js'

/** Quita filtros vacíos y arma la query string */
export const queryBitacora = (filtros) =>
  new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null))

export function useBitacora(filtros) {
  return useQuery({
    queryKey: ['bitacora', 'lista', filtros],
    queryFn: () => api(`/bitacora?${queryBitacora(filtros)}`),
    placeholderData: keepPreviousData,
  })
}

export function useOpcionesBitacora() {
  return useQuery({
    queryKey: ['bitacora', 'opciones'],
    queryFn: async () => (await api('/bitacora/opciones')).data,
    staleTime: 60_000,
  })
}

export function useEventoBitacora(id) {
  return useQuery({
    queryKey: ['bitacora', 'evento', id],
    queryFn: async () => (await api(`/bitacora/${id}`)).data,
    enabled: !!id,
  })
}

/** Enlace de descarga del CSV (la cookie de sesión viaja sola) */
export const urlExportarBitacora = (filtros) => {
  const { pagina: _p, porPagina: _pp, ...resto } = filtros
  return `/api/v1/bitacora/exportar?${queryBitacora(resto)}`
}
