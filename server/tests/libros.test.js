import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { fechaHoyVE } from '../src/utils/fechas.js'
import { sumar } from '../src/utils/money.js'
import { testEnv } from './env.js'
import { limpiarComprobantes } from './limpiar.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const AUDITOR = { email: 'auditor.libros@pruebas.local', password: 'Clave-Auditor-1' }

const ANIO = Number(fechaHoyVE().slice(0, 4))
const dia = (d) => `${ANIO}-01-${String(d).padStart(2, '0')}`
const ENERO = { desde: dia(1), hasta: dia(31) }

let admin, auditor
const cuenta = {}
const tipo = {}
let centro

async function sesion(credenciales) {
  const agent = request.agent(app)
  expect((await agent.post('/api/v1/auth/login').send(credenciales)).status).toBe(200)
  return agent
}

/** Crea un comprobante con renglones [codigoCuenta, debe, haber, centroId?] y lo aprueba */
async function asiento(fecha, renglones, { aprobar = true, tipoCodigo = 'DIA', concepto } = {}) {
  const res = await admin.post('/api/v1/comprobantes').send({
    tipoId: tipo[tipoCodigo],
    fecha,
    concepto: concepto ?? `Asiento del ${fecha}`,
    renglones: renglones.map(([codigo, debe, haber, centroCostoId]) => ({
      cuentaId: cuenta[codigo],
      debe,
      haber,
      centroCostoId,
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
const INGRESO = '4.1.01'
const INGRESO_2 = '4.1.02'
const GASTO = '6.1.01'

beforeAll(async () => {
  const rol = await db('roles').where({ codigo: 'AUDITOR' }).first()
  await db('usuarios')
    .insert({
      nombre: 'Auditor Libros',
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
  if (ej.status !== 201) throw new Error(`No se pudo crear el ejercicio: ${ej.body.error?.message}`)

  for (const c of await db('cuentas').select('id', 'codigo')) cuenta[c.codigo] = c.id
  for (const t of await db('tipos_comprobante').select('id', 'codigo')) tipo[t.codigo] = t.id
  centro = (await db('centros_costo').orderBy('codigo').first('id', 'codigo')).id

  // Antes del rango consultado (saldo anterior): aporte inicial a caja
  await asiento(dia(5), [
    [CAJA, '1000.00', '0'],
    [INGRESO, '0', '1000.00'],
  ])
  // Dentro del rango
  await asiento(
    dia(12),
    [
      [CAJA, '500.00', '0', centro],
      [INGRESO_2, '0', '500.00', centro],
    ],
    { tipoCodigo: 'VEN', concepto: 'Cobro de consulta' },
  )
  await asiento(dia(10), [
    [GASTO, '300.00', '0'],
    [CAJA, '0', '300.00'],
  ])
  await asiento(dia(20), [
    [BANCO, '700.00', '0'],
    [CAJA, '0', '700.00'],
  ])
  // No van a los libros: un borrador y un anulado
  await asiento(
    dia(15),
    [
      [CAJA, '99.00', '0'],
      [INGRESO, '0', '99.00'],
    ],
    { aprobar: false },
  )
  const anulado = await asiento(dia(16), [
    [CAJA, '77.00', '0'],
    [INGRESO, '0', '77.00'],
  ])
  await admin
    .post(`/api/v1/comprobantes/${anulado}/anular`)
    .send({ motivo: 'Registrado por error en pruebas' })
})

afterAll(async () => {
  await limpiarComprobantes()
  await db('ejercicios').del()
  await db.destroy()
})

const consulta = (params) => new URLSearchParams(params).toString()

describe('Libro Diario', () => {
  it('exige el rango de fechas', async () => {
    const res = await auditor.get('/api/v1/libros/diario')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDACION')
  })

  it('rechaza un rango invertido', async () => {
    const res = await auditor.get(
      `/api/v1/libros/diario?${consulta({ desde: dia(20), hasta: dia(1) })}`,
    )
    expect(res.status).toBe(400)
  })

  it('pide sesión', async () => {
    const res = await request(app).get(`/api/v1/libros/diario?${consulta(ENERO)}`)
    expect(res.status).toBe(401)
  })

  it('trae solo aprobados, en orden cronológico y con totales cuadrados', async () => {
    const res = await auditor.get(`/api/v1/libros/diario?${consulta(ENERO)}`)
    expect(res.status).toBe(200)
    expect(res.body.data.map((c) => c.fecha)).toEqual([dia(5), dia(10), dia(12), dia(20)])
    expect(res.body.data.every((c) => c.codigo)).toBe(true)
    expect(res.body.meta.total).toBe(4)
    expect(res.body.meta.totales).toEqual({ debe: '2500.00', haber: '2500.00', renglones: 8 })
    const venta = res.body.data[2]
    expect(venta.tipo.codigo).toBe('VEN')
    expect(venta.renglones.map((r) => r.cuentaCodigo)).toEqual([CAJA, INGRESO_2])
    expect(venta.totalDebe).toBe('500.00')
  })

  it('pagina sin perder los totales del rango completo', async () => {
    const res = await auditor.get(
      `/api/v1/libros/diario?${consulta({ ...ENERO, porPagina: 10, pagina: 1 })}`,
    )
    expect(res.body.meta.paginas).toBe(1)
    const p2 = await auditor.get(
      `/api/v1/libros/diario?${consulta({ desde: dia(10), hasta: dia(31), porPagina: 10, pagina: 2 })}`,
    )
    expect(p2.body.data).toEqual([])
    expect(p2.body.meta.totales.debe).toBe('1500.00')
  })

  it('filtra por tipo y por centro de costo', async () => {
    const porTipo = await auditor.get(
      `/api/v1/libros/diario?${consulta({ ...ENERO, tipoId: tipo.VEN })}`,
    )
    expect(porTipo.body.data.map((c) => c.concepto)).toEqual(['Cobro de consulta'])

    const porCentro = await auditor.get(
      `/api/v1/libros/diario?${consulta({ ...ENERO, centroCostoId: centro })}`,
    )
    expect(porCentro.body.meta.total).toBe(1)
    expect(porCentro.body.meta.totales).toEqual({ debe: '500.00', haber: '500.00', renglones: 2 })
  })
})

describe('Libro Mayor', () => {
  const RANGO = { desde: dia(10), hasta: dia(31) }

  it('lleva saldo anterior, saldo por renglón y saldo final (cuenta deudora)', async () => {
    const res = await auditor.get(
      `/api/v1/libros/mayor?${consulta({ ...RANGO, cuentaDesde: CAJA, cuentaHasta: CAJA })}`,
    )
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const caja = res.body.data[0]
    expect(caja.cuenta.codigo).toBe(CAJA)
    expect(caja.saldoAnterior).toBe('1000.00')
    // 10: −300 → 700; 12: +500 → 1200; 20: −700 → 500
    expect(caja.movimientos.map((m) => [m.fecha, m.saldo])).toEqual([
      [dia(10), '700.00'],
      [dia(12), '1200.00'],
      [dia(20), '500.00'],
    ])
    expect(caja.totalDebe).toBe('500.00')
    expect(caja.totalHaber).toBe('1000.00')
    expect(caja.saldoFinal).toBe('500.00')
  })

  it('en las cuentas acreedoras el saldo crece con el Haber', async () => {
    const res = await auditor.get(
      `/api/v1/libros/mayor?${consulta({ ...ENERO, cuentaDesde: '4', cuentaHasta: '4' })}`,
    )
    const codigos = res.body.data.map((c) => c.cuenta.codigo)
    // Una cuenta de grupo como rango incluye todas sus subcuentas
    expect(codigos).toEqual([INGRESO, INGRESO_2])
    expect(res.body.data[0].saldoFinal).toBe('1000.00')
    expect(res.body.data[1].saldoFinal).toBe('500.00')
  })

  it('una cuenta solo con saldo anterior aparece sin movimientos', async () => {
    const res = await auditor.get(
      `/api/v1/libros/mayor?${consulta({ ...RANGO, cuentaDesde: INGRESO, cuentaHasta: INGRESO })}`,
    )
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].movimientos).toEqual([])
    expect(res.body.data[0].saldoAnterior).toBe('1000.00')
    expect(res.body.data[0].saldoFinal).toBe('1000.00')
  })

  it('pagina por cuentas', async () => {
    const res = await auditor.get(`/api/v1/libros/mayor?${consulta({ ...ENERO, porPagina: 10 })}`)
    expect(res.body.meta.total).toBe(5)
    expect(res.body.meta.paginas).toBe(1)
    expect(res.body.data.map((c) => c.cuenta.codigo)).toEqual([
      CAJA,
      BANCO,
      INGRESO,
      INGRESO_2,
      GASTO,
    ])
  })

  it('rechaza un rango de cuentas invertido', async () => {
    const res = await auditor.get(
      `/api/v1/libros/mayor?${consulta({ ...ENERO, cuentaDesde: '6', cuentaHasta: '1' })}`,
    )
    expect(res.status).toBe(400)
  })
})

describe('cuadre entre libros', () => {
  it('Σ Diario = Σ Mayor = Σ comprobantes aprobados', async () => {
    const [diario, mayor, aprobados] = await Promise.all([
      auditor.get(`/api/v1/libros/diario?${consulta(ENERO)}`),
      auditor.get(`/api/v1/libros/mayor?${consulta(ENERO)}`),
      db('comprobantes')
        .where({ estado: 'APROBADO' })
        .whereBetween('fecha', [ENERO.desde, ENERO.hasta])
        .select('total_debe', 'total_haber'),
    ])
    const debe = sumar(...aprobados.map((c) => c.total_debe))
    const haber = sumar(...aprobados.map((c) => c.total_haber))
    expect(diario.body.meta.totales.debe).toBe(debe)
    expect(diario.body.meta.totales.haber).toBe(haber)
    expect(mayor.body.meta.totales.debe).toBe(debe)
    expect(mayor.body.meta.totales.haber).toBe(haber)
    expect(mayor.body.meta.totales.renglones).toBe(diario.body.meta.totales.renglones)
  })
})

describe('exportación a Excel', () => {
  it('descarga el Libro Diario como .xlsx', async () => {
    const res = await auditor
      .get(`/api/v1/libros/diario/excel?${consulta(ENERO)}`)
      .buffer(true)
      .parse((r, cb) => {
        const partes = []
        r.on('data', (p) => partes.push(p))
        r.on('end', () => cb(null, Buffer.concat(partes)))
      })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml')
    expect(res.headers['content-disposition']).toContain(
      `libro-diario_${ENERO.desde}_${ENERO.hasta}.xlsx`,
    )
    expect(res.body.subarray(0, 2).toString()).toBe('PK') // un .xlsx es un zip
  })

  it('descarga el Libro Mayor como .xlsx', async () => {
    const res = await auditor.get(`/api/v1/libros/mayor/excel?${consulta(ENERO)}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain('libro-mayor_')
  })

  it('valida los filtros también al exportar', async () => {
    const res = await auditor.get('/api/v1/libros/mayor/excel')
    expect(res.status).toBe(400)
  })
})
