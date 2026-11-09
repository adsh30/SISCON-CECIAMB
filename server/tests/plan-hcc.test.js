import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { cargarPlanHcc, crearAperturaHcc, PLAN_HCC } from '../src/modules/cuentas/plan-hcc.js'
import { codigoDeSubcuentaValido, esSubcuenta, prefijoSubcuentas } from '../src/utils/codigos.js'
import { testEnv } from './env.js'
import { limpiarComprobantes } from './limpiar.js'

const app = createApp()
let admin

beforeAll(async () => {
  admin = request.agent(app)
  const login = await admin
    .post('/api/v1/auth/login')
    .send({ email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD })
  if (login.status !== 200) throw new Error('Sin sesión')
  await limpiarComprobantes()
  await db('ejercicios').del()
})

afterAll(async () => {
  for (const codigo of ['91', '9']) await db('cuentas').where({ codigo }).del()
  await db('ejercicios').del()
  await db.destroy()
})

describe('códigos de cuenta con puntos y compactos', () => {
  it('reconoce las subcuentas en ambos formatos', () => {
    expect(prefijoSubcuentas('1.1')).toBe('1.1.')
    expect(prefijoSubcuentas('1112')).toBe('1112')
    expect(esSubcuenta('111201', '1112')).toBe(true)
    expect(esSubcuenta('1.1.01', '1.1')).toBe(true)
    expect(esSubcuenta('1.10', '1.1')).toBe(false)
    expect(esSubcuenta('1112', '1112')).toBe(false)
    expect(codigoDeSubcuentaValido('111201', '1112')).toBe(true)
    expect(codigoDeSubcuentaValido('1.1.01', '1.1')).toBe(true)
    expect(codigoDeSubcuentaValido('1201', '1112')).toBe(false)
    expect(codigoDeSubcuentaValido('1.101', '1.1')).toBe(false)
  })

  it('crea subcuentas con código compacto desde la API', async () => {
    const raiz = await admin
      .post('/api/v1/cuentas')
      .send({ codigo: '9', nombre: 'Cuentas de orden HCC', tipo: 'ORDEN' })
    expect(raiz.status).toBe(201)
    const hija = await admin
      .post('/api/v1/cuentas')
      .send({ codigo: '91', nombre: 'Orden deudoras', padreId: raiz.body.data.id })
    expect(hija.status).toBe(201)
    expect(hija.body.data).toMatchObject({ nivel: 2, padreCodigo: '9', tipo: 'ORDEN' })

    const mal = await admin
      .post('/api/v1/cuentas')
      .send({ codigo: '81', nombre: 'No cuelga de 9', padreId: raiz.body.data.id })
    expect(mal.body.error.code).toBe('CODIGO_NO_COINCIDE_CON_PADRE')
    expect(mal.body.error.message).toContain('empezar por 9')
  })
})

describe('plan de cuentas HCC', () => {
  it('el archivo trae las 607 cuentas con saldos iniciales cuadrados', () => {
    expect(PLAN_HCC.cuentas).toHaveLength(607)
    expect(PLAN_HCC.totalDebe).toBe('46158288.30')
    expect(PLAN_HCC.totalHaber).toBe('46158288.30')
  })

  it('carga el plan, retira el de ejemplo y crea la apertura en borrador', async () => {
    const ej = await admin.post('/api/v1/periodos/ejercicios').send({ anio: 2026, mesInicio: 1 })
    expect(ej.status).toBe(201)

    // Todo dentro de una transacción que se revierte: la base de pruebas sigue con el plan de ejemplo
    const revertir = new Error('revertir')
    await expect(
      db.transaction(async (trx) => {
        await trx('tasas_cambio')
          .insert({ fecha: '2025-12-31', moneda: 'USD', fuente: 'BCV', tasa: '300.0000' })
          .onConflict(['fecha', 'moneda', 'fuente'])
          .merge(['tasa'])

        const plan = await cargarPlanHcc(trx)
        expect(plan).toMatchObject({ cargado: true, cuentas: 609, inactivas: 0 })
        expect(plan.retiradas).toBeGreaterThan(40)
        expect(await trx('cuentas').where('codigo', 'like', '%.%').first()).toBeUndefined()

        const c = async (codigo) => trx('cuentas').where({ codigo }).first()
        expect(await c('1')).toMatchObject({ nombre: 'ACTIVOS', es_movimiento: 0 })
        expect(await c('711101')).toMatchObject({ tipo: 'INGRESO', naturaleza: 'ACREEDORA' })
        expect(await c('811101')).toMatchObject({ tipo: 'GASTO', naturaleza: 'DEUDORA' })
        expect(await c('121205')).toMatchObject({ tipo: 'ACTIVO', naturaleza: 'ACREEDORA' })
        expect(await c('421101')).toMatchObject({ tipo: 'INGRESO', naturaleza: 'DEUDORA' })
        expect(await c('1145')).toMatchObject({ nivel: 4, es_movimiento: 1 })
        expect(await c('111105')).toMatchObject({ moneda: 'USD', es_movimiento: 1 })
        const caja = await c('111101')
        expect(caja.padre_id).toBe((await c('1111')).id)

        const empresa = await trx('empresa').where({ id: 1 }).first()
        expect(empresa.cuenta_ganancia_cambiaria_id).toBe((await c('711108')).id)
        expect(empresa.cuenta_perdida_cambiaria_id).toBe((await c('811106')).id)

        const apertura = await crearAperturaHcc(trx)
        expect(apertura).toMatchObject({ fecha: '2026-01-01', totalDebe: '46158288.30' })
        const comp = await trx('comprobantes').where({ id: apertura.id }).first()
        expect(comp).toMatchObject({
          estado: 'BORRADOR',
          total_debe: '46158288.30',
          total_haber: '46158288.30',
        })
        const divisas = await trx('comprobante_detalle')
          .where({ comprobante_id: apertura.id, cuenta_id: (await c('111105')).id })
          .first()
        expect(divisas).toMatchObject({ debe: '110730.19', monto_moneda: '369.10' })

        // Volver a ejecutarlo no duplica nada
        expect(await cargarPlanHcc(trx)).toEqual({ cargado: false })
        expect(await crearAperturaHcc(trx)).toBeNull()
        throw revertir
      }),
    ).rejects.toBe(revertir)

    expect(await db('cuentas').where({ codigo: '111101' }).first()).toBeUndefined()
  })
})
