import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const BASE = ['usuarios']

export function useUsuarios(filtros) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null),
  )
  return useQuery({
    queryKey: [...BASE, 'lista', filtros],
    queryFn: () => api(`/usuarios?${params}`),
    placeholderData: keepPreviousData,
  })
}

export function useDepartamentos() {
  return useQuery({
    queryKey: [...BASE, 'departamentos'],
    queryFn: async () => (await api('/usuarios/departamentos')).data,
  })
}

function useMutacionUsuarios(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BASE })
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}

export const useCrearUsuario = () =>
  useMutacionUsuarios(
    async (datos) => (await api('/usuarios', { method: 'POST', body: datos })).data,
  )

export const useEditarUsuario = () =>
  useMutacionUsuarios(
    async ({ id, ...datos }) => (await api(`/usuarios/${id}`, { method: 'PUT', body: datos })).data,
  )

export const useEstadoUsuario = () =>
  useMutacionUsuarios(
    async ({ id, activo }) =>
      (await api(`/usuarios/${id}/estado`, { method: 'PATCH', body: { activo } })).data,
  )

export const useArchivarUsuario = () =>
  useMutacionUsuarios(
    async ({ id, archivar }) =>
      (await api(`/usuarios/${id}/${archivar ? 'archivar' : 'desarchivar'}`, { method: 'POST' }))
        .data,
  )

export const useResetearClave = () =>
  useMutacionUsuarios(
    async (id) => (await api(`/usuarios/${id}/resetear-clave`, { method: 'POST' })).data,
  )
