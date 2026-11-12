import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { fechaHoyVE } from '../src/utils/fechas.js'
import { testEnv } from './env.js'
import { limpiarComprobantes } from './limpiar.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }

const ANIO = Number(fechaHoyVE().slice(0, 4))
const dia = (m, d) => `${ANIO}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

let admin
const cuenta = {}
let tipoDiaId
let periodoId

async function sesion(credenciales) {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send(credenciales)
  expect(res.status).toBe(200)
  return agent
}

const BANCO = '1.1.01.02.001'
const CAPITAL = '3.1.01'
const GASTO = '6.1.01'

beforeAll(async () => {
  admin = await sesion(ADMIN)

  const tipo = await db('tipos_comprobante').where({ codigo: 'DIA' }).first()
  tipoDiaId = tipo.id

  for (const c of await db('cuentas').whereIn('codigo', [BANCO, CAPITAL, GASTO])) {
    cuenta[c.codigo] = c.id
  }

  await limpiarComprobantes()
  await db('conciliacion_partidas').del()
  await db('conciliaciones').del()

  // Asegurar que exista el ejercicio del año actual
  let per = await db('periodos').where({ anio: ANIO, mes: 1 }).first()
  if (!per) {
    await admin.post('/api/v1/periodos/ejercicios').send({ anio: ANIO, mesInicio: 1 })
    per = await db('periodos').where({ anio: ANIO, mes: 1 }).first()
  }
  periodoId = per.id
})

afterAll(async () => {
  await db('conciliacion_partidas').del()
  await db('conciliaciones').del()
  await limpiarComprobantes()
  await db.destroy()
})

describe('Módulo de Conciliación Bancaria (RF-08.3)', () => {
  let conciliacionId

  it('inicia una conciliación bancaria y carga movimientos aprobados de libros', async () => {
    // 1. Crear asiento con movimiento en Banco (Ingreso de 10,000 Bs y Pago de 2,500 Bs)
    const c1 = await admin.post('/api/v1/comprobantes').send({
      tipoId: tipoDiaId,
      fecha: dia(1, 10),
      concepto: 'Aporte de capital en banco',
      renglones: [
        { cuentaId: cuenta[BANCO], debe: '10000.00', haber: '0.00' },
        { cuentaId: cuenta[CAPITAL], debe: '0.00', haber: '10000.00' },
      ],
    })
    expect(c1.status).toBe(201)
    await admin.post(`/api/v1/comprobantes/${c1.body.data.id}/aprobar`)

    const c2 = await admin.post('/api/v1/comprobantes').send({
      tipoId: tipoDiaId,
      fecha: dia(1, 15),
      concepto: 'Pago de servicios desde banco',
      renglones: [
        { cuentaId: cuenta[GASTO], debe: '2500.00', haber: '0.00' },
        { cuentaId: cuenta[BANCO], debe: '0.00', haber: '2500.00' },
      ],
    })
    expect(c2.status).toBe(201)
    await admin.post(`/api/v1/comprobantes/${c2.body.data.id}/aprobar`)

    // 2. Iniciar la conciliación al 31 de enero
    // Saldo según libros = 10,000 - 2,500 = 7,500.00
    const res = await admin.post('/api/v1/conciliaciones').send({
      cuentaId: cuenta[BANCO],
      periodoId,
      fechaCorte: dia(1, 31),
      saldoBanco: '7500.00',
      observaciones: 'Conciliación mensual enero',
    })

    expect(res.status).toBe(201)
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.estado).toBe('BORRADOR')
    expect(res.body.data.saldoLibros).toBe('7500.00')
    expect(res.body.data.saldoBanco).toBe('7500.00')
    expect(res.body.data.diferencia).toBe('0.00')
    expect(res.body.data.partidasLibro.length).toBe(2)

    conciliacionId = res.body.data.id
  })

  it('importa movimientos del extracto bancario y ejecuta emparejamiento automático', async () => {
    const res = await admin
      .post(`/api/v1/conciliaciones/${conciliacionId}/importar-banco`)
      .send({
        movimientos: [
          {
            fecha: dia(1, 10),
            referencia: 'DEP-1001',
            descripcion: 'TRANSFERENCIA RECIBIDA APORTE',
            monto: '10000.00',
            tipoMovimiento: 'CREDITO', // En banco abono es crédito
          },
          {
            fecha: dia(1, 16),
            referencia: 'PAG-2002',
            descripcion: 'PAGO PROVEEDOR SERVICIOS',
            monto: '2500.00',
            tipoMovimiento: 'DEBITO', // En banco cargo es débito
          },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.meta.totalImportados).toBe(2)
    expect(res.body.meta.emparejados).toBe(2)

    const c = res.body.data
    expect(c.resumen.conciliadasLibro).toBe(2)
    expect(c.resumen.conciliadasBanco).toBe(2)
    expect(c.resumen.diferenciaConciliada).toBe('0.00')
  })

  it('permite desemparejar y emparejar manualmente partidas', async () => {
    const detalle = await admin.get(`/api/v1/conciliaciones/${conciliacionId}`)
    const pLibro = detalle.body.data.partidasLibro[0]
    const pBanco = detalle.body.data.partidasBanco[0]

    // Desemparejar
    const des = await admin
      .post(`/api/v1/conciliaciones/${conciliacionId}/desemparejar`)
      .send({ partidaId: pLibro.id })
    expect(des.status).toBe(200)

    const cDes = await admin.get(`/api/v1/conciliaciones/${conciliacionId}`)
    const pLibroDes = cDes.body.data.partidasLibro.find((p) => p.id === pLibro.id)
    expect(pLibroDes.estado).toBe('PENDIENTE')

    // Emparejar de nuevo manualmente
    const emp = await admin
      .post(`/api/v1/conciliaciones/${conciliacionId}/emparejar`)
      .send({ partidaLibroId: pLibro.id, partidaBancoId: pBanco.id })
    expect(emp.status).toBe(200)

    const cEmp = await admin.get(`/api/v1/conciliaciones/${conciliacionId}`)
    const pLibroEmp = cEmp.body.data.partidasLibro.find((p) => p.id === pLibro.id)
    expect(pLibroEmp.estado).toBe('CONCILIADO')
  })

  it('finaliza la conciliación cambiando su estado a CONCILIADA', async () => {
    const res = await admin
      .post(`/api/v1/conciliaciones/${conciliacionId}/finalizar`)
      .send({ observaciones: 'Conciliación cuadrada sin diferencias' })

    expect(res.status).toBe(200)
    expect(res.body.data.estado).toBe('CONCILIADA')
    expect(res.body.data.conciliadoPor).toBeDefined()
  })

  it('permite anular una conciliación con su respectivo motivo', async () => {
    // Iniciar otra conciliación para anularla
    const nueva = await admin.post('/api/v1/conciliaciones').send({
      cuentaId: cuenta[BANCO],
      periodoId,
      fechaCorte: dia(1, 20),
      saldoBanco: '5000.00',
    })
    expect(nueva.status).toBe(201)

    const anularRes = await admin
      .post(`/api/v1/conciliaciones/${nueva.body.data.id}/anular`)
      .send({ motivo: 'Extracto erróneo provisto por el banco' })

    expect(anularRes.status).toBe(200)
    expect(anularRes.body.data.estado).toBe('ANULADA')
  })
})
