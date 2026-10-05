import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'
import { ME_KEY } from './auth.js'

const BASE = ['roles']

export function useRoles() {
  return useQuery({ queryKey: BASE, queryFn: () => api('/roles') })
}

function useMutacionRoles(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BASE })
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ME_KEY }) // por si cambian los permisos propios
    },
  })
}

export const useCrearRol = () =>
  useMutacionRoles(async (datos) => (await api('/roles', { method: 'POST', body: datos })).data)

export const useEditarRol = () =>
  useMutacionRoles(
    async ({ id, ...datos }) => (await api(`/roles/${id}`, { method: 'PUT', body: datos })).data,
  )

export const useEliminarRol = () =>
  useMutacionRoles((id) => api(`/roles/${id}`, { method: 'DELETE' }))

export const useGuardarPermisos = () =>
  useMutacionRoles(
    async ({ id, permisos }) =>
      (await api(`/roles/${id}/permisos`, { method: 'PUT', body: { permisos } })).data,
  )

export const useRestaurarPermisos = () =>
  useMutacionRoles(
    async (id) => (await api(`/roles/${id}/permisos/restaurar`, { method: 'POST' })).data,
  )
