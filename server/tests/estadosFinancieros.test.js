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
const AUDITOR = { email: 'auditor.estados@pruebas.local', password: 'Clave-Auditor-1' }

const ANIO = Number(fechaHoyVE().slice(0, 4))
const dia = (m, d) => `${ANIO}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

let admin, auditor
const cuenta = {}
const tipo = {}

async function sesion(credenciales) {
  const agent = request.agent(app)
  expect((await agent.post('/api/v1/auth/login').send(credenciales)).status).toBe(200)
  return agent
}

async function asiento(fecha, renglones, { tipoCodigo = 'DIA', concepto } = {}) {
  const res = await admin.post('/api/v1/comprobantes').send({
    tipoId: tipo[tipoCodigo],
    fecha,
    concepto: concepto ?? `Asiento del ${fecha}`,
    renglones: renglones.map(([codigo, debe, haber]) => ({
      cuentaId: cuenta[codigo],
      debe,
      haber,
    })),
  })
  if (res.status !== 201) throw new Error(`No se pudo crear: ${res.body.error?.message}`)
  const ok = await admin.post(`/api/v1/comprobantes/${res.body.data.id}/aprobar`)
  if (ok.status !== 200) throw new Error(`No se pudo aprobar: ${ok.body.error?.message}`)
  return res.body.data.id
}

const CAJA = '1.1.01.01.001'
const BANCO = '1.1.01.02.001'
const CXP = '2.1.01.01'
const CAPITAL = '3.1.01'
const INGRESO = '4.1.01'
const COSTO = '5.1.01'
const GASTO = '6.1.01'

beforeAll(async () => {
  const rol = await db('roles').where({ codigo: 'AUDITOR' }).first()
  await db('usuarios')
    .insert({
      nombre: 'Auditor Estados',
      email: AUDITOR.email,
      password_hash: await bcrypt.hash(AUDITOR.password, 4),
      rol_id: rol.id,
    })
    .onConflict('email')
    .ignore()
  ;[admin, auditor] = await Promise.all([sesion(ADMIN), sesion(AUDITOR)])

  await limpiarComprobantes()
  await db('ejercicios').del()
  const ej = await admin.post('/api/v1/periodos/ejercicios').send({ anio: ANIO, mesInicio: 1 })
  if (ej.status !== 201) throw new Error(`No se pudo crear ejercicio: ${ej.body.error?.message}`)

  for (const c of await db('cuentas').select('id', 'codigo')) cuenta[c.codigo] = c.id
  for (const t of await db('tipos_comprobante').select('id', 'codigo')) tipo[t.codigo] = t.id

  // 1. Aporte de capital en enero: Caja 10.000, Capital 10.000
  await asiento(dia(1, 5), [
    [CAJA, '10000.00', '0'],
    [CAPITAL, '0', '10000.00'],
  ])

  // 2. Ingreso por servicios médicos hospitalarios en enero: Banco 8.000, Ingreso 8.000
  await asiento(dia(1, 15), [
    [BANCO, '8000.00', '0'],
    [INGRESO, '0', '8000.00'],
  ])

  // 3. Costos médicos en enero: Costo 3.000, CxP 3.000
  await asiento(dia(1, 20), [
    [COSTO, '3000.00', '0'],
    [CXP, '0', '3000.00'],
  ])

  // 4. Gastos operativos en enero: Gasto 1.500, Banco 1.500
  await asiento(dia(1, 25), [
    [GASTO, '1500.00', '0'],
    [BANCO, '0', '1500.00'],
  ])
})

afterAll(async () => {
  await limpiarComprobantes()
  await db('ejercicios').del()
})

describe('Estados Financieros: Balance General y Estado de Resultados', () => {
  it('el Auditor con permiso de lectura puede consultar ambos estados', async () => {
    const [bg, er] = await Promise.all([
      auditor.get('/api/v1/libros/balance-general').query({ hasta: dia(1, 31) }),
      auditor.get('/api/v1/libros/estado-resultados').query({ desde: dia(1, 1), hasta: dia(1, 31) }),
    ])
    expect(bg.status).toBe(200)
    expect(er.status).toBe(200)
  })

  it('Balance General: calcula activos, pasivos y patrimonio con cuadre exacto de la ecuación patrimonial', async () => {
    const res = await admin
      .get('/api/v1/libros/balance-general')
      .query({ hasta: dia(1, 31) })
    expect(res.status).toBe(200)

    const { data } = res.body
    // Activo = Caja (10.000) + Banco (8.000 - 1.500 = 6.500) = 16.500,00
    expect(data.activo.total).toBe('16500.00')
    // Pasivo = CxP = 3.000,00
    expect(data.pasivo.total).toBe('3000.00')
    // Patrimonio cuentas = Capital = 10.000,00
    expect(data.patrimonio.totalCuentas).toBe('10000.00')
    // Resultado del Ejercicio = Ingresos (8.000) - Costos (3.000) - Gastos (1.500) = 3.500,00
    expect(data.patrimonio.resultadoEjercicio).toBe('3500.00')
    expect(data.patrimonio.esUtilidad).toBe(true)
    // Total Patrimonio = 10.000 + 3.500 = 13.500,00
    expect(data.patrimonio.total).toBe('13500.00')
    // Total Pasivo + Patrimonio = 3.000 + 13.500 = 16.500,00
    expect(data.totales.totalPasivoPatrimonio).toBe('16500.00')
    // Cuadre perfecto: 16.500 = 16.500
    expect(data.totales.cuadrado).toBe(true)
    expect(data.totales.diferencia).toBe('0.00')
  })

  it('Estado de Resultados: desglosa Ingresos, Costos, Utilidad Bruta, Gastos y Utilidad Neta', async () => {
    const res = await admin
      .get('/api/v1/libros/estado-resultados')
      .query({ desde: dia(1, 1), hasta: dia(1, 31) })
    expect(res.status).toBe(200)

    const { data } = res.body
    expect(data.ingresos.total).toBe('8000.00')
    expect(data.costos.total).toBe('3000.00')
    expect(data.utilidadBruta).toBe('5000.00')
    expect(data.gastos.total).toBe('1500.00')
    expect(data.utilidadNeta).toBe('3500.00')
    expect(data.totales.esUtilidad).toBe(true)
  })

  it('concordancia financiera: la Utilidad Neta del Estado de Resultados coincide con el Resultado del Ejercicio en el Balance General', async () => {
    const [bg, er] = await Promise.all([
      admin.get('/api/v1/libros/balance-general').query({ hasta: dia(1, 31) }),
      admin.get('/api/v1/libros/estado-resultados').query({ desde: dia(1, 1), hasta: dia(1, 31) }),
    ])
    expect(bg.body.data.patrimonio.resultadoEjercicio).toBe(er.body.data.utilidadNeta)
  })

  it('descarga oficial en Excel (.xlsx) de ambos estados financieros', async () => {
    const [resBg, resEr] = await Promise.all([
      admin.get('/api/v1/libros/balance-general/excel').query({ hasta: dia(1, 31) }),
      admin
        .get('/api/v1/libros/estado-resultados/excel')
        .query({ desde: dia(1, 1), hasta: dia(1, 31) }),
    ])
    expect(resBg.status).toBe(200)
    expect(resBg.headers['content-type']).toContain('spreadsheetml.sheet')
    expect(resBg.headers['content-disposition']).toContain('.xlsx')

    expect(resEr.status).toBe(200)
    expect(resEr.headers['content-type']).toContain('spreadsheetml.sheet')
    expect(resEr.headers['content-disposition']).toContain('.xlsx')
  })
})
