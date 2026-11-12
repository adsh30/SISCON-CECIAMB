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

async function sesion(credenciales) {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send(credenciales)
  expect(res.status).toBe(200)
  return agent
}

beforeAll(async () => {
  admin = await sesion(ADMIN)

  // Asegurar que exista el ejercicio del año actual
  let per = await db('periodos').where({ anio: ANIO, mes: 1 }).first()
  if (!per) {
    await admin.post('/api/v1/periodos/ejercicios').send({ anio: ANIO, mesInicio: 1 })
  }

  await limpiarComprobantes()
  await db('cxc_cobros').del()
  await db('cxc_factura_items').del()
  await db('cxc_facturas').del()
})

afterAll(async () => {
  await db('cxc_cobros').del()
  await db('cxc_factura_items').del()
  await db('cxc_facturas').del()
  await limpiarComprobantes()
  await db.destroy()
})

describe('Fase 9 — Cuentas por Cobrar (CxC Hospitalaria)', () => {
  let clienteId
  let facturaId

  it('1. Debe listar los clientes iniciales sembrados', async () => {
    const res = await admin.get('/api/v1/cxc/clientes')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    const aseguradora = res.body.data.find((c) => c.categoria === 'ASEGURADORA')
    expect(aseguradora).toBeDefined()
    clienteId = aseguradora.id
  })

  it('2. Debe crear un nuevo cliente institucional / aseguradora', async () => {
    const res = await admin.post('/api/v1/cxc/clientes').send({
      tipoPersona: 'JURIDICA',
      tipoDocumento: 'J',
      identificacion: '998877665',
      razonSocial: 'SEGUROS PIRÁMIDE C.A.',
      nombreComercial: 'Seguros Pirámide',
      categoria: 'ASEGURADORA',
      diasCredito: 30,
      limiteCredito: 50000,
    })
    expect(res.status).toBe(201)
    expect(res.body.data.razon_social).toBe('SEGUROS PIRÁMIDE C.A.')
    expect(Number(res.body.data.dias_credito)).toBe(30)
  })

  it('3. Debe emitir una factura asistencial con cálculo de IVA y comprobante automático', async () => {
    const fecha = dia(1, 15)
    const res = await admin.post('/api/v1/cxc/facturas').send({
      numeroFactura: `FAC-${Date.now()}`,
      numeroControl: '00-001234',
      clienteId,
      pacienteNombre: 'María Rodríguez',
      pacienteCedula: 'V-15888999',
      historiaMedica: 'HC-8472',
      fechaEmision: fecha,
      servicioDepartamento: 'QUIROFANO',
      alicuotaIva: 16,
      items: [
        {
          codigoServicio: 'QUI-01',
          descripcion: 'Derecho a Quirófano y Sala de Recuperación',
          cantidad: 1,
          precioUnitario: 1000,
          exento: false,
        },
        {
          codigoServicio: 'MED-01',
          descripcion: 'Medicamentos e Insumos Quirúrgicos Descartables',
          cantidad: 2,
          precioUnitario: 250,
          exento: false,
        },
      ],
      generarComprobante: true,
    })

    expect(res.status).toBe(201)
    const f = res.body.data
    expect(f.cliente_id).toBe(clienteId)
    expect(Number(f.subtotal_gravado)).toBe(1500) // 1000 + 500
    expect(Number(f.monto_iva)).toBe(240) // 1500 * 0.16
    expect(Number(f.total)).toBe(1740)
    expect(Number(f.saldo_pendiente)).toBe(1740)
    expect(f.estado).toBe('PENDIENTE')
    expect(f.comprobante_id).toBeDefined()
    facturaId = f.id
  })

  it('4. Debe registrar un cobro parcial y actualizar el saldo de la factura', async () => {
    const fecha = dia(1, 20)
    const res = await admin.post('/api/v1/cxc/cobros').send({
      numeroRecibo: `REC-${Date.now()}`,
      clienteId,
      facturaId,
      fechaCobro: fecha,
      formaPago: 'TRANSFERENCIA',
      referencia: 'TRF-BMA-991823',
      monto: 740,
      generarComprobante: true,
    })

    expect(res.status).toBe(201)
    expect(Number(res.body.data.monto)).toBe(740)

    // Verificar estado de la factura actualizado a COBRADA_PARCIAL
    const facRes = await admin.get(`/api/v1/cxc/facturas/${facturaId}`)
    expect(facRes.status).toBe(200)
    expect(Number(facRes.body.data.saldo_pendiente)).toBe(1000)
    expect(facRes.body.data.estado).toBe('COBRADA_PARCIAL')
  })

  it('5. Debe obtener los KPIs de cartera y la antigüedad de saldos', async () => {
    const kpisRes = await admin.get('/api/v1/cxc/kpis')
    expect(kpisRes.status).toBe(200)
    expect(kpisRes.body.data.facturasPendientes).toBeGreaterThanOrEqual(1)
    expect(kpisRes.body.data.saldoPendiente).toBeGreaterThanOrEqual(1000)

    const agingRes = await admin.get('/api/v1/cxc/antiguedad')
    expect(agingRes.status).toBe(200)
    expect(Array.isArray(agingRes.body.data)).toBe(true)
  })
})
