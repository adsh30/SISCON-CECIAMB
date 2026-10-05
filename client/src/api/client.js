export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function api(path, { method = 'GET', body, ...opts } = {}) {
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  })
  if (res.status === 204) return null
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = json.error ?? {}
    throw new ApiError(
      res.status,
      e.code ?? 'ERROR',
      e.message ?? 'Error de comunicación',
      e.details,
    )
  }
  return json
}
