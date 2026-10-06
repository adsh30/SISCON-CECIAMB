import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { hayCliente } from '../src/config/cliente.js'
import { db } from '../src/config/db.js'
import { testEnv } from './env.js'

afterAll(() => db.destroy())

describe('modo producción en la red interna (http)', () => {
  it('la cookie de sesión no exige https salvo que se configure', async () => {
    const res = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD })
    expect(res.status).toBe(200)
    const cookie = res.headers['set-cookie'].join(';')
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).not.toMatch(/Secure/i)
  })

  it('no fuerza https ni HSTS', async () => {
    const res = await request(createApp()).get('/api/v1/health')
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests')
    expect(res.headers['strict-transport-security']).toBeUndefined()
  })
})

// Requiere la interfaz compilada (npm run build), como en producción y en CI
describe.runIf(hayCliente())('servir la interfaz compilada', () => {
  const app = createApp({ servirCliente: true })

  it('entrega index.html en las rutas de la aplicación', async () => {
    const res = await request(app).get('/app/bitacora')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.text).toContain('<div id="root">')
  })

  it('permite el script en línea del tema por su hash, sin unsafe-inline', async () => {
    const csp = (await request(app).get('/')).headers['content-security-policy']
    const scriptSrc = csp.split(';').find((d) => d.startsWith('script-src'))
    expect(scriptSrc).toMatch(/^script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/)
    expect(scriptSrc).not.toContain('unsafe-inline')
  })

  it('la API sigue respondiendo JSON y un recurso inexistente da 404', async () => {
    expect((await request(app).get('/api/v1/no-existe')).body.error.code).toBe('NO_ENCONTRADO')
    expect((await request(app).get('/assets/no-existe.js')).status).toBe(404)
  })

  it('sirve el manual', async () => {
    const res = await request(app).get('/manual.html')
    expect(res.status).toBe(200)
    expect(res.text).toContain('Bitácora de auditoría')
  })
})
