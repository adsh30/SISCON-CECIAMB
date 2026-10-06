import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { calcularVariacion, importarHistorialBcv } from '../src/modules/tasas/tasas.service.js'
import { testEnv } from './env.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const ANALISTA = { email: 'analista.tablero@pruebas.local', password: 'Clave-Analista-1' }

const json = (body) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

/** Simula ve.dolarapi.com (actual e histórico) y Binance P2P */
function simularFuentes() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url, opciones) => {
      if (url.includes('historicos/dolares')) {
        return json([
          { promedio: 860.1, fecha: '2026-09-30' },
          { promedio: 866.5612, fecha: '2026-10-02' },
          { promedio: 0, fecha: '2026-10-03' }, // inválida: se descarta
        ])
      }
      if (url.includes('historicos/euros')) return json([{ promedio: 975.5, fecha: '2026-10-02' }])
      if (url.includes('dolares')) {
        return json({ promedio: 871.3689, fechaActualizacion: '2026-10-05T00:00:00-04:00' })
      }
      if (url.includes('euros')) return json({ promedio: 981.1788 })
      const precios =
        JSON.parse(opciones.body).tradeType === 'BUY' ? [985, 986, 987] : [987, 988, 989]
      return json({ data: precios.map((price) => ({ adv: { price: String(price) } })) })
    }),
  )
}

async function sesion(credenciales) {
  const agent = request.agent(app)
  expect((await agent.post('/api/v1/auth/login').send(credenciales)).status).toBe(200)
  return agent
}

beforeAll(async () => {
  const rol = await db('roles').where({ codigo: 'ANALISTA' }).first()
  await db('usuarios')
    .insert({
      nombre: 'Analista Tablero',
      email: ANALISTA.email,
      password_hash: await bcrypt.hash(ANALISTA.password, 4),
      rol_id: rol.id,
    })
    .onConflict('email')
    .ignore()
})
beforeEach(async () => {
  await db('tasas_cambio').del()
  simularFuentes()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.destroy())

describe('historial del BCV', () => {
  it('importa las tasas oficiales sin pisar las guardadas y descarta valores inválidos', async () => {
    await db('tasas_cambio').insert({
      fecha: '2026-10-02',
      moneda: 'USD',
      fuente: 'BCV',
      tasa: '866.0000',
      obtenida_en: '2026-10-02 20:00:00',
    })
    expect(await importarHistorialBcv()).toBe(2) // USD 30-sep y EUR 02-oct
    const usd = await db('tasas_cambio').where({ moneda: 'USD' }).orderBy('fecha')
    expect(usd.map((f) => [f.fecha, f.tasa])).toEqual([
      ['2026-09-30', '860.1000'],
      ['2026-10-02', '866.0000'],
    ])
    expect(await importarHistorialBcv()).toBe(0)
  })

  it('variación diaria exacta', () => {
    expect(calcularVariacion('871.3689', '866.5612')).toBe('0.55')
    expect(calcularVariacion('860', '870')).toBe('-1.15')
    expect(calcularVariacion('860', null)).toBeNull()
  })

  it('GET /tasas/historial devuelve una serie por moneda dentro del rango', async () => {
    await importarHistorialBcv()
    const agent = await sesion(ANALISTA)
    const res = await agent.get('/api/v1/tasas/historial?desde=2026-10-01&hasta=2026-10-31')
    expect(res.status).toBe(200)
    expect(res.body.data.usd).toEqual([{ fecha: '2026-10-02', tasa: '866.5612' }])
    expect(res.body.data.eur).toHaveLength(1)
    expect(res.body.data.usdt).toEqual([])
  })

  it('valida el rango de fechas', async () => {
    const agent = await sesion(ANALISTA)
    const mal = await agent.get('/api/v1/tasas/historial?desde=2026-10-31&hasta=2026-10-01')
    expect(mal.status).toBe(400)
    expect((await agent.get('/api/v1/tasas/historial?desde=ayer')).status).toBe(400)
  })
})

describe('GET /api/v1/dashboard', () => {
  it('exige sesión', async () => {
    expect((await request(app).get('/api/v1/dashboard')).status).toBe(401)
  })

  it('el administrador ve tasas con variación, usuarios y actividad', async () => {
    await importarHistorialBcv()
    const agent = await sesion(ADMIN)
    const res = await agent.get('/api/v1/dashboard')
    expect(res.status).toBe(200)

    const { tasas, usuarios, actividad } = res.body.data
    expect(tasas.bcv.usd).toBe('871.3689')
    expect(tasas.variacion.usd).toEqual({
      anterior: '866.5612',
      fecha: '2026-10-02',
      porcentaje: '0.55',
    })
    expect(usuarios.activos).toBeGreaterThanOrEqual(2)
    expect(usuarios.porRol.find((r) => r.codigo === 'ADMIN').activos).toBeGreaterThanOrEqual(1)
    expect(actividad.recientes[0]).toMatchObject({ accion: 'LOGIN', entidad: 'usuarios' })
    expect(actividad.hoy.ingresos).toBeGreaterThanOrEqual(1)
  })

  it('sin permiso de usuarios ni bitácora, esos bloques no se envían', async () => {
    const agent = await sesion(ANALISTA)
    const res = await agent.get('/api/v1/dashboard')
    expect(res.status).toBe(200)
    expect(res.body.data.tasas.bcv).toBeTruthy()
    expect(res.body.data.usuarios).toBeNull()
    expect(res.body.data.actividad).toBeNull()
  })
})

describe('GET /api/v1/dashboard/actividad', () => {
  it('cuenta los eventos por día de Caracas', async () => {
    const agent = await sesion(ADMIN)
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date())
    const res = await agent.get(`/api/v1/dashboard/actividad?desde=${hoy}&hasta=${hoy}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].fecha).toBe(hoy)
    expect(res.body.data[0].total).toBeGreaterThanOrEqual(1)
  })

  it('el analista no tiene acceso a la bitácora', async () => {
    const agent = await sesion(ANALISTA)
    const res = await agent.get('/api/v1/dashboard/actividad?desde=2026-10-01&hasta=2026-10-06')
    expect(res.status).toBe(403)
  })
})
