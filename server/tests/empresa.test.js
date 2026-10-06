import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { rifSchema } from '../src/modules/empresa/empresa.schema.js'
import { testEnv } from './env.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const AUDITOR = { email: 'auditor.empresa@pruebas.local', password: 'Clave-Auditor-1' }

async function sesion(credenciales) {
  const agent = request.agent(app)
  expect((await agent.post('/api/v1/auth/login').send(credenciales)).status).toBe(200)
  return agent
}

const DATOS = {
  razonSocial: 'Hospital de Clínicas CECIAMB, C.A.',
  nombreComercial: 'CECIAMB',
  rif: 'j-40123456-7',
  direccion: 'Av. Principal, Puerto Ordaz',
  ciudad: 'Ciudad Guayana',
  estado: 'Bolívar',
  telefono: '0286-123 4567',
  email: 'Contabilidad@CECIAMB.com',
  sitioWeb: 'https://ceciamb.com',
}

// PNG 1×1 transparente
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

beforeAll(async () => {
  const rol = await db('roles').where({ codigo: 'AUDITOR' }).first()
  await db('usuarios')
    .insert({
      nombre: 'Auditora Empresa',
      email: AUDITOR.email,
      password_hash: await bcrypt.hash(AUDITOR.password, 4),
      rol_id: rol.id,
    })
    .onConflict('email')
    .ignore()
})
afterAll(() => db.destroy())

describe('RIF', () => {
  it('normaliza los formatos habituales', () => {
    expect(rifSchema.parse('j401234567')).toBe('J-40123456-7')
    expect(rifSchema.parse('J-40123456-7')).toBe('J-40123456-7')
    expect(rifSchema.parse('V 1234567 8')).toBe('V-01234567-8')
  })
  it('rechaza letras o largos inválidos', () => {
    expect(rifSchema.safeParse('X-12345678-9').success).toBe(false)
    expect(rifSchema.safeParse('J-123').success).toBe(false)
  })
})

describe('datos de la empresa', () => {
  it('vienen con los datos iniciales del hospital y sin RIF (incompleta)', async () => {
    const admin = await sesion(ADMIN)
    const res = await admin.get('/api/v1/empresa')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ nombreComercial: 'CECIAMB', monedaBase: 'VES' })
  })

  it('el administrador los actualiza normalizados y queda en bitácora', async () => {
    const admin = await sesion(ADMIN)
    const res = await admin.put('/api/v1/empresa').send(DATOS)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      rif: 'J-40123456-7',
      telefono: '02861234567',
      email: 'contabilidad@ceciamb.com',
      completa: true,
      actualizadoPor: 'Admin Pruebas',
    })
    const log = await db('bitacora')
      .where({ entidad: 'empresa', accion: 'EDITAR' })
      .orderBy('id', 'desc')
      .first()
    expect(log.datos_despues).toMatchObject({ rif: 'J-40123456-7' })
  })

  it('valida los campos', async () => {
    const admin = await sesion(ADMIN)
    const res = await admin.put('/api/v1/empresa').send({ ...DATOS, rif: '123', razonSocial: '' })
    expect(res.status).toBe(400)
    expect(res.body.error.details.map((d) => d.campo)).toEqual(
      expect.arrayContaining(['rif', 'razonSocial']),
    )
  })

  it('el auditor los ve pero no los modifica', async () => {
    const auditor = await sesion(AUDITOR)
    expect((await auditor.get('/api/v1/empresa')).status).toBe(200)
    expect((await auditor.put('/api/v1/empresa').send(DATOS)).status).toBe(403)
  })
})

describe('logo', () => {
  it('acepta PNG, lo devuelve con su tipo y se puede quitar', async () => {
    const admin = await sesion(ADMIN)
    const subir = await admin.put('/api/v1/empresa/logo').send({
      contenido: `data:image/png;base64,${PNG}`,
    })
    expect(subir.status).toBe(200)
    expect(subir.body.data.tieneLogo).toBe(true)

    const logo = await admin.get('/api/v1/empresa/logo')
    expect(logo.status).toBe(200)
    expect(logo.headers['content-type']).toBe('image/png')

    const quitar = await admin.delete('/api/v1/empresa/logo')
    expect(quitar.body.data.tieneLogo).toBe(false)
    expect((await admin.get('/api/v1/empresa/logo')).status).toBe(404)
  })

  it('rechaza archivos que no son imágenes aunque digan serlo, y los muy grandes', async () => {
    const admin = await sesion(ADMIN)
    const falso = Buffer.from('<svg onload="alert(1)">').toString('base64')
    const res = await admin.put('/api/v1/empresa/logo').send({ contenido: falso })
    expect(res.body.error.code).toBe('LOGO_INVALIDO')

    const grande = Buffer.alloc(600 * 1024, 0xff)
    grande.set([0xff, 0xd8, 0xff], 0)
    const res2 = await admin
      .put('/api/v1/empresa/logo')
      .send({ contenido: grande.toString('base64') })
    expect(res2.body.error.code).toBe('LOGO_GRANDE')
  })
})
