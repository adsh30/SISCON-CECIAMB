import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const ME_KEY = ['auth', 'me']

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
    staleTime: 5 * 60_000,
    retry: false,
  })
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
