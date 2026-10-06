import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { generarPeriodos } from '../src/modules/periodos/periodos.fechas.js'
import { exigirPeriodoAbierto } from '../src/modules/periodos/periodos.service.js'
import { testEnv } from './env.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const CONTADOR = { email: 'contador.periodos@pruebas.local', password: 'Clave-Contador-1' }
const ANALISTA = { email: 'analista.periodos@pruebas.local', password: 'Clave-Analista-1' }

async function crearUsuario({ email, password }, codigo, nombre) {
  const rol = await db('roles').where({ codigo }).first()
  await db('usuarios')
    .insert({ nombre, email, password_hash: await bcrypt.hash(password, 4), rol_id: rol.id })
    .onConflict('email')
    .ignore()
}

async function sesion(credenciales) {
  const agent = request.agent(app)
  expect((await agent.post('/api/v1/auth/login').send(credenciales)).status).toBe(200)
  return agent
}

let admin, contador, analista

beforeAll(async () => {
  await crearUsuario(CONTADOR, 'CONTADOR', 'Contador Períodos')
  await crearUsuario(ANALISTA, 'ANALISTA', 'Analista Períodos')
  ;[admin, contador, analista] = await Promise.all([
    sesion(ADMIN),
    sesion(CONTADOR),
    sesion(ANALISTA),
  ])
})
beforeEach(() => db('ejercicios').del())
afterAll(() => db.destroy())

const crear = (agent, anio, mesInicio) =>
  agent.post('/api/v1/periodos/ejercicios').send({ anio, mesInicio })

/** Período del ejercicio creado, por número (1..12) */
const periodo = (ejercicio, numero) => ejercicio.periodos.find((p) => p.numero === numero)

describe('generación de períodos', () => {
  it('enero a diciembre con el último día de cada mes (febrero bisiesto)', () => {
    const p = generarPeriodos(2024)
    expect(p).toHaveLength(12)
    expect(p[1]).toMatchObject({ mes: 2, fecha_inicio: '2024-02-01', fecha_fin: '2024-02-29' })
    expect(p[11].fecha_fin).toBe('2024-12-31')
  })

  it('un ejercicio que empieza en julio cruza al año siguiente', () => {
    const p = generarPeriodos(2025, 7)
    expect(p[0]).toMatchObject({ anio: 2025, mes: 7, fecha_inicio: '2025-07-01' })
    expect(p[11]).toMatchObject({ anio: 2026, mes: 6, fecha_fin: '2026-06-30' })
  })
})

describe('ejercicios', () => {
  it('crea el ejercicio con sus 12 períodos abiertos y queda en bitácora', async () => {
    const res = await crear(contador, 2020, 1)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      nombre: 'Ejercicio 2020',
      fechaInicio: '2020-01-01',
      fechaFin: '2020-12-31',
      estado: 'ABIERTO',
    })
    expect(res.body.data.periodos).toHaveLength(12)
    expect(res.body.data.periodos.every((p) => p.estado === 'ABIERTO')).toBe(true)
    const log = await db('bitacora')
      .where({ entidad: 'ejercicios', accion: 'CREAR' })
      .orderBy('id', 'desc')
      .first()
    expect(log.datos_despues).toMatchObject({ anio: 2020, periodos: 12 })
  })

  it('nombra los ejercicios que cruzan de año', async () => {
    const res = await crear(admin, 2025, 7)
    expect(res.body.data.nombre).toBe('Ejercicio 2025-2026')
  })

  it('exige ejercicios contiguos y sin repetir', async () => {
    await crear(admin, 2020, 1)
    expect((await crear(admin, 2020, 1)).body.error.code).toBe('EJERCICIO_DUPLICADO')
    expect((await crear(admin, 2021, 1)).status).toBe(201) // después del último
    expect((await crear(admin, 2019, 1)).status).toBe(201) // antes del primero
    const hueco = await crear(admin, 2023, 1)
    expect(hueco.status).toBe(409)
    expect(hueco.body.error.code).toBe('EJERCICIO_NO_CONTIGUO')
    expect(hueco.body.error.message).toContain('01/01/2022')
  })

  it('el analista no puede crear ejercicios', async () => {
    expect((await crear(analista, 2020, 1)).status).toBe(403)
    expect((await analista.get('/api/v1/periodos')).status).toBe(200)
  })

  it('solo se elimina el primero o el último, sin períodos cerrados, con control total', async () => {
    const e19 = (await crear(admin, 2019, 1)).body.data
    const e20 = (await crear(admin, 2020, 1)).body.data
    await crear(admin, 2021, 1)

    expect((await contador.delete(`/api/v1/periodos/ejercicios/${e19.id}`)).status).toBe(403)
    const medio = await admin.delete(`/api/v1/periodos/ejercicios/${e20.id}`)
    expect(medio.body.error.code).toBe('EJERCICIO_INTERMEDIO')

    await admin.post(`/api/v1/periodos/${periodo(e19, 1).id}/cerrar`)
    const conCierre = await admin.delete(`/api/v1/periodos/ejercicios/${e19.id}`)
    expect(conCierre.body.error.code).toBe('EJERCICIO_CON_CIERRES')

    await admin
      .post(`/api/v1/periodos/${periodo(e19, 1).id}/reabrir`)
      .send({ motivo: 'Prueba de eliminación' })
    expect((await admin.delete(`/api/v1/periodos/ejercicios/${e19.id}`)).status).toBe(204)
    expect(await db('periodos').where({ ejercicio_id: e19.id }).first()).toBeUndefined()
  })
})

describe('cierre y reapertura', () => {
  it('se cierra en orden y el contador puede cerrar', async () => {
    const e = (await crear(admin, 2020, 1)).body.data
    const marzo = await contador.post(`/api/v1/periodos/${periodo(e, 3).id}/cerrar`)
    expect(marzo.body.error.code).toBe('ANTERIORES_ABIERTOS')
    expect(marzo.body.error.message).toContain('Enero 2020')

    const enero = await contador.post(`/api/v1/periodos/${periodo(e, 1).id}/cerrar`)
    expect(enero.status).toBe(200)
    expect(enero.body.data).toMatchObject({ estado: 'CERRADO', cerradoPor: 'Contador Períodos' })

    const otraVez = await contador.post(`/api/v1/periodos/${periodo(e, 1).id}/cerrar`)
    expect(otraVez.body.error.code).toBe('PERIODO_CERRADO')

    const log = await db('bitacora')
      .where({ accion: 'CERRAR_PERIODO' })
      .orderBy('id', 'desc')
      .first()
    expect(log.datos_despues).toMatchObject({ periodo: 'Enero 2020', estado: 'CERRADO' })
  })

  it('no permite cerrar meses que no han comenzado', async () => {
    const e = (await crear(admin, 2099, 1)).body.data
    const res = await admin.post(`/api/v1/periodos/${periodo(e, 1).id}/cerrar`)
    expect(res.body.error.code).toBe('PERIODO_FUTURO')
  })

  it('el analista no cierra y el contador no reabre', async () => {
    const e = (await crear(admin, 2020, 1)).body.data
    const id = periodo(e, 1).id
    expect((await analista.post(`/api/v1/periodos/${id}/cerrar`)).status).toBe(403)
    await contador.post(`/api/v1/periodos/${id}/cerrar`)
    const res = await contador
      .post(`/api/v1/periodos/${id}/reabrir`)
      .send({ motivo: 'Corregir un asiento' })
    expect(res.status).toBe(403)
  })

  it('reabrir exige motivo y empieza por el último cerrado', async () => {
    const e = (await crear(admin, 2020, 1)).body.data
    for (const n of [1, 2]) await admin.post(`/api/v1/periodos/${periodo(e, n).id}/cerrar`)

    const sinMotivo = await admin
      .post(`/api/v1/periodos/${periodo(e, 1).id}/reabrir`)
      .send({ motivo: 'corto' })
    expect(sinMotivo.status).toBe(400)

    const enero = await admin
      .post(`/api/v1/periodos/${periodo(e, 1).id}/reabrir`)
      .send({ motivo: 'Corregir la depreciación de enero' })
    expect(enero.body.error.code).toBe('POSTERIORES_CERRADOS')
    expect(enero.body.error.message).toContain('Febrero 2020')

    const febrero = await admin
      .post(`/api/v1/periodos/${periodo(e, 2).id}/reabrir`)
      .send({ motivo: 'Factura de proveedor recibida tarde' })
    expect(febrero.status).toBe(200)
    expect(febrero.body.data).toMatchObject({
      estado: 'ABIERTO',
      reabiertoPor: 'Admin Pruebas',
      motivoReapertura: 'Factura de proveedor recibida tarde',
    })
    const log = await db('bitacora')
      .where({ accion: 'REABRIR_PERIODO' })
      .orderBy('id', 'desc')
      .first()
    expect(log.datos_despues).toMatchObject({ motivo: 'Factura de proveedor recibida tarde' })
  })

  it('el ejercicio figura cerrado cuando se cierran sus 12 meses', async () => {
    const e = (await crear(admin, 2020, 1)).body.data
    for (let n = 1; n <= 12; n++) await admin.post(`/api/v1/periodos/${periodo(e, n).id}/cerrar`)
    const lista = await admin.get('/api/v1/periodos')
    expect(lista.body.data.ejercicios[0]).toMatchObject({ estado: 'CERRADO', cerrados: 12 })
  })
})

describe('regla para comprobantes: fecha en período abierto', () => {
  it('rechaza fechas sin período o en período cerrado y acepta las abiertas', async () => {
    const e = (await crear(admin, 2020, 1)).body.data
    await admin.post(`/api/v1/periodos/${periodo(e, 1).id}/cerrar`)

    await db.transaction(async (trx) => {
      await expect(exigirPeriodoAbierto('2018-05-10', trx)).rejects.toMatchObject({
        code: 'SIN_PERIODO',
      })
      await expect(exigirPeriodoAbierto('2020-01-15', trx)).rejects.toMatchObject({
        code: 'PERIODO_CERRADO',
      })
      expect(await exigirPeriodoAbierto('2020-02-29', trx)).toMatchObject({
        nombre: 'Febrero 2020',
      })
    })
  })
})
