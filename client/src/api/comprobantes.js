import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const KEY = ['comprobantes']

/** Quita filtros vacíos y arma la query string */
const query = (filtros) =>
  new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null))

export function useComprobantes(filtros) {
  return useQuery({
    queryKey: [...KEY, 'lista', filtros],
    queryFn: () => api(`/comprobantes?${query(filtros)}`),
    placeholderData: keepPreviousData,
  })
}

export function useComprobante(id) {
  return useQuery({
    queryKey: [...KEY, 'detalle', Number(id)],
    queryFn: async () => (await api(`/comprobantes/${id}`)).data,
    enabled: !!id,
  })
}

export function useTiposComprobante() {
  return useQuery({
    queryKey: [...KEY, 'tipos'],
    queryFn: async () => (await api('/comprobantes/tipos')).data,
    staleTime: 60_000,
  })
}

function useMutacion(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      // Solo los comprobantes traen renglones; los tipos no van a esta caché
      if (data?.renglones) qc.setQueryData([...KEY, 'detalle', data.id], data)
    },
  })
}

const enviar = async (ruta, method, body) => (await api(ruta, { method, body }))?.data

export const useCrearComprobante = () =>
  useMutacion((datos) => enviar('/comprobantes', 'POST', datos))

export const useActualizarComprobante = () =>
  useMutacion(({ id, datos }) => enviar(`/comprobantes/${id}`, 'PUT', datos))

export const useEliminarComprobante = () =>
  useMutacion((id) => enviar(`/comprobantes/${id}`, 'DELETE'))

export const useAprobarComprobante = () =>
  useMutacion((id) => enviar(`/comprobantes/${id}/aprobar`, 'POST'))

export const useAnularComprobante = () =>
  useMutacion(({ id, motivo }) => enviar(`/comprobantes/${id}/anular`, 'POST', { motivo }))

/** tipo: 'duplicar' | 'reversar' */
export const useCopiarComprobante = () =>
  useMutacion(({ id, tipo, fecha }) => enviar(`/comprobantes/${id}/${tipo}`, 'POST', { fecha }))

export const useGuardarTipo = () =>
  useMutacion(({ id, datos }) =>
    id
      ? enviar(`/comprobantes/tipos/${id}`, 'PUT', datos)
      : enviar('/comprobantes/tipos', 'POST', datos),
  )
