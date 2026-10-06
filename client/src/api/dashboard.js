import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './client.js'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api('/dashboard')).data,
    refetchInterval: 5 * 60_000,
  })
}

export function useHistorialTasas({ desde, hasta }) {
  return useQuery({
    queryKey: ['tasas', 'historial', desde, hasta],
    queryFn: async () => (await api(`/tasas/historial?desde=${desde}&hasta=${hasta}`)).data,
    placeholderData: keepPreviousData,
    enabled: !!desde && !!hasta && desde <= hasta,
  })
}

export function useActividadPorDia({ desde, hasta }, habilitado = true) {
  return useQuery({
    queryKey: ['dashboard', 'actividad', desde, hasta],
    queryFn: async () => (await api(`/dashboard/actividad?desde=${desde}&hasta=${hasta}`)).data,
    placeholderData: keepPreviousData,
    enabled: habilitado && !!desde && !!hasta && desde <= hasta,
  })
}
