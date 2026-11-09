import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { testEnv } from './env.js'
import { limpiarComprobantes } from './limpiar.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }

// Tasas de prueba en 2020: no chocan con el historial real del BCV (desde 2023)
const TASAS = [
  { fecha: '2020-01-31', moneda: 'USD', fuente: 'BCV', tasa: '40.0000' },
  { fecha: '2020-02-29', moneda: 'USD', fuente: 'BCV', tasa: '38.0000' },
  { fecha: '2020-01-31', moneda: 'USDT', fuente: 'BINANCE', tasa: '41.0000' },
]

let admin
let enero, febrero
const cuenta = {}
let tipoIng

const idDe = async (codigo) => (await db('cuentas').where({ codigo }).first()).id

async function aprobado(agent, datos) {
  const creado = await agent.post('/api/v1/comprobantes').send(datos)
  expect(creado.status).toBe(201)
  const ok = await agent.post(`/api/v1/comprobantes/${creado.body.data.id}/aprobar`)
  expect(ok.status).toBe(200)
  return ok.body.data
}

/** Saldo en bolívares (Debe − Haber) de una cuenta con lo aprobado */
async function saldoBs(cuentaId) {
  const r = await db('comprobante_detalle as d')
    .join('comprobantes as c', 'c.id', 'd.comprobante_id')
    .where({ 'd.cuenta_id': cuentaId, 'c.estado': 'APROBADO' })
    .select(db.raw('COALESCE(SUM(d.debe) - SUM(d.haber), 0) AS s'))
    .first()
  return Number(r.s).toFixed(2)
}

beforeAll(async () => {
  admin = request.agent(app)
  if ((await admin.post('/api/v1/auth/login').send(ADMIN)).status !== 200)
    throw new Error('Sin sesión')
  await limpiarComprobantes()
  await db('ejercicios').del()
  for (const t of TASAS) {
    await db('tasas_cambio').insert(t).onConflict(['fecha', 'moneda', 'fuente']).merge(['tasa'])
  }
  const ej = await admin.post('/api/v1/periodos/ejercicios').send({ anio: 2020, mesInicio: 1 })
  if (ej.status !== 201) throw new Error(ej.body.error?.message)
  enero = ej.body.data.periodos.find((p) => p.mes === 1)
  febrero = ej.body.data.periodos.find((p) => p.mes === 2)

  for (const codigo of [
    '1.1.01',
    '1.1.01.03',
    '1.1.01.03.001',
    '1.1.01.04.001',
    '1.1.01.01.001',
    '4.1.01',
    '4.2.01',
    '6.2.01',
  ]) {
    cuenta[codigo] = await idDe(codigo)
  }
  tipoIng = (await db('tipos_comprobante').where({ codigo: 'ING' }).first()).id
})

afterAll(async () => {
  await limpiarComprobantes()
  await db('ejercicios').del()
  for (const t of TASAS) await db('tasas_cambio').where(t).del()
  for (const codigo of ['1.1.01.05.001', '1.1.01.05', '1.1.01.03.002']) {
    await db('cuentas').where({ codigo }).del()
  }
  await db('empresa').where({ id: 1 }).update({
    cuenta_ganancia_cambiaria_id: cuenta['4.2.01'],
    cuenta_perdida_cambiaria_id: cuenta['6.2.01'],
  })
  await db.destroy()
})

/** Cobro en divisas: la cuenta en divisa al Debe con su monto en divisa, ingreso al Haber */
const cobro = (fecha, cuentaId, bs, divisa) => ({
  tipoId: tipoIng,
  fecha,
  concepto: 'Cobro en divisas',
  renglones: [
    { cuentaId, debe: bs, haber: '0', montoMoneda: divisa },
    { cuentaId: cuenta['4.1.01'], debe: '0', haber: bs },
  ],
})

describe('cuentas en divisas y sus auxiliares', () => {
  it('la migración deja las cuentas de ejemplo y la configuración de la empresa', async () => {
    const res = await admin.get(`/api/v1/cuentas/${cuenta['1.1.01.03.001']}`)
    expect(res.body.data).toMatchObject({ moneda: 'USD', esMovimiento: true })
    const conf = await admin.get('/api/v1/diferencial-cambiario/configuracion')
    expect(conf.body.data.ganancia).toMatchObject({ codigo: '4.2.01', valida: true })
    expect(conf.body.data.perdida).toMatchObject({ codigo: '6.2.01', valida: true })
  })

  it('los auxiliares heredan la moneda de su cuenta de grupo', async () => {
    const aux = await admin.post('/api/v1/cuentas').send({
      codigo: '1.1.01.03.002',
      nombre: 'Caja Emergencia en Dólares',
      padreId: cuenta['1.1.01.03'],
      esMovimiento: true,
    })
    expect(aux.status).toBe(201)
    expect(aux.body.data.moneda).toBe('USD')

    const otra = await admin.post('/api/v1/cuentas').send({
      codigo: '1.1.01.03.003',
      nombre: 'Caja en euros',
      padreId: cuenta['1.1.01.03'],
      esMovimiento: true,
      moneda: 'EUR',
    })
    expect(otra.body.error.code).toBe('MONEDA_DEL_PADRE')

    const propia = await admin.put(`/api/v1/cuentas/${aux.body.data.id}`).send({ moneda: null })
    expect(propia.body.error.code).toBe('MONEDA_DEL_PADRE')
  })

  it('cambiar la moneda del grupo la aplica a todos sus auxiliares', async () => {
    const grupo = await admin
      .post('/api/v1/cuentas')
      .send({ codigo: '1.1.01.05', nombre: 'Caja en Euros', padreId: cuenta['1.1.01'] })
    expect(grupo.status).toBe(201)
    const aux = await admin.post('/api/v1/cuentas').send({
      codigo: '1.1.01.05.001',
      nombre: 'Caja Principal en Euros',
      padreId: grupo.body.data.id,
      esMovimiento: true,
    })
    expect(aux.body.data.moneda).toBeNull()

    const res = await admin.put(`/api/v1/cuentas/${grupo.body.data.id}`).send({ moneda: 'EUR' })
    expect(res.status).toBe(200)
    expect((await db('cuentas').where({ codigo: '1.1.01.05.001' }).first()).moneda).toBe('EUR')
    cuenta['1.1.01.05'] = grupo.body.data.id
    cuenta['1.1.01.05.001'] = aux.body.data.id
  })

  it('solo activo o pasivo se llevan en divisas', async () => {
    const res = await admin.put(`/api/v1/cuentas/${cuenta['4.1.01']}`).send({ moneda: 'USD' })
    expect(res.body.error.code).toBe('MONEDA_TIPO')
  })

  it('un renglón en una cuenta en divisas exige su monto en la divisa', async () => {
    const datos = cobro('2020-01-10', cuenta['1.1.01.03.001'], '3600.00', null)
    const res = await admin.post('/api/v1/comprobantes').send(datos)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('FALTA_MONTO_DIVISA')
    expect(res.body.error.message).toContain('Renglón 1')
    expect(res.body.error.message).toContain('USD')
  })

  it('el monto en divisa se guarda y se descarta en las cuentas en bolívares', async () => {
    const datos = cobro('2020-01-10', cuenta['1.1.01.03.001'], '3600.00', '100')
    datos.renglones[1].montoMoneda = '99'
    const res = await admin.post('/api/v1/comprobantes').send(datos)
    expect(res.status).toBe(201)
    expect(res.body.data.renglones[0]).toMatchObject({ montoMoneda: '100.00', cuentaMoneda: 'USD' })
    expect(res.body.data.renglones[1].montoMoneda).toBeNull()
    await admin.delete(`/api/v1/comprobantes/${res.body.data.id}`)
  })

  it('con movimientos ya no se puede cambiar la moneda del grupo', async () => {
    await aprobado(admin, cobro('2020-01-05', cuenta['1.1.01.05.001'], '4200.00', '100'))
    const res = await admin.put(`/api/v1/cuentas/${cuenta['1.1.01.05']}`).send({ moneda: 'USD' })
    expect(res.body.error.code).toBe('TIENE_MOVIMIENTOS')
  })
})

describe('configuración de cuentas de ganancia y pérdida', () => {
  it('valida tipo, movimiento y moneda', async () => {
    const url = '/api/v1/diferencial-cambiario/configuracion'
    const grupo = await admin
      .put(url)
      .send({ cuentaGananciaId: await idDe('4.2'), cuentaPerdidaId: null })
    expect(grupo.body.error.code).toBe('CUENTA_DE_GRUPO')
    const tipo = await admin
      .put(url)
      .send({ cuentaGananciaId: null, cuentaPerdidaId: cuenta['4.2.01'] })
    expect(tipo.body.error.code).toBe('TIPO_INVALIDO')
    const ok = await admin
      .put(url)
      .send({ cuentaGananciaId: null, cuentaPerdidaId: cuenta['6.2.01'] })
    expect(ok.status).toBe(200)
    expect(ok.body.data.ganancia).toBeNull()
  })

  it('no se elimina la cuenta configurada', async () => {
    const res = await admin.delete(`/api/v1/cuentas/${cuenta['6.2.01']}`)
    expect(res.body.error.code).toBe('CUENTA_EN_USO')
  })
})

describe('cierre de período con diferencial cambiario', () => {
  it('sin tasa de la divisa no se puede cerrar', async () => {
    const res = await admin.post(`/api/v1/periodos/${enero.id}/cerrar`)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('SIN_TASA')
    expect(res.body.error.message).toContain('EUR')

    // Se anula el cobro en euros: lo anulado no cuenta en los saldos
    const eur = await db('comprobante_detalle')
      .where({ cuenta_id: cuenta['1.1.01.05.001'] })
      .first()
    const anulado = await admin
      .post(`/api/v1/comprobantes/${eur.comprobante_id}/anular`)
      .send({ motivo: 'Prueba sin tasa del euro' })
    expect(anulado.status).toBe(200)
  })

  it('sin cuenta de ganancia configurada no se puede cerrar con ganancias', async () => {
    await aprobado(admin, cobro('2020-01-10', cuenta['1.1.01.03.001'], '3600.00', '100'))
    await aprobado(admin, cobro('2020-01-12', cuenta['1.1.01.04.001'], '1900.00', '50'))
    const res = await admin.post(`/api/v1/periodos/${enero.id}/cerrar`)
    expect(res.body.error.code).toBe('SIN_CUENTA_GANANCIA')
    expect(await db('periodos').where({ id: enero.id }).first()).toMatchObject({
      estado: 'ABIERTO',
    })

    await admin
      .put('/api/v1/diferencial-cambiario/configuracion')
      .send({ cuentaGananciaId: cuenta['4.2.01'], cuentaPerdidaId: cuenta['6.2.01'] })
  })

  it('la vista previa muestra el ajuste de cada auxiliar', async () => {
    const res = await admin.get(`/api/v1/diferencial-cambiario/periodos/${enero.id}`)
    expect(res.status).toBe(200)
    const { cuentas, totales, problemas } = res.body.data
    expect(problemas).toEqual([])
    const usd = cuentas.find((c) => c.cuenta.codigo === '1.1.01.03.001')
    expect(usd).toMatchObject({
      saldoDivisa: '100.00',
      saldoBs: '3600.00',
      tasa: '40.0000',
      fuente: 'BCV',
      saldoAjustado: '4000.00',
      diferencia: '400.00',
    })
    expect(usd.cuenta.grupo.codigo).toBe('1.1.01.03')
    const usdt = cuentas.find((c) => c.cuenta.codigo === '1.1.01.04.001')
    expect(usdt).toMatchObject({
      fuente: 'BINANCE',
      saldoAjustado: '2050.00',
      diferencia: '150.00',
    })
    // El auxiliar en euros quedó en cero (cobro anulado): no aparece
    expect(cuentas.find((c) => c.cuenta.codigo === '1.1.01.05.001')).toBeUndefined()
    expect(totales).toMatchObject({ ganancia: '550.00', perdida: '0.00', neto: '550.00' })
  })

  it('al cerrar registra y aprueba el comprobante DIF con la ganancia', async () => {
    const res = await admin.post(`/api/v1/periodos/${enero.id}/cerrar`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      estado: 'CERRADO',
      diferencial: { codigo: 'DIF-2020-01-0001', ganancia: '550.00', perdida: '0.00' },
    })

    const dif = await admin.get(`/api/v1/comprobantes/${res.body.data.diferencial.id}`)
    expect(dif.body.data).toMatchObject({
      estado: 'APROBADO',
      fecha: '2020-01-31',
      totalDebe: '550.00',
      totalHaber: '550.00',
      tipo: { codigo: 'DIF' },
    })
    expect(dif.body.data.renglones).toHaveLength(4)
    expect(dif.body.data.renglones[0]).toMatchObject({
      cuentaCodigo: '1.1.01.03.001',
      debe: '400.00',
      montoMoneda: null,
    })
    expect(dif.body.data.renglones[1]).toMatchObject({ cuentaCodigo: '4.2.01', haber: '400.00' })

    expect(await saldoBs(cuenta['1.1.01.03.001'])).toBe('4000.00')
    expect(await saldoBs(cuenta['1.1.01.04.001'])).toBe('2050.00')

    const log = await db('bitacora')
      .where({ accion: 'CERRAR_PERIODO' })
      .orderBy('id', 'desc')
      .first()
    expect(log.datos_despues).toMatchObject({ diferencialCambiario: 'DIF-2020-01-0001' })
  })

  it('si la divisa baja, registra la pérdida', async () => {
    // Pago de 20 USD a 40: el saldo queda en 80 USD y 3.200 Bs; al cierre la tasa es 38
    await aprobado(admin, {
      tipoId: tipoIng,
      fecha: '2020-02-10',
      concepto: 'Pago en divisas',
      renglones: [
        { cuentaId: cuenta['4.1.01'], debe: '800.00', haber: '0' },
        { cuentaId: cuenta['1.1.01.03.001'], debe: '0', haber: '800.00', montoMoneda: '20' },
      ],
    })
    const res = await admin.post(`/api/v1/periodos/${febrero.id}/cerrar`)
    expect(res.status).toBe(200)
    expect(res.body.data.diferencial).toMatchObject({
      codigo: 'DIF-2020-02-0001',
      ganancia: '0.00',
      perdida: '160.00',
    })
    const dif = await admin.get(`/api/v1/comprobantes/${res.body.data.diferencial.id}`)
    // Solo el auxiliar en dólares cambió: el USDT sigue a 41
    expect(dif.body.data.renglones.map((r) => [r.cuentaCodigo, r.debe, r.haber])).toEqual([
      ['6.2.01', '160.00', '0.00'],
      ['1.1.01.03.001', '0.00', '160.00'],
    ])
    expect(await saldoBs(cuenta['1.1.01.03.001'])).toBe('3040.00')
  })

  it('reabrir y volver a cerrar no repite el ajuste', async () => {
    const reabierto = await admin
      .post(`/api/v1/periodos/${febrero.id}/reabrir`)
      .send({ motivo: 'Revisar el diferencial de febrero' })
    expect(reabierto.status).toBe(200)
    const res = await admin.post(`/api/v1/periodos/${febrero.id}/cerrar`)
    expect(res.status).toBe(200)
    expect(res.body.data.diferencial).toBeNull()
    const { n } = await db('comprobantes')
      .where({ periodo_id: febrero.id })
      .count({ n: '*' })
      .first()
    expect(Number(n)).toBe(2) // el pago y el DIF de antes
  })
})
