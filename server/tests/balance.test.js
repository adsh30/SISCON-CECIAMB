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
const AUDITOR = { email: 'auditor.balance@pruebas.local', password: 'Clave-Auditor-1' }

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

async function asiento(fecha, renglones, { aprobar = true, tipoCodigo = 'DIA', concepto } = {}) {
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
  if (aprobar) {
    const ok = await admin.post(`/api/v1/comprobantes/${res.body.data.id}/aprobar`)
    if (ok.status !== 200) throw new Error(`No se pudo aprobar: ${ok.body.error?.message}`)
  }
  return res.body.data.id
}

const CAJA = '1.1.01.01.001'
const BANCO = '1.1.01.02.001'
const CXC = '1.1.02.01'
const CXP = '2.1.01.01'
const CAPITAL = '3.1.01'
const INGRESO = '4.1.01'
const GASTO = '6.1.01'

beforeAll(async () => {
  const rol = await db('roles').where({ codigo: 'AUDITOR' }).first()
  await db('usuarios')
    .insert({
      nombre: 'Auditor Balance',
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

  // 1. Asiento en enero: Aporte de capital (Saldo Anterior respecto a febrero)
  await asiento(dia(1, 10), [
    [CAJA, '5000.00', '0'],
    [CAPITAL, '0', '5000.00'],
  ])

  // 2. Asiento en enero: Compra a crédito
  await asiento(dia(1, 20), [
    [GASTO, '1200.00', '0'],
    [CXP, '0', '1200.00'],
  ])

  // 3. Asiento en febrero (período evaluado): Cobro y depósito en banco
  await asiento(dia(2, 5), [
    [BANCO, '2500.00', '0'],
    [INGRESO, '0', '2500.00'],
  ])

  // 4. Asiento en febrero: Pago de parte de la deuda con banco
  await asiento(dia(2, 15), [
    [CXP, '600.00', '0'],
    [BANCO, '0', '600.00'],
  ])

  // 5. Asiento en febrero: Facturación a crédito
  await asiento(dia(2, 20), [
    [CXC, '1500.00', '0'],
    [INGRESO, '0', '1500.00'],
  ])

  // 6. Borrador (no debe entrar al balance)
  await asiento(
    dia(2, 22),
    [
      [CAJA, '9999.00', '0'],
      [INGRESO, '0', '9999.00'],
    ],
    { aprobar: false },
  )

  // 7. Anulado (no debe entrar al balance)
  const idAnulado = await asiento(dia(2, 25), [
    [CAJA, '8888.00', '0'],
    [INGRESO, '0', '8888.00'],
  ])
  await admin
    .post(`/api/v1/comprobantes/${idAnulado}/anular`)
    .send({ motivo: 'Comprobante de prueba para anulación' })
})

afterAll(async () => {
  await limpiarComprobantes()
  await db('ejercicios').del()
  await db.destroy()
})

const qStr = (p) => new URLSearchParams(p).toString()

describe('Balance de Comprobación (Sumas y Saldos a 8 Columnas)', () => {
  const FEBRERO = { desde: dia(2, 1), hasta: dia(2, 28) }

  it('exige autenticación', async () => {
    const res = await request(app).get(`/api/v1/libros/balance?${qStr(FEBRERO)}`)
    expect(res.status).toBe(401)
  })

  it('valida rango de fechas', async () => {
    const res = await auditor.get(
      `/api/v1/libros/balance?${qStr({ desde: dia(2, 28), hasta: dia(2, 1) })}`,
    )
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDACION')
  })

  it('genera balance de comprobación cuadrado a 8 columnas en modo movimiento', async () => {
    const res = await auditor.get(`/api/v1/libros/balance?${qStr(FEBRERO)}`)
    expect(res.status).toBe(200)

    const { data, meta } = res.body
    expect(data.length).toBeGreaterThan(0)
    // Todas son cuentas de movimiento
    expect(data.every((c) => c.esMovimiento)).toBe(true)

    const t = meta.totales
    // Saldos anteriores deben cuadrar exactamente
    expect(t.cuadradoAnterior).toBe(true)
    expect(t.saldoAnteriorDeudor).toBe(t.saldoAnteriorAcreedor)
    expect(t.saldoAnteriorDeudor).toBe('6200.00') // 5000 Caja + 1200 Gasto = 5000 Capital + 1200 CXP

    // Movimientos del período deben cuadrar exactamente
    expect(t.cuadradoMovimientos).toBe(true)
    expect(t.movimientoDebe).toBe(t.movimientoHaber)
    expect(t.movimientoDebe).toBe('4600.00') // 2500 + 600 + 1500

    // Saldos actuales deben cuadrar exactamente
    expect(t.cuadradoActual).toBe(true)
    expect(t.saldoActualDeudor).toBe(t.saldoActualAcreedor)
    expect(t.cuadrado).toBe(true)

    // El borrador (9999) y el anulado (8888) no se incluyen
    const montosJson = JSON.stringify(data)
    expect(montosJson).not.toContain('9999.00')
    expect(montosJson).not.toContain('8888.00')
  })

  it('permite modo completo con consolidación en cuentas de grupo', async () => {
    const res = await auditor.get(
      `/api/v1/libros/balance?${qStr({ ...FEBRERO, modo: 'completo' })}`,
    )
    expect(res.status).toBe(200)

    const { data, meta } = res.body
    expect(meta.totales.cuadrado).toBe(true)

    // Hay cuentas de grupo (esMovimiento: false)
    const grupos = data.filter((c) => !c.esMovimiento)
    expect(grupos.length).toBeGreaterThan(0)

    // El grupo 1 (Activo) debe contener los saldos acumulados de sus cuentas hijas
    const grupoActivo = grupos.find((c) => c.codigo === '1')
    expect(grupoActivo).toBeDefined()
    expect(Number(grupoActivo.saldoActualDeudor)).toBeGreaterThan(0)
  })

  it('permite filtrar por rango de cuentas (cuentaDesde, cuentaHasta)', async () => {
    const res = await auditor.get(
      `/api/v1/libros/balance?${qStr({
        ...FEBRERO,
        cuentaDesde: '1',
        cuentaHasta: '1.99',
      })}`,
    )
    expect(res.status).toBe(200)
    expect(res.body.data.every((c) => c.codigo.startsWith('1.'))).toBe(true)
  })

  it('exporta el Balance de Comprobación a Excel (.xlsx)', async () => {
    const res = await auditor
      .get(`/api/v1/libros/balance/excel?${qStr(FEBRERO)}`)
      .buffer(true)
      .parse((r, cb) => {
        const partes = []
        r.on('data', (p) => partes.push(p))
        r.on('end', () => cb(null, Buffer.concat(partes)))
      })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet')
    expect(res.headers['content-disposition']).toContain('balance-comprobacion')
    expect(res.body.subarray(0, 2).toString()).toBe('PK') // un .xlsx es un archivo ZIP
  })
})
