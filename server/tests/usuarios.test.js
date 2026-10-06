import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { generarClaveTemporal } from '../src/modules/usuarios/usuarios.service.js'
import { testEnv } from './env.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
let admin
let roles

async function sesion(credenciales) {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send(credenciales)
  expect(res.status).toBe(200)
  return agent
}

const nuevo = (extra = {}) => ({
  nombre: 'maría josé',
  apellido: 'pérez',
  ci: String(10000000 + Math.floor(Math.random() * 8999999)),
  email: `u${Date.now()}${Math.floor(Math.random() * 1000)}@pruebas.local`,
  telefono: '04141234567',
  departamento: 'Contabilidad',
  rolId: roles.ANALISTA,
  ...extra,
})

/** Crea un usuario, cambia su clave temporal y devuelve su sesión. */
async function usuarioListo(rolId) {
  const datos = nuevo({ rolId })
  const creado = await admin.post('/api/v1/usuarios').send(datos)
  expect(creado.status).toBe(201)
  const agent = await sesion({ email: datos.email, password: creado.body.data.claveTemporal })
  const cambio = await agent.post('/api/v1/auth/cambiar-clave').send({
    actual: creado.body.data.claveTemporal,
    nueva: 'NuevaClave123',
    confirmacion: 'NuevaClave123',
  })
  expect(cambio.status).toBe(200)
  return { agent, id: creado.body.data.usuario.id, email: datos.email }
}

beforeAll(async () => {
  const filas = await db('roles').select('id', 'codigo')
  roles = Object.fromEntries(filas.map((r) => [r.codigo, r.id]))
  admin = await sesion(ADMIN)
})
afterAll(() => db.destroy())

describe('clave temporal', () => {
  it('tiene 10 caracteres con letras y números, sin ambiguos', () => {
    for (let i = 0; i < 50; i++) {
      const c = generarClaveTemporal()
      expect(c).toMatch(/^[a-zA-Z2-9]{10}$/)
      expect(c).toMatch(/\d/)
      expect(c).toMatch(/[a-zA-Z]/)
      expect(c).not.toMatch(/[01lIoO]/)
    }
  })
})

describe('gestión de usuarios', () => {
  it('crea un usuario con clave temporal y normaliza los datos', async () => {
    const datos = nuevo()
    const res = await admin.post('/api/v1/usuarios').send(datos)
    expect(res.status).toBe(201)
    expect(res.body.data.claveTemporal).toHaveLength(10)
    expect(res.body.data.usuario).toMatchObject({
      nombre: 'MARÍA JOSÉ',
      apellido: 'PÉREZ',
      debeCambiarClave: true,
      activo: true,
      rol: { codigo: 'ANALISTA' },
    })
  })

  it('rechaza correo o cédula duplicados', async () => {
    const datos = nuevo()
    await admin.post('/api/v1/usuarios').send(datos)
    const mismoCorreo = await admin.post('/api/v1/usuarios').send({ ...datos, ci: '7654321' })
    expect(mismoCorreo.status).toBe(409)
    expect(mismoCorreo.body.error.code).toBe('EMAIL_DUPLICADO')
    const mismaCi = await admin
      .post('/api/v1/usuarios')
      .send({ ...datos, email: 'otro@pruebas.local' })
    expect(mismaCi.body.error.code).toBe('CI_DUPLICADA')
  })

  it('valida los campos', async () => {
    const res = await admin
      .post('/api/v1/usuarios')
      .send({ ...nuevo(), nombre: 'Juan123', ci: 'abc', email: 'x' })
    expect(res.status).toBe(400)
    const campos = res.body.error.details.map((d) => d.campo)
    expect(campos).toEqual(expect.arrayContaining(['nombre', 'ci', 'email']))
  })

  it('con clave temporal solo puede cambiarla; luego entra normalmente', async () => {
    const datos = nuevo()
    const creado = await admin.post('/api/v1/usuarios').send(datos)
    const temporal = creado.body.data.claveTemporal
    const agent = await sesion({ email: datos.email, password: temporal })

    const me = await agent.get('/api/v1/auth/me')
    expect(me.body.data.debeCambiarClave).toBe(true)
    expect((await agent.get('/api/v1/tasas/actual')).body.error.code).toBe('DEBE_CAMBIAR_CLAVE')

    const debil = await agent
      .post('/api/v1/auth/cambiar-clave')
      .send({ actual: temporal, nueva: 'corta', confirmacion: 'corta' })
    expect(debil.status).toBe(400)

    const ok = await agent
      .post('/api/v1/auth/cambiar-clave')
      .send({ actual: temporal, nueva: 'MiClave2026', confirmacion: 'MiClave2026' })
    expect(ok.status).toBe(200)
    expect(ok.body.data.debeCambiarClave).toBe(false)
  })

  it('un usuario deshabilitado pierde la sesión y no puede entrar', async () => {
    const { agent, id, email } = await usuarioListo(roles.ANALISTA)
    expect((await agent.get('/api/v1/auth/me')).status).toBe(200)

    const off = await admin.patch(`/api/v1/usuarios/${id}/estado`).send({ activo: false })
    expect(off.body.data.activo).toBe(false)
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401)

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'NuevaClave123' })
    expect(login.status).toBe(403)
    expect(login.body.error.code).toBe('USUARIO_INACTIVO')
  })

  it('archiva solo usuarios deshabilitados y habilitar lo desarchiva', async () => {
    const { id } = await usuarioListo(roles.ANALISTA)
    expect((await admin.post(`/api/v1/usuarios/${id}/archivar`)).body.error.code).toBe(
      'USUARIO_ACTIVO',
    )
    await admin.patch(`/api/v1/usuarios/${id}/estado`).send({ activo: false })
    const arch = await admin.post(`/api/v1/usuarios/${id}/archivar`)
    expect(arch.body.data.archivadoEn).toBeTruthy()
    expect(arch.body.data.archivadoPor).toBe(testEnv.ADMIN_NOMBRE)

    const lista = await admin.get('/api/v1/usuarios?estado=archivados')
    expect(lista.body.data.some((u) => u.id === id)).toBe(true)
    expect(lista.body.meta.resumen.archivados).toBeGreaterThan(0)

    const on = await admin.patch(`/api/v1/usuarios/${id}/estado`).send({ activo: true })
    expect(on.body.data).toMatchObject({ activo: true, archivadoEn: null })
  })

  it('resetear clave obliga a cambiarla de nuevo', async () => {
    const { id, email } = await usuarioListo(roles.ANALISTA)
    const res = await admin.post(`/api/v1/usuarios/${id}/resetear-clave`)
    expect(res.body.data.claveTemporal).toHaveLength(10)
    const agent = await sesion({ email, password: res.body.data.claveTemporal })
    expect((await agent.get('/api/v1/auth/me')).body.data.debeCambiarClave).toBe(true)
  })

  it('protege al último administrador y a uno mismo', async () => {
    const yo = (await admin.get('/api/v1/auth/me')).body.data
    const auto = await admin.patch(`/api/v1/usuarios/${yo.id}/estado`).send({ activo: false })
    expect(auto.body.error.code).toBe('AUTO_DESACTIVAR')
  })

  it('busca por nombre, cédula o correo', async () => {
    const datos = nuevo({ nombre: 'Eustaquio' })
    await admin.post('/api/v1/usuarios').send(datos)
    const res = await admin.get('/api/v1/usuarios').query({ buscar: 'eustaquio' })
    expect(res.body.data.map((u) => u.email)).toContain(datos.email)
    const porCi = await admin.get('/api/v1/usuarios').query({ buscar: datos.ci })
    expect(porCi.body.data).toHaveLength(1)
  })

  it('registra la creación en la bitácora con los datos', async () => {
    const datos = nuevo()
    const res = await admin.post('/api/v1/usuarios').send(datos)
    const log = await db('bitacora')
      .where({ entidad: 'usuarios', accion: 'CREAR', entidad_id: String(res.body.data.usuario.id) })
      .first()
    expect(log).toBeTruthy()
    expect(JSON.stringify(log.datos_despues)).toContain(datos.email)
  })
})

describe('perfil propio', () => {
  it('cada usuario actualiza sus datos de contacto', async () => {
    const { agent } = await usuarioListo(roles.ANALISTA)
    const res = await agent
      .put('/api/v1/auth/perfil')
      .send({ nombre: 'ana', apellido: 'gómez', telefono: '', departamento: 'Caja' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      nombre: 'ANA',
      apellido: 'GÓMEZ',
      telefono: null,
      departamento: 'Caja',
    })
  })
})

describe('roles y permisos', () => {
  it('el analista no puede ver ni gestionar usuarios', async () => {
    const { agent } = await usuarioListo(roles.ANALISTA)
    expect((await agent.get('/api/v1/usuarios')).status).toBe(403)
    expect((await agent.post('/api/v1/roles').send({ nombre: 'X' })).status).toBe(403)
  })

  it('el auditor ve usuarios pero no los modifica', async () => {
    const { agent } = await usuarioListo(roles.AUDITOR)
    expect((await agent.get('/api/v1/usuarios')).status).toBe(200)
    expect((await agent.post('/api/v1/usuarios').send(nuevo())).status).toBe(403)
  })

  it('crea un rol, ajusta su matriz y el cambio aplica de inmediato', async () => {
    const rol = await admin
      .post('/api/v1/roles')
      .send({ nombre: `Caja ${Date.now()}`, descripcion: 'Cajeros', color: '#0f766e' })
    expect(rol.status).toBe(201)
    expect(rol.body.data.codigo).toMatch(/^CAJA_\d+/)
    expect(rol.body.data.permisos.usuarios).toEqual({
      lectura: false,
      escritura: false,
      full: false,
    })

    const { agent } = await usuarioListo(rol.body.data.id)
    expect((await agent.get('/api/v1/usuarios')).status).toBe(403)

    const permisos = {
      ...rol.body.data.permisos,
      usuarios: { lectura: true, escritura: false, full: false },
    }
    const upd = await admin.put(`/api/v1/roles/${rol.body.data.id}/permisos`).send({ permisos })
    expect(upd.status).toBe(200)
    expect((await agent.get('/api/v1/usuarios')).status).toBe(200)
    expect((await agent.get('/api/v1/auth/me')).body.data.permisos.usuarios.lectura).toBe(true)
  })

  it('full implica lectura y escritura', async () => {
    const rol = await admin.post('/api/v1/roles').send({ nombre: `Full ${Date.now()}` })
    const permisos = {
      ...rol.body.data.permisos,
      libros: { lectura: false, escritura: false, full: true },
    }
    const upd = await admin.put(`/api/v1/roles/${rol.body.data.id}/permisos`).send({ permisos })
    expect(upd.body.data.permisos.libros).toEqual({ lectura: true, escritura: true, full: true })
  })

  it('no permite eliminar roles de sistema ni roles en uso', async () => {
    expect((await admin.delete(`/api/v1/roles/${roles.CONTADOR}`)).body.error.code).toBe(
      'ROL_SISTEMA',
    )
    const rol = await admin.post('/api/v1/roles').send({ nombre: `Uso ${Date.now()}` })
    await usuarioListo(rol.body.data.id)
    const del = await admin.delete(`/api/v1/roles/${rol.body.data.id}`)
    expect(del.body.error.code).toBe('ROL_EN_USO')
  })

  it('elimina un rol sin usuarios', async () => {
    const rol = await admin.post('/api/v1/roles').send({ nombre: `Temporal ${Date.now()}` })
    expect((await admin.delete(`/api/v1/roles/${rol.body.data.id}`)).status).toBe(204)
  })

  it('los permisos del administrador no se modifican', async () => {
    const res = await admin
      .put(`/api/v1/roles/${roles.ADMIN}/permisos`)
      .send({ permisos: { usuarios: { lectura: false, escritura: false, full: false } } })
    expect(res.body.error.code).toBe('ROL_SUPERUSUARIO')
  })

  it('rechaza nombres de rol repetidos', async () => {
    const nombre = `Repetido ${Date.now()}`
    await admin.post('/api/v1/roles').send({ nombre })
    expect((await admin.post('/api/v1/roles').send({ nombre })).body.error.code).toBe(
      'ROL_DUPLICADO',
    )
  })
})
