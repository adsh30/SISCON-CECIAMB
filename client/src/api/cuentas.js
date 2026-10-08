import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const KEY = ['cuentas']
const KEY_ARBOL = ['cuentas', 'arbol']

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

export function useCuentas(params = {}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => (await api(`/cuentas${queryParams(params)}`)).data,
  })
}

export function useArbolCuentas(params = {}) {
  return useQuery({
    queryKey: [...KEY_ARBOL, params],
    queryFn: async () => (await api(`/cuentas/arbol${queryParams(params)}`)).data,
  })
}

export function useCuenta(id) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => (await api(`/cuentas/${id}`)).data,
    enabled: !!id,
  })
}

function useMutacionCuentas(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: KEY_ARBOL })
    },
  })
}

export const useCrearCuenta = () =>
  useMutacionCuentas(async (datos) => (await api('/cuentas', { method: 'POST', body: datos })).data)

export const useActualizarCuenta = () =>
  useMutacionCuentas(
    async ({ id, datos }) => (await api(`/cuentas/${id}`, { method: 'PUT', body: datos })).data,
  )

export const useEliminarCuenta = () =>
  useMutacionCuentas((id) => api(`/cuentas/${id}`, { method: 'DELETE' }))
