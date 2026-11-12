import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

const KEY = ['diferencial-cambiario']

/** Cuentas de ganancia y pérdida cambiaria (Empresa) */
export function useConfiguracionDiferencial({ enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'configuracion'],
    queryFn: async () => (await api('/diferencial-cambiario/configuracion')).data,
    enabled,
  })
}

export function useGuardarConfiguracionDiferencial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos) =>
      (await api('/diferencial-cambiario/configuracion', { method: 'PUT', body: datos })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Lo que registrará el cierre del período: ajuste de cada auxiliar en divisas */
export function useVistaPreviaDiferencial(periodoId) {
  return useQuery({
    queryKey: [...KEY, 'periodo', periodoId],
    queryFn: async () => (await api(`/diferencial-cambiario/periodos/${periodoId}`)).data,
    enabled: !!periodoId,
    staleTime: 0,
  })
}
