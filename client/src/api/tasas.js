import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const TASAS_KEY = ['tasas', 'actual']

export function useTasas() {
  return useQuery({
    queryKey: TASAS_KEY,
    queryFn: async () => (await api('/tasas/actual')).data,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

export function useActualizarTasas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api('/tasas/actualizar', { method: 'POST' })).data,
    onSuccess: (data) => qc.setQueryData(TASAS_KEY, data),
  })
}
