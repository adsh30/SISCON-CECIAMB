import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { MAX_INTENTOS } from '../src/modules/auth/auth.service.js'
import { testEnv } from './env.js'

const app = createApp()
const credenciales = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }

beforeEach(() =>
  db('usuarios')
    .where({ email: testEnv.ADMIN_EMAIL })
    .update({ intentos_fallidos: 0, bloqueado_hasta: null }),
)
afterAll(() => db.destroy())

describe('POST /api/v1/auth/login', () => {
  it('inicia sesión, devuelve el usuario y una cookie httpOnly', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(credenciales)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ email: testEnv.ADMIN_EMAIL, rol: 'ADMIN' })
    expect(res.body.data.password_hash).toBeUndefined()
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^siscon_sesion=/)
    expect(cookie).toMatch(/HttpOnly/)
  })

  it('acepta el correo con mayúsculas y espacios', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...credenciales, email: `  ${testEnv.ADMIN_EMAIL.toUpperCase()} ` })
    expect(res.status).toBe(200)
  })

  it('rechaza contraseña incorrecta con mensaje genérico', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...credenciales, password: 'mala' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('CREDENCIALES_INVALIDAS')
  })

  it('rechaza correo inexistente con el mismo mensaje', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@pruebas.local', password: 'x' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('CREDENCIALES_INVALIDAS')
  })

  it('valida el formato de los datos', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'no-es-correo' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDACION')
  })

  it(`bloquea el usuario tras ${MAX_INTENTOS} intentos fallidos`, async () => {
    for (let i = 1; i < MAX_INTENTOS; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ ...credenciales, password: 'mala' })
    }
    const ultimo = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...credenciales, password: 'mala' })
    expect(ultimo.status).toBe(423)

    // Incluso con la contraseña correcta sigue bloqueado
    const correcto = await request(app).post('/api/v1/auth/login').send(credenciales)
    expect(correcto.status).toBe(423)
    expect(correcto.body.error.code).toBe('USUARIO_BLOQUEADO')
  })

  it('registra el inicio de sesión en la bitácora', async () => {
    const antes = await db('bitacora').where({ accion: 'LOGIN' }).count({ n: '*' }).first()
    await request(app).post('/api/v1/auth/login').send(credenciales)
    const despues = await db('bitacora').where({ accion: 'LOGIN' }).count({ n: '*' }).first()
    expect(Number(despues.n)).toBe(Number(antes.n) + 1)
  })
})

describe('sesión', () => {
  it('GET /me sin cookie responde 401', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('GET /me con sesión devuelve el usuario y logout la cierra', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send(credenciales)

    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data.nombre).toBe(testEnv.ADMIN_NOMBRE)

    const out = await agent.post('/api/v1/auth/logout')
    expect(out.status).toBe(204)
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401)
  })

  it('rechaza un token manipulado', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', 'siscon_sesion=abc.def.ghi')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('SESION_EXPIRADA')
  })
})
