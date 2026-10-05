import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { puede } from '../lib/permisos.js'
import { api } from './client.js'

export const ME_KEY = ['auth', 'me']

export function useSesion() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await api('/auth/me')).data
      } catch (err) {
        if (err.status === 401) return null
        throw err
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}

/** Permisos del usuario en sesión: can('usuarios', 'escritura') */
export function usePermisos() {
  const { data: usuario } = useSesion()
  return {
    usuario,
    esAdmin: usuario?.rol === 'ADMIN',
    can: (modulo, nivel = 'lectura') => puede(usuario, modulo, nivel),
  }
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (credenciales) => api('/auth/login', { method: 'POST', body: credenciales }),
    onSuccess: ({ data }) => qc.setQueryData(ME_KEY, data),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      qc.setQueryData(ME_KEY, null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
    },
  })
}

export function useCambiarClave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos) => api('/auth/cambiar-clave', { method: 'POST', body: datos }),
    onSuccess: ({ data }) => qc.setQueryData(ME_KEY, data),
  })
}

export function useActualizarPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos) => api('/auth/perfil', { method: 'PUT', body: datos }),
    onSuccess: ({ data }) => qc.setQueryData(ME_KEY, data),
  })
}
