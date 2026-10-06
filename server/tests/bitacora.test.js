import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { ACCIONES, registrar } from '../src/modules/bitacora/bitacora.service.js'
import { testEnv } from './env.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const ANALISTA = { email: 'analista.bitacora@pruebas.local', password: 'Clave-Analista-1' }
const AUDITOR = { email: 'auditor.bitacora@pruebas.local', password: 'Clave-Auditor-1' }

async function crearUsuario({ email, password }, codigoRol, nombre) {
  const rol = await db('roles').where({ codigo: codigoRol }).first()
  await db('usuarios')
    .insert({ nombre, email, password_hash: await bcrypt.hash(password, 4), rol_id: rol.id })
    .onConflict('email')
    .ignore()
  return (await db('usuarios').where({ email }).first()).id
}

async function sesion(credenciales) {
  const agent = request.agent(app)
  expect((await agent.post('/api/v1/auth/login').send(credenciales)).status).toBe(200)
  return agent
}

let auditorId
let eventoEditar

beforeAll(async () => {
  await crearUsuario(ANALISTA, 'ANALISTA', 'Analista Bitácora')
  auditorId = await crearUsuario(AUDITOR, 'AUDITOR', 'Auditora Bitácora')
  await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'intruso.100@pruebas.local', password: 'x' })
  await registrar(null, {
    usuarioId: auditorId,
    accion: ACCIONES.EDITAR,
    entidad: 'roles',
    entidadId: 99,
    antes: { nombre: 'Viejo', color: '#000000' },
    despues: { nombre: 'Nuevo', color: '#000000' },
    ctx: { ip: '10.0.0.7', agente: 'pruebas' },
  })
  eventoEditar = await db('bitacora').where({ entidad_id: '99' }).orderBy('id', 'desc').first()
})
afterAll(() => db.destroy())

describe('GET /api/v1/bitacora', () => {
  it('exige sesión y permiso de bitácora', async () => {
    expect((await request(app).get('/api/v1/bitacora')).status).toBe(401)
    const analista = await sesion(ANALISTA)
    expect((await analista.get('/api/v1/bitacora')).status).toBe(403)
  })

  it('lista paginado del más reciente al más antiguo', async () => {
    const auditor = await sesion(AUDITOR)
    const res = await auditor.get('/api/v1/bitacora?porPagina=10')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(10)
    expect(res.body.meta).toMatchObject({ pagina: 1, porPagina: 10 })
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3)
    const ids = res.body.data.map((e) => e.id)
    expect(ids).toEqual([...ids].sort((a, b) => b - a))
  })

  it('filtra por acción, usuario y fecha de Caracas', async () => {
    const auditor = await sesion(AUDITOR)
    const fallidos = await auditor.get('/api/v1/bitacora?accion=LOGIN_FALLIDO')
    expect(fallidos.body.data.every((e) => e.accion === 'LOGIN_FALLIDO')).toBe(true)

    const delAuditor = await auditor.get(`/api/v1/bitacora?usuarioId=${auditorId}`)
    expect(delAuditor.body.data.every((e) => e.usuarioId === auditorId)).toBe(true)
    expect(delAuditor.body.data.map((e) => e.accion)).toContain('EDITAR')

    const futuro = await auditor.get('/api/v1/bitacora?desde=2099-01-01&hasta=2099-01-31')
    expect(futuro.body.meta.total).toBe(0)
  })

  it('busca dentro de los datos y trata % como texto', async () => {
    const auditor = await sesion(AUDITOR)
    const res = await auditor.get('/api/v1/bitacora').query({ buscar: 'intruso.100' })
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0].accion).toBe('LOGIN_FALLIDO')
    // Sin escapar, 'intruso.1%' funcionaría como comodín y encontraría el evento anterior
    const literal = await auditor.get('/api/v1/bitacora').query({ buscar: 'intruso.1%' })
    expect(literal.body.meta.total).toBe(0)
  })

  it('valida los filtros', async () => {
    const auditor = await sesion(AUDITOR)
    expect((await auditor.get('/api/v1/bitacora?porPagina=7')).status).toBe(400)
    expect((await auditor.get('/api/v1/bitacora?accion=BORRAR_TODO')).status).toBe(400)
    const rango = await auditor.get('/api/v1/bitacora?desde=2026-10-10&hasta=2026-10-01')
    expect(rango.status).toBe(400)
  })
})

describe('detalle y opciones', () => {
  it('devuelve los datos de antes y después como objetos', async () => {
    const auditor = await sesion(AUDITOR)
    const res = await auditor.get(`/api/v1/bitacora/${eventoEditar.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      accion: 'EDITAR',
      entidad: 'roles',
      entidadId: '99',
      ip: '10.0.0.7',
      agente: 'pruebas',
      antes: { nombre: 'Viejo' },
      despues: { nombre: 'Nuevo' },
    })
    expect((await auditor.get('/api/v1/bitacora/999999999')).status).toBe(404)
    expect((await auditor.get('/api/v1/bitacora/abc')).status).toBe(404)
  })

  it('ofrece usuarios, acciones y módulos presentes', async () => {
    const auditor = await sesion(AUDITOR)
    const res = await auditor.get('/api/v1/bitacora/opciones')
    expect(res.body.data.acciones).toEqual(expect.arrayContaining(['LOGIN', 'EDITAR']))
    expect(res.body.data.entidades).toContain('roles')
    expect(res.body.data.usuarios.map((u) => u.id)).toContain(auditorId)
  })
})

describe('GET /api/v1/bitacora/exportar', () => {
  it('descarga CSV para Excel y deja constancia de la exportación', async () => {
    const admin = await sesion(ADMIN)
    const res = await admin.get('/api/v1/bitacora/exportar?accion=EDITAR')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toMatch(/bitacora-\d{4}-\d{2}-\d{2}\.csv/)
    expect(res.text.charCodeAt(0)).toBe(0xfeff)
    const [encabezado, ...filas] = res.text.slice(1).split('\r\n')
    expect(encabezado).toContain('"Fecha y hora (Caracas)";"Usuario"')
    expect(filas.length).toBeGreaterThanOrEqual(1)
    expect(filas.every((f) => f.includes('"EDITAR"'))).toBe(true)
    expect(res.text).toContain('"{""nombre"":""Viejo""')

    const log = await db('bitacora').where({ accion: 'EXPORTAR' }).orderBy('id', 'desc').first()
    expect(log.datos_despues).toMatchObject({ filtros: { accion: 'EDITAR' } })
  })
})

describe('inmutabilidad', () => {
  it('la base de datos rechaza modificar o borrar eventos', async () => {
    await expect(
      db('bitacora').where({ id: eventoEditar.id }).update({ accion: 'LOGIN' }),
    ).rejects.toThrow(/no se puede modificar ni borrar/)
    await expect(db('bitacora').where({ id: eventoEditar.id }).del()).rejects.toThrow(
      /no se puede modificar ni borrar/,
    )
    expect(await db('bitacora').where({ id: eventoEditar.id }).first()).toMatchObject({
      accion: 'EDITAR',
    })
  })
})
