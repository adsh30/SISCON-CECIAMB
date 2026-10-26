import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

export function useCxcKpis() {
  return useQuery({
    queryKey: ['cxc', 'kpis'],
    queryFn: () => api('/cxc/kpis').then((r) => r.data),
  })
}

export function useCxcAntiguedad() {
  return useQuery({
    queryKey: ['cxc', 'antiguedad'],
    queryFn: () => api('/cxc/antiguedad').then((r) => r.data),
  })
}

export function useCxcClientes(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.categoria) params.set('categoria', filtros.categoria)
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['cxc', 'clientes', filtros],
    queryFn: () => api(`/cxc/clientes${qs}`).then((r) => r.data),
  })
}

export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api('/cxc/clientes', { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cxc', 'clientes'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'kpis'] })
    },
  })
}

export function useCxcFacturas(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.clienteId) params.set('clienteId', filtros.clienteId)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.servicio) params.set('servicio', filtros.servicio)
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['cxc', 'facturas', filtros],
    queryFn: () => api(`/cxc/facturas${qs}`).then((r) => r.data),
  })
}

export function useCxcFactura(id) {
  return useQuery({
    queryKey: ['cxc', 'facturas', id],
    queryFn: () => api(`/cxc/facturas/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCrearFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api('/cxc/facturas', { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cxc', 'facturas'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'kpis'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'antiguedad'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'clientes'] })
      qc.invalidateQueries({ queryKey: ['comprobantes'] })
    },
  })
}

export function useCxcCobros(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.clienteId) params.set('clienteId', filtros.clienteId)
  if (filtros.facturaId) params.set('facturaId', filtros.facturaId)
  if (filtros.formaPago) params.set('formaPago', filtros.formaPago)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['cxc', 'cobros', filtros],
    queryFn: () => api(`/cxc/cobros${qs}`).then((r) => r.data),
  })
}

export function useCrearCobro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api('/cxc/cobros', { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cxc', 'cobros'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'facturas'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'kpis'] })
      qc.invalidateQueries({ queryKey: ['cxc', 'antiguedad'] })
      qc.invalidateQueries({ queryKey: ['comprobantes'] })
    },
  })
}
