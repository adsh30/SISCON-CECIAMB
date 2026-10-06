import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const KEY = ['empresa']

export function useEmpresa({ enabled = true } = {}) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api('/empresa')).data,
    enabled,
  })
}

function useMutacionEmpresa(mutationFn) {
  const qc = useQueryClient()
  return useMutation({ mutationFn, onSuccess: (data) => qc.setQueryData(KEY, data) })
}

export const useActualizarEmpresa = () =>
  useMutacionEmpresa(async (datos) => (await api('/empresa', { method: 'PUT', body: datos })).data)

export const useSubirLogo = () =>
  useMutacionEmpresa(
    async (contenido) => (await api('/empresa/logo', { method: 'PUT', body: { contenido } })).data,
  )

export const useQuitarLogo = () =>
  useMutacionEmpresa(async () => (await api('/empresa/logo', { method: 'DELETE' })).data)
