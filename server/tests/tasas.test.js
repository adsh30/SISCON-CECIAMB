import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { mediana } from '../src/modules/tasas/tasas.fuentes.js'
import { calcularBrecha } from '../src/modules/tasas/tasas.service.js'
import { testEnv } from './env.js'

const app = createApp()
const ANALISTA = { email: 'analista@pruebas.local', password: 'Clave-Analista-1' }

const respuestaJson = (body) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

const ofertas = (precios) => ({ data: precios.map((price) => ({ adv: { price } })) })

/** Simula ve.dolarapi.com y Binance P2P */
function simularFuentes({ usd = 871.3689, eur = 981.17880877, falla = false } = {}) {
  const fetchFalso = vi.fn((url, opciones) => {
    if (falla) return Promise.reject(new Error('sin red'))
    if (url.includes('dolares')) {
      return respuestaJson({ promedio: usd, fechaActualizacion: '2026-10-05T00:00:00-04:00' })
    }
    if (url.includes('euros')) return respuestaJson({ promedio: eur })
    const tipo = JSON.parse(opciones.body).tradeType
    return respuestaJson(
      tipo === 'BUY'
        ? ofertas(['984.00', '985.00', '986.00', '987.00', '990.00'])
        : ofertas(['986.00', '987.00', '988.00']),
    )
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

async function sesion(credenciales) {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send(credenciales)
  expect(res.status).toBe(200)
  return agent
}

beforeAll(async () => {
  const rol = await db('roles').where({ codigo: 'ANALISTA' }).first()
  await db('usuarios')
    .insert({
      nombre: 'Analista Pruebas',
      email: ANALISTA.email,
      password_hash: await bcrypt.hash(ANALISTA.password, 4),
      rol_id: rol.id,
    })
    .onConflict('email')
    .ignore()
})
beforeEach(() => db('tasas_cambio').del())
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.destroy())

describe('cálculos de tasas', () => {
  it('mediana exige al menos 3 ofertas', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
    expect(mediana([1, 2])).toBeNull()
  })

  it('brecha de Binance sobre BCV', () => {
    expect(calcularBrecha('871.37', '986.85')).toBe('11.70')
    expect(calcularBrecha(null, '986.85')).toBeNull()
  })
})

describe('GET /api/v1/tasas/actual', () => {
  it('exige sesión', async () => {
    expect((await request(app).get('/api/v1/tasas/actual')).status).toBe(401)
  })

  it('consulta las fuentes, guarda y devuelve BCV, Binance y brecha', async () => {
    simularFuentes()
    const agent = await sesion(ANALISTA)
    const res = await agent.get('/api/v1/tasas/actual')

    expect(res.status).toBe(200)
    expect(res.body.data.bcv).toMatchObject({
      usd: '871.3689',
      eur: '981.1788',
      fecha: '2026-10-05',
    })
    // Binance: mediana compra 986, venta 987 → promedio 986.5
    expect(res.body.data.binance).toMatchObject({
      usdt: '986.5000',
      compra: '986.0000',
      venta: '987.0000',
    })
    expect(res.body.data.brecha).toBe('11.67')
    expect(res.body.data.avisos).toEqual([])
    expect(await db('tasas_cambio').count({ n: '*' }).first()).toMatchObject({ n: 3 })
  })

  it('usa lo guardado sin volver a consultar mientras esté vigente', async () => {
    const fetchFalso = simularFuentes()
    const agent = await sesion(ANALISTA)
    await agent.get('/api/v1/tasas/actual')
    const llamadas = fetchFalso.mock.calls.length
    await agent.get('/api/v1/tasas/actual')
    expect(fetchFalso.mock.calls.length).toBe(llamadas)
  })

  it('si las fuentes fallan devuelve la última tasa guardada con un aviso', async () => {
    await db('tasas_cambio').insert({
      fecha: '2026-10-04',
      moneda: 'USD',
      fuente: 'BCV',
      tasa: '870.0000',
      obtenida_en: '2026-10-04 12:00:00',
    })
    simularFuentes({ falla: true })
    const agent = await sesion(ANALISTA)
    const res = await agent.get('/api/v1/tasas/actual')

    expect(res.status).toBe(200)
    expect(res.body.data.bcv.usd).toBe('870.0000')
    expect(res.body.data.binance).toBeNull()
    expect(res.body.data.avisos).toHaveLength(2)
  })
})

describe('POST /api/v1/tasas/actualizar', () => {
  it('el analista no puede forzar la actualización', async () => {
    const agent = await sesion(ANALISTA)
    expect((await agent.post('/api/v1/tasas/actualizar')).status).toBe(403)
  })

  it('el administrador fuerza la consulta y queda en bitácora', async () => {
    const fetchFalso = simularFuentes()
    const agent = await sesion({ email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD })
    await agent.get('/api/v1/tasas/actual')
    const antes = fetchFalso.mock.calls.length

    simularFuentes({ usd: 875.5 })
    const res = await agent.post('/api/v1/tasas/actualizar')
    expect(res.status).toBe(200)
    expect(res.body.data.bcv.usd).toBe('875.5000')
    expect(antes).toBeGreaterThan(0)

    const log = await db('bitacora')
      .where({ accion: 'ACTUALIZAR', entidad: 'tasas_cambio' })
      .orderBy('id', 'desc')
      .first()
    expect(log).toBeTruthy()
  })
})
