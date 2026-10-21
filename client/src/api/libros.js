import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ApiError, api } from './client.js'

/** Quita filtros vacíos y arma la query string */
export const consultaLibro = (filtros) =>
  new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null)).toString()

/** Libro Diario o Mayor (`libro` = 'diario' | 'mayor' | 'balance') con sus filtros */
export function useLibro(libro, filtros) {
  return useQuery({
    queryKey: ['libros', libro, filtros],
    queryFn: () => api(`/libros/${libro}?${consultaLibro(filtros)}`),
    placeholderData: keepPreviousData,
  })
}

export const useBalance = (filtros) => useLibro('balance', filtros)

/** Sin la paginación de pantalla: las exportaciones llevan el libro completo */
export const filtrosExportacion = ({ pagina: _p, porPagina: _pp, ...resto }) => resto

/** Descarga el libro en Excel; los errores llegan como ApiError con el mensaje del servidor */
export async function descargarExcel(libro, filtros) {
  let res
  try {
    res = await fetch(
      `/api/v1/libros/${libro}/excel?${consultaLibro(filtrosExportacion(filtros))}`,
      { credentials: 'include' },
    )
  } catch {
    throw new ApiError(0, 'SIN_CONEXION', 'No hay conexión con el sistema. Intente de nuevo.')
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new ApiError(
      res.status,
      json.error?.code ?? 'ERROR',
      json.error?.message ?? 'No se pudo generar el archivo de Excel. Intente de nuevo.',
    )
  }
  const nombre =
    /filename="?([^";]+)"?/.exec(res.headers.get('content-disposition') ?? '')?.[1] ??
    `libro-${libro}.xlsx`
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return nombre
}
