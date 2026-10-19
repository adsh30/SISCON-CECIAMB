import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

export const usePrevisualizarImportacion = () =>
  useMutation({
    mutationFn: async (csv) => (await api('/importaciones/previsualizar', { method: 'POST', body: { csv } })).data,
  })

export function useCrearBorradorImportacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos) => (await api('/importaciones/borrador', { method: 'POST', body: datos })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comprobantes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.setQueryData(['comprobantes', 'detalle', data.id], data)
    },
  })
}
