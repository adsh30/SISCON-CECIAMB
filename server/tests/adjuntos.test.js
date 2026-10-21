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
const CONTADOR = { email: 'contador.adjuntos@pruebas.local', password: 'Clave-Contador-1' }
const ANALISTA = { email: 'analista.adjuntos@pruebas.local', password: 'Clave-Analista-1' }

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

let admin, contador, analista
const cuenta = {}
const tipo = {}

// Archivo PDF mínimo válido (%PDF-1.4 ... %%EOF)
const PDF_BASE64 = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n',
).toString('base64')

// Archivo PNG mínimo válido (1x1 transparente)
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

beforeAll(async () => {
  await crearUsuario(CONTADOR, 'CONTADOR', 'Contador Adjuntos')
  await crearUsuario(ANALISTA, 'ANALISTA', 'Analista Adjuntos')
  ;[admin, contador, analista] = await Promise.all([
    sesion(ADMIN),
    sesion(CONTADOR),
    sesion(ANALISTA),
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

const crearComprobante = async (agent, datos = {}) => {
  const res = await agent.post('/api/v1/comprobantes').send({
    tipoId: tipo.VEN,
    fecha: HOY,
    concepto: 'Factura con soporte adjunto',
    renglones: [
      { cuentaId: cuenta['1.1.01.01.001'], debe: '150.00', haber: '0' },
      { cuentaId: cuenta['4.1.01'], debe: '0', haber: '150.00' },
    ],
    ...datos,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

describe('documentos soporte adjuntos a comprobantes (RF-05.11)', () => {
  it('el analista sube un documento PDF a un comprobante borrador', async () => {
    const comp = await crearComprobante(analista)

    const res = await analista
      .post(`/api/v1/comprobantes/${comp.id}/adjuntos`)
      .send({ nombre: 'factura_001.pdf', contenido: PDF_BASE64 })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      comprobanteId: comp.id,
      nombre: 'factura_001.pdf',
      tipo: 'application/pdf',
    })
    expect(res.body.data.sha256).toBeDefined()
    expect(res.body.data.tamano).toBeGreaterThan(0)
  })

  it('lista los adjuntos de un comprobante sin devolver el blob binario', async () => {
    const comp = await crearComprobante(analista)

    await analista
      .post(`/api/v1/comprobantes/${comp.id}/adjuntos`)
      .send({ nombre: 'recibo.png', contenido: PNG_BASE64 })

    const res = await analista.get(`/api/v1/comprobantes/${comp.id}/adjuntos`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].nombre).toBe('recibo.png')
    expect(res.body.data[0].tipo).toBe('image/png')
    expect(res.body.data[0].datos).toBeUndefined()
  })

  it('descarga el archivo adjunto con Content-Type y encabezados correspondientes', async () => {
    const comp = await crearComprobante(analista)

    const subida = await analista
      .post(`/api/v1/comprobantes/${comp.id}/adjuntos`)
      .send({ nombre: 'documento_soporte.pdf', contenido: PDF_BASE64 })

    const adjuntoId = subida.body.data.id

    const res = await analista.get(`/api/v1/comprobantes/${comp.id}/adjuntos/${adjuntoId}`)
    expect(res.status).toBe(200)
    expect(res.header['content-type']).toBe('application/pdf')
    expect(res.header['content-disposition']).toContain('documento_soporte.pdf')
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('rechaza archivos con formatos no admitidos (por ejemplo, texto plano)', async () => {
    const comp = await crearComprobante(analista)

    const textoPlanoBase64 = Buffer.from('Esto es un archivo de texto').toString('base64')

    const res = await analista
      .post(`/api/v1/comprobantes/${comp.id}/adjuntos`)
      .send({ nombre: 'nota.txt', contenido: textoPlanoBase64 })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('FORMATO_NO_PERMITIDO')
  })

  it('elimina un adjunto y deja constancia en la bitácora', async () => {
    const comp = await crearComprobante(analista)

    const subida = await analista
      .post(`/api/v1/comprobantes/${comp.id}/adjuntos`)
      .send({ nombre: 'comprobante_banco.png', contenido: PNG_BASE64 })

    const adjuntoId = subida.body.data.id

    const resDel = await analista.delete(`/api/v1/comprobantes/${comp.id}/adjuntos/${adjuntoId}`)
    expect(resDel.status).toBe(204)

    const listado = await analista.get(`/api/v1/comprobantes/${comp.id}/adjuntos`)
    expect(listado.body.data).toHaveLength(0)

    const bitacora = await db('bitacora')
      .where({ entidad: 'comprobante_adjuntos', entidad_id: String(adjuntoId), accion: 'ELIMINAR' })
      .first()
    expect(bitacora).toBeDefined()
  })

  it('rechaza adjuntar o eliminar documentos en un comprobante anulado', async () => {
    const comp = await crearComprobante(contador)
    await contador.post(`/api/v1/comprobantes/${comp.id}/aprobar`)
    await contador.post(`/api/v1/comprobantes/${comp.id}/anular`).send({ motivo: 'Error en la factura emitida' })

    const res = await contador
      .post(`/api/v1/comprobantes/${comp.id}/adjuntos`)
      .send({ nombre: 'intento.pdf', contenido: PDF_BASE64 })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('COMPROBANTE_ANULADO')
  })
})

describe('dashboard contable ampliado (RF-09)', () => {
  it('el dashboard de inicio devuelve el resumen contable con comprobantes por categoría', async () => {
    const comp = await crearComprobante(contador, { tipoId: tipo.VEN })
    await contador.post(`/api/v1/comprobantes/${comp.id}/aprobar`)

    const res = await contador.get('/api/v1/dashboard')
    expect(res.status).toBe(200)

    const contable = res.body.data.comprobantes
    expect(contable).toBeDefined()
    expect(contable.aprobadosMes).toBeGreaterThanOrEqual(1)
    expect(Number(contable.totalMovilizadoMes)).toBeGreaterThanOrEqual(150)
    expect(Array.isArray(contable.porCategoria)).toBe(true)

    const ventas = contable.porCategoria.find((c) => c.codigo === 'VEN')
    expect(ventas).toBeDefined()
    expect(ventas.cantidad).toBeGreaterThanOrEqual(1)
    expect(Number(ventas.monto)).toBeGreaterThanOrEqual(150)

    expect(Array.isArray(contable.ultimosAprobados)).toBe(true)
    expect(contable.ultimosAprobados.length).toBeGreaterThanOrEqual(1)
    expect(contable.ultimosAprobados[0].codigo).toBeDefined()
  })
})

