import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'

const app = createApp()

afterAll(() => db.destroy())

describe('GET /api/v1/health', () => {
  it('responde ok y confirma conexión a la base de datos', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.data.api).toBe('ok')
    expect(res.body.data.baseDatos.estado).toBe('ok')
    expect(res.body.data.baseDatos.nombre).toBe('siscon_test')
  })
})

describe('rutas inexistentes', () => {
  it('devuelve 404 con formato de error estándar', async () => {
    const res = await request(app).get('/api/v1/no-existe')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NO_ENCONTRADO')
  })
})
