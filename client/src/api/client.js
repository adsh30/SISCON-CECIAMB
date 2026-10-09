export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Errores de conexión: el navegador no llegó al servidor o el servidor no respondió */
export const CODIGOS_CONEXION = new Set(['SIN_CONEXION', 'SERVIDOR_NO_RESPONDE'])
export const esErrorDeConexion = (e) => CODIGOS_CONEXION.has(e?.code)

const SIN_CONEXION =
  'No hay conexión con el sistema. Revise la red o que el equipo servidor esté encendido; se reintentará solo.'
const SERVIDOR_NO_RESPONDE =
  'El servidor del sistema no está respondiendo. Espere un momento; se reintentará solo.'

export async function api(path, { method = 'GET', body, ...opts } = {}) {
  let res
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    })
  } catch {
    // fetch solo falla así cuando no hay red o nadie atiende (el "Failed to fetch" del navegador)
    throw new ApiError(0, 'SIN_CONEXION', SIN_CONEXION)
  }
  if (res.status === 204) return null

  const esJson = res.headers.get('content-type')?.includes('application/json')
  if (!esJson) {
    // El proxy de desarrollo responde 5xx en texto si la API está apagada, y una página HTML
    // si la petición no llegó a la API: en ambos casos el servidor del sistema no respondió
    throw new ApiError(res.status || 502, 'SERVIDOR_NO_RESPONDE', SERVIDOR_NO_RESPONDE)
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = json.error ?? {}
    throw new ApiError(
      res.status,
      e.code ?? 'ERROR',
      e.message ?? `Ocurrió un error inesperado (código ${res.status}). Intente de nuevo.`,
      e.details,
    )
  }
  return json
}
