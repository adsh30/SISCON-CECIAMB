import { useQuery } from '@tanstack/react-query'
import { api } from './client.js'

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => api('/health') })
}
