import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { fechaHoyVE } from '../src/utils/fechas.js'
import { testEnv } from './env.js'
import { limpiarComprobantes } from './limpiar.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const ANALISTA = { email: 'analista.importaciones@pruebas.local', password: 'Clave-Analista-1' }
const AUDITOR = { email: 'auditor.importaciones@pruebas.local', password: 'Clave-Auditor-1' }

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

const HOY = fechaHoyVE()
const ANIO = Number(HOY.slice(0, 4))

let admin, analista, auditor
const cuenta = {}
const tipo = {}

beforeAll(async () => {
  await crearUsuario(ANALISTA, 'ANALISTA', 'Analista Importaciones')
  await crearUsuario(AUDITOR, 'AUDITOR', 'Auditor Importaciones')
  ;[admin, analista, auditor] = await Promise.all([sesion(ADMIN), sesion(ANALISTA), sesion(AUDITOR)])
  await limpiarComprobantes()
  await db('ejercicios').del()
  const ej = await admin.post('/api/v1/periodos/ejercicios').send({ anio: ANIO, mesInicio: 1 })
  if (ej.status !== 201) throw new Error(`No se pudo crear el ejercicio: ${ej.body.error?.message}`)

  for (const c of await db('cuentas').select('id', 'codigo')) cuenta[c.codigo] = c.id
  for (const t of await db('tipos_comprobante').select('id', 'codigo')) tipo[t.codigo] = t.id
})

afterAll(async () => {
  await limpiarComprobantes()
  await db('ejercicios').del()
  await db.destroy()
})

const csvVenta = (monto = '1500,00') =>
  [
    'cuenta;descripcion;debe;haber',
    `1.1.01.01.001;Cobro de hospitalización;${monto};0`,
    `4.1.01;Cobro de hospitalización;0;${monto}`,
  ].join('\n')

describe('previsualizar', () => {
  it('ubica las cuentas por código y cuadra el resumen', async () => {
    const res = await analista.post('/api/v1/importaciones/previsualizar').send({ csv: csvVenta() })
    expect(res.status).toBe(200)
    expect(res.body.data.cuadrado).toBe(true)
    expect(res.body.data.conErrores).toBe(0)
    expect(res.body.data.totales).toEqual({ debe: '1500.00', haber: '1500.00' })
    expect(res.body.data.filas[0].cuentaNombre).toBeTruthy()
  })

  it('marca la fila con el error cuando la cuenta no existe', async () => {
    const csv = ['cuenta;debe;haber', '9.9.99;100;0'].join('\n')
    const res = await analista.post('/api/v1/importaciones/previsualizar').send({ csv })
    expect(res.status).toBe(200)
    expect(res.body.data.conErrores).toBe(1)
    expect(res.body.data.filas[0].error).toMatch(/no existe/)
  })

  it('rechaza un archivo sin la columna cuenta', async () => {
    const res = await analista
      .post('/api/v1/importaciones/previsualizar')
      .send({ csv: 'debe;haber\n100;0' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CSV_INVALIDO')
  })

  it('solo lectura (auditor) también puede previsualizar: no crea nada', async () => {
    const res = await auditor
      .post('/api/v1/importaciones/previsualizar')
      .send({ csv: csvVenta() })
    expect(res.status).toBe(403)
  })
})

describe('crear borrador', () => {
  it('arma el borrador cuando todas las filas están sanas', async () => {
    const res = await analista.post('/api/v1/importaciones/borrador').send({
      csv: csvVenta(),
      tipoId: tipo.VEN,
      fecha: HOY,
      concepto: 'Resumen de ventas del día',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.estado).toBe('BORRADOR')
    expect(res.body.data.renglones).toHaveLength(2)
    expect(res.body.data.totalDebe).toBe('1500.00')
    expect(res.body.data.totalHaber).toBe('1500.00')
  })

  it('rechaza el borrador si alguna fila tiene error', async () => {
    const csv = [
      'cuenta;debe;haber',
      `1.1.01.01.001;1500;0`,
      '9.9.99;0;1500', // cuenta inexistente
    ].join('\n')
    const res = await analista.post('/api/v1/importaciones/borrador').send({
      csv,
      tipoId: tipo.VEN,
      fecha: HOY,
      concepto: 'Resumen con error',
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('ARCHIVO_INVALIDO')
  })
})
