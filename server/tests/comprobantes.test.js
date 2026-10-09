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
const CONTADOR = { email: 'contador.comprobantes@pruebas.local', password: 'Clave-Contador-1' }
const ANALISTA = { email: 'analista.comprobantes@pruebas.local', password: 'Clave-Analista-1' }
const AUDITOR = { email: 'auditor.comprobantes@pruebas.local', password: 'Clave-Auditor-1' }

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
const ENERO = `${ANIO}-01-15`

let admin, contador, analista, auditor
const cuenta = {}
const tipo = {}

beforeAll(async () => {
  await crearUsuario(CONTADOR, 'CONTADOR', 'Contador Comprobantes')
  await crearUsuario(ANALISTA, 'ANALISTA', 'Analista Comprobantes')
  await crearUsuario(AUDITOR, 'AUDITOR', 'Auditor Comprobantes')
  ;[admin, contador, analista, auditor] = await Promise.all([
    sesion(ADMIN),
    sesion(CONTADOR),
    sesion(ANALISTA),
    sesion(AUDITOR),
  ])
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

/** Venta de contado: Caja al Debe, Ingreso por hospitalización al Haber */
const venta = (monto = '1500.00', extra = {}) => ({
  tipoId: tipo.VEN,
  fecha: HOY,
  concepto: 'Cobro de hospitalización',
  referencia: 'FAC-0001',
  renglones: [
    { cuentaId: cuenta['1.1.01.01.001'], debe: monto, haber: '0' },
    { cuentaId: cuenta['4.1.01'], debe: '0', haber: monto },
  ],
  ...extra,
})

describe('tipos de comprobante', () => {
  it('trae los 8 tipos del hospital en orden', async () => {
    const res = await auditor.get('/api/v1/comprobantes/tipos')
    expect(res.status).toBe(200)
    expect(res.body.data.map((t) => t.codigo)).toEqual([
      'VEN',
      'COM',
      'HON',
      'NOM',
      'DIA',
      'AJU',
      'ING',
      'EGR',
    ])
  })

  it('solo control total crea tipos; un tipo inactivo no admite comprobantes nuevos', async () => {
    expect(
      (
        await analista
          .post('/api/v1/comprobantes/tipos')
          .send({ codigo: 'DON', nombre: 'Donaciones' })
      ).status,
    ).toBe(403)
    const creado = await contador
      .post('/api/v1/comprobantes/tipos')
      .send({ codigo: 'don', nombre: 'Donaciones' })
    expect(creado.status).toBe(201)
    expect(creado.body.data.codigo).toBe('DON')

    const dup = await contador
      .post('/api/v1/comprobantes/tipos')
      .send({ codigo: 'DON', nombre: 'Otra' })
    expect(dup.status).toBe(409)

    await contador.put(`/api/v1/comprobantes/tipos/${creado.body.data.id}`).send({ activo: false })
    const res = await analista
      .post('/api/v1/comprobantes')
      .send(venta('10', { tipoId: creado.body.data.id }))
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TIPO_INACTIVO')
  })
})

describe('borradores', () => {
  it('el analista crea un borrador sin número y queda en la bitácora', async () => {
    const res = await analista.post('/api/v1/comprobantes').send(venta())
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      estado: 'BORRADOR',
      numero: null,
      codigo: null,
      totalDebe: '1500.00',
      totalHaber: '1500.00',
      tipo: { codigo: 'VEN' },
    })
    expect(res.body.data.renglones).toHaveLength(2)
    expect(res.body.data.historial[0].accion).toBe('CREAR')
  })

  it('valida cada renglón: Debe o Haber, nunca ambos ni ninguno', async () => {
    const ambos = await analista.post('/api/v1/comprobantes').send(
      venta('10', {
        renglones: [{ cuentaId: cuenta['1.1.01.01.001'], debe: '10', haber: '10' }],
      }),
    )
    expect(ambos.status).toBe(400)
    expect(ambos.body.error.details[0].mensaje).toMatch(/no en ambos/)

    const ninguno = await analista
      .post('/api/v1/comprobantes')
      .send(
        venta('10', { renglones: [{ cuentaId: cuenta['1.1.01.01.001'], debe: '0', haber: '' }] }),
      )
    expect(ninguno.status).toBe(400)

    const decimales = await analista.post('/api/v1/comprobantes').send(venta('10.555'))
    expect(decimales.status).toBe(400)
  })

  it('solo acepta cuentas de movimiento activas', async () => {
    const grupo = await analista.post('/api/v1/comprobantes').send(
      venta('10', {
        renglones: [
          { cuentaId: cuenta['1.1'], debe: '10' },
          { cuentaId: cuenta['4.1.01'], haber: '10' },
        ],
      }),
    )
    expect(grupo.status).toBe(400)
    expect(grupo.body.error.code).toBe('CUENTA_DE_GRUPO')
    expect(grupo.body.error.message).toMatch(/^Renglón 1/)
  })

  it('un borrador puede guardarse descuadrado, pero no aprobarse', async () => {
    const borrador = await analista.post('/api/v1/comprobantes').send(
      venta('10', {
        renglones: [
          { cuentaId: cuenta['1.1.01.01.001'], debe: '100' },
          { cuentaId: cuenta['4.1.01'], haber: '99.99' },
        ],
      }),
    )
    expect(borrador.status).toBe(201)
    const res = await contador.post(`/api/v1/comprobantes/${borrador.body.data.id}/aprobar`)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('DESCUADRADO')
  })

  it('aprobar exige al menos dos renglones', async () => {
    const uno = await analista
      .post('/api/v1/comprobantes')
      .send(venta('10', { renglones: [{ cuentaId: cuenta['1.1.01.01.001'], debe: '10' }] }))
    const res = await contador.post(`/api/v1/comprobantes/${uno.body.data.id}/aprobar`)
    expect(res.body.error.code).toBe('MINIMO_RENGLONES')
  })

  it('se edita y elimina mientras es borrador', async () => {
    const { id } = (await analista.post('/api/v1/comprobantes').send(venta())).body.data
    const editado = await analista
      .put(`/api/v1/comprobantes/${id}`)
      .send(venta('2000.50', { concepto: 'Cobro corregido' }))
    expect(editado.status).toBe(200)
    expect(editado.body.data).toMatchObject({ concepto: 'Cobro corregido', totalDebe: '2000.50' })
    expect((await analista.delete(`/api/v1/comprobantes/${id}`)).status).toBe(204)
    expect((await analista.get(`/api/v1/comprobantes/${id}`)).status).toBe(404)
  })

  it('el auditor solo consulta', async () => {
    expect((await auditor.get('/api/v1/comprobantes')).status).toBe(200)
    expect((await auditor.post('/api/v1/comprobantes').send(venta())).status).toBe(403)
  })
})

describe('aprobación, correlativo e inmutabilidad', () => {
  it('el analista no aprueba; el contador sí y recibe el correlativo del tipo y período', async () => {
    const a = (await analista.post('/api/v1/comprobantes').send(venta())).body.data
    const b = (await analista.post('/api/v1/comprobantes').send(venta('300'))).body.data

    expect((await analista.post(`/api/v1/comprobantes/${a.id}/aprobar`)).status).toBe(403)

    const ra = await contador.post(`/api/v1/comprobantes/${a.id}/aprobar`)
    expect(ra.status).toBe(200)
    const mes = HOY.slice(5, 7)
    expect(ra.body.data).toMatchObject({ estado: 'APROBADO', numero: 1 })
    expect(ra.body.data.codigo).toBe(`VEN-${ANIO}-${mes}-0001`)
    expect(ra.body.data.aprobadoPor).toBe('Contador Comprobantes')

    const rb = await contador.post(`/api/v1/comprobantes/${b.id}/aprobar`)
    expect(rb.body.data.codigo).toBe(`VEN-${ANIO}-${mes}-0002`)

    // Otro tipo empieza su propia numeración
    const compra = (
      await analista.post('/api/v1/comprobantes').send(
        venta('50', {
          tipoId: tipo.COM,
          renglones: [
            { cuentaId: cuenta['1.1.03.01'], debe: '50' },
            { cuentaId: cuenta['2.1.01.01'], haber: '50' },
          ],
        }),
      )
    ).body.data
    const rc = await contador.post(`/api/v1/comprobantes/${compra.id}/aprobar`)
    expect(rc.body.data.codigo).toBe(`COM-${ANIO}-${mes}-0001`)
  })

  it('aprobaciones simultáneas no repiten ni saltan números', async () => {
    const ids = []
    for (let i = 0; i < 5; i++) {
      ids.push(
        (await analista.post('/api/v1/comprobantes').send(venta('1', { tipoId: tipo.DIA }))).body
          .data.id,
      )
    }
    const res = await Promise.all(
      ids.map((id) => contador.post(`/api/v1/comprobantes/${id}/aprobar`)),
    )
    expect(res.map((r) => [r.status, r.body.error?.message])).toEqual(
      res.map(() => [200, undefined]),
    )
    const numeros = res.map((r) => r.body.data.numero).sort((x, y) => x - y)
    expect(numeros).toEqual([1, 2, 3, 4, 5])
  })

  it('un aprobado no se edita ni se elimina, ni siquiera directo en la base de datos', async () => {
    const c = (await analista.post('/api/v1/comprobantes').send(venta())).body.data
    await contador.post(`/api/v1/comprobantes/${c.id}/aprobar`)

    const editar = await contador.put(`/api/v1/comprobantes/${c.id}`).send(venta('1'))
    expect(editar.status).toBe(409)
    expect(editar.body.error.code).toBe('NO_ES_BORRADOR')
    expect((await contador.delete(`/api/v1/comprobantes/${c.id}`)).status).toBe(409)

    await expect(
      db('comprobantes').where({ id: c.id }).update({ concepto: 'Alterado' }),
    ).rejects.toThrow(/solo se puede anular/)
    await expect(db('comprobantes').where({ id: c.id }).del()).rejects.toThrow(/borrador/)
    await expect(
      db('comprobante_detalle').where({ comprobante_id: c.id }).update({ debe: '1.00' }),
    ).rejects.toThrow(/no se pueden modificar/)
  })

  it('anular exige motivo y control total; el anulado conserva su número', async () => {
    const c = (await analista.post('/api/v1/comprobantes').send(venta())).body.data
    const aprobado = (await contador.post(`/api/v1/comprobantes/${c.id}/aprobar`)).body.data

    const sinMotivo = await contador
      .post(`/api/v1/comprobantes/${c.id}/anular`)
      .send({ motivo: 'corto' })
    expect(sinMotivo.status).toBe(400)
    expect(
      (
        await analista
          .post(`/api/v1/comprobantes/${c.id}/anular`)
          .send({ motivo: 'Factura duplicada por error' })
      ).status,
    ).toBe(403)

    const res = await contador
      .post(`/api/v1/comprobantes/${c.id}/anular`)
      .send({ motivo: 'Factura duplicada por error' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      estado: 'ANULADO',
      codigo: aprobado.codigo,
      motivoAnulacion: 'Factura duplicada por error',
      anuladoPor: 'Contador Comprobantes',
    })
    expect(res.body.data.historial.map((h) => h.accion)).toEqual(['CREAR', 'APROBAR', 'ANULAR'])

    const otra = await contador
      .post(`/api/v1/comprobantes/${c.id}/anular`)
      .send({ motivo: 'Factura duplicada por error' })
    expect(otra.body.error.code).toBe('NO_ES_APROBADO')
  })
})

describe('duplicar y reversar', () => {
  it('el reverso invierte Debe y Haber y apunta al original', async () => {
    const c = (await analista.post('/api/v1/comprobantes').send(venta('750.25'))).body.data
    const orig = (await contador.post(`/api/v1/comprobantes/${c.id}/aprobar`)).body.data

    const res = await analista.post(`/api/v1/comprobantes/${c.id}/reversar`).send({})
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      estado: 'BORRADOR',
      fecha: HOY,
      origen: { id: c.id, codigo: orig.codigo, tipo: 'REVERSO' },
    })
    expect(res.body.data.concepto).toMatch(new RegExp(`^Reverso de ${orig.codigo}`))
    expect(res.body.data.renglones[0]).toMatchObject({ debe: '0.00', haber: '750.25' })
    expect(res.body.data.renglones[1]).toMatchObject({ debe: '750.25', haber: '0.00' })
  })

  it('no se reversa un borrador; sí se duplica', async () => {
    const c = (await analista.post('/api/v1/comprobantes').send(venta())).body.data
    expect((await analista.post(`/api/v1/comprobantes/${c.id}/reversar`).send({})).status).toBe(409)
    const dup = await analista.post(`/api/v1/comprobantes/${c.id}/duplicar`)
    expect(dup.status).toBe(201)
    expect(dup.body.data).toMatchObject({ concepto: c.concepto, origen: { tipo: 'DUPLICADO' } })
  })
})

describe('períodos', () => {
  it('no se registra sin período ni en un período cerrado; no se cierra con borradores', async () => {
    const sinPeriodo = await analista
      .post('/api/v1/comprobantes')
      .send(venta('1', { fecha: `${ANIO + 5}-01-10` }))
    expect(sinPeriodo.status).toBe(409)
    expect(sinPeriodo.body.error.code).toBe('SIN_PERIODO')

    const enero = (await db('periodos').where({ anio: ANIO, mes: 1 }).first()).id
    const borrador = (
      await analista.post('/api/v1/comprobantes').send(venta('1', { fecha: ENERO }))
    ).body.data
    const cerrar = await contador.post(`/api/v1/periodos/${enero}/cerrar`)
    expect(cerrar.status).toBe(409)
    expect(cerrar.body.error.code).toBe('PERIODO_CON_BORRADORES')

    await analista.delete(`/api/v1/comprobantes/${borrador.id}`)
    expect((await contador.post(`/api/v1/periodos/${enero}/cerrar`)).status).toBe(200)

    const enCerrado = await analista.post('/api/v1/comprobantes').send(venta('1', { fecha: ENERO }))
    expect(enCerrado.body.error.code).toBe('PERIODO_CERRADO')

    await admin
      .post(`/api/v1/periodos/${enero}/reabrir`)
      .send({ motivo: 'Fin de la prueba de comprobantes' })
  })

  it('no se elimina un ejercicio con comprobantes', async () => {
    const ej = await db('ejercicios').where({ anio: ANIO }).first()
    const res = await admin.delete(`/api/v1/periodos/ejercicios/${ej.id}`)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EJERCICIO_CON_COMPROBANTES')
  })
})

describe('listado', () => {
  it('filtra por tipo, estado, texto y cuenta, y cuenta por tipo para las pestañas', async () => {
    const todos = await auditor.get('/api/v1/comprobantes')
    expect(todos.status).toBe(200)
    expect(todos.body.meta.total).toBeGreaterThan(5)
    expect(todos.body.meta.porTipo[tipo.VEN]).toBeGreaterThan(0)

    const compras = await auditor.get(`/api/v1/comprobantes?tipoId=${tipo.COM}`)
    expect(compras.body.data.every((c) => c.tipo.codigo === 'COM')).toBe(true)
    // Las pestañas siguen mostrando los demás tipos
    expect(compras.body.meta.porTipo[tipo.VEN]).toBe(todos.body.meta.porTipo[tipo.VEN])

    const anulados = await auditor.get('/api/v1/comprobantes?estado=ANULADO')
    expect(anulados.body.data.every((c) => c.estado === 'ANULADO')).toBe(true)

    const conInventario = await auditor.get(`/api/v1/comprobantes?cuentaId=${cuenta['1.1.03.01']}`)
    expect(conInventario.body.data).toHaveLength(1)

    const texto = await auditor.get('/api/v1/comprobantes').query({ buscar: 'corregido' })
    expect(texto.body.meta.total).toBe(0)
  })

  it('el tablero de inicio cuenta los borradores pendientes', async () => {
    const res = await contador.get('/api/v1/dashboard')
    expect(res.body.data.comprobantes.borradores).toBeGreaterThan(0)
  })
})
