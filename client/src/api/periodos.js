import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const KEY = ['periodos']

export function usePeriodos({ enabled = true } = {}) {
  return useQuery({ queryKey: KEY, queryFn: async () => (await api('/periodos')).data, enabled })
}

function useMutacionPeriodos(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useCrearEjercicio = () =>
  useMutacionPeriodos(
    async (datos) => (await api('/periodos/ejercicios', { method: 'POST', body: datos })).data,
  )

export const useEliminarEjercicio = () =>
  useMutacionPeriodos((id) => api(`/periodos/ejercicios/${id}`, { method: 'DELETE' }))

export const useCerrarPeriodo = () =>
  useMutacionPeriodos(async (id) => (await api(`/periodos/${id}/cerrar`, { method: 'POST' })).data)

export const useReabrirPeriodo = () =>
  useMutacionPeriodos(
    async ({ id, motivo }) =>
      (await api(`/periodos/${id}/reabrir`, { method: 'POST', body: { motivo } })).data,
  )
