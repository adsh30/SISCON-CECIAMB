import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const KEY = ['centros-costo']

function queryParams(params = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      q.set(k, String(v))
    }
  }
  const str = q.toString()
  return str ? `?${str}` : ''
}

export function useCentrosCosto(params = {}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => (await api(`/centros-costo${queryParams(params)}`)).data,
  })
}

function useMutacionCentrosCosto(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export const useCrearCentroCosto = () =>
  useMutacionCentrosCosto(
    async (datos) => (await api('/centros-costo', { method: 'POST', body: datos })).data,
  )

export const useActualizarCentroCosto = () =>
  useMutacionCentrosCosto(
    async ({ id, datos }) =>
      (await api(`/centros-costo/${id}`, { method: 'PUT', body: datos })).data,
  )

export const useEliminarCentroCosto = () =>
  useMutacionCentrosCosto((id) => api(`/centros-costo/${id}`, { method: 'DELETE' }))
