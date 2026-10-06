// En producción el mismo servidor entrega la interfaz ya compilada (client/dist),
// así el sistema queda en una sola dirección: http://<equipo>:<puerto>
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DIST = fileURLToPath(new URL('../../../client/dist', import.meta.url))

export const hayCliente = () => existsSync(join(DIST, 'index.html'))

/**
 * Hashes CSP de los <script> en línea de las páginas compiladas (index.html aplica el tema
 * antes de pintar y el manual tiene el suyo). Así la CSP no necesita 'unsafe-inline'.
 */
export function hashesScriptsEnLinea() {
  if (!hayCliente()) return []
  const hashes = new Set()
  for (const archivo of readdirSync(DIST).filter((a) => a.endsWith('.html'))) {
    const html = readFileSync(join(DIST, archivo), 'utf8')
    for (const [, codigo] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      if (codigo.trim()) {
        hashes.add(`'sha256-${createHash('sha256').update(codigo).digest('base64')}'`)
      }
    }
  }
  return [...hashes]
}
