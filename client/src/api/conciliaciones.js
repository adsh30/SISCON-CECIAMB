import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

export function useConciliaciones(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.cuentaId) params.set('cuentaId', filtros.cuentaId)
  if (filtros.estado) params.set('estado', filtros.estado)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['conciliaciones', filtros],
    queryFn: () => api(`/conciliaciones${qs}`).then((r) => r.data),
  })
}

export function useConciliacion(id) {
  return useQuery({
    queryKey: ['conciliaciones', id],
    queryFn: () => api(`/conciliaciones/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useIniciarConciliacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api('/conciliaciones', { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliaciones'] })
    },
  })
}

export function useImportarBanco(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) =>
      api(`/conciliaciones/${id}/importar-banco`, { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliaciones', id] })
      qc.invalidateQueries({ queryKey: ['conciliaciones'] })
    },
  })
}

export function useEmparejar(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) =>
      api(`/conciliaciones/${id}/emparejar`, { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliaciones', id] })
    },
  })
}

export function useDesemparejar(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) =>
      api(`/conciliaciones/${id}/desemparejar`, { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliaciones', id] })
    },
  })
}

export function useFinalizarConciliacion(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) =>
      api(`/conciliaciones/${id}/finalizar`, { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliaciones', id] })
      qc.invalidateQueries({ queryKey: ['conciliaciones'] })
    },
  })
}

export function useAnularConciliacion(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) =>
      api(`/conciliaciones/${id}/anular`, { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conciliaciones', id] })
      qc.invalidateQueries({ queryKey: ['conciliaciones'] })
    },
  })
}
