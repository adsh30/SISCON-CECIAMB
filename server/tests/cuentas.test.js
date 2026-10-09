import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { db } from '../src/config/db.js'
import { testEnv } from './env.js'

const app = createApp()
const ADMIN = { email: testEnv.ADMIN_EMAIL, password: testEnv.ADMIN_PASSWORD }
const CONTADOR = { email: 'contador.cuentas@pruebas.local', password: 'Clave-Contador-1' }
const ANALISTA = { email: 'analista.cuentas@pruebas.local', password: 'Clave-Analista-1' }
const AUDITOR = { email: 'auditor.cuentas@pruebas.local', password: 'Clave-Auditor-1' }

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

let admin, contador, analista, auditor

beforeAll(async () => {
  await crearUsuario(CONTADOR, 'CONTADOR', 'Contador Cuentas')
  await crearUsuario(ANALISTA, 'ANALISTA', 'Analista Cuentas')
  await crearUsuario(AUDITOR, 'AUDITOR', 'Auditor Cuentas')
  ;[admin, contador, analista, auditor] = await Promise.all([
    sesion(ADMIN),
    sesion(CONTADOR),
    sesion(ANALISTA),
    sesion(AUDITOR),
  ])
})

afterAll(() => db.destroy())

describe('catálogo y plan de cuentas', () => {
  it('el seed carga el plan de cuentas base con cuentas raíz y auxiliares', async () => {
    const res = await admin.get('/api/v1/cuentas')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(20)

    const activo = res.body.data.find((c) => c.codigo === '1')
    expect(activo).toMatchObject({
      codigo: '1',
      nombre: 'ACTIVO',
      tipo: 'ACTIVO',
      naturaleza: 'DEUDORA',
      nivel: 1,
      esMovimiento: false,
    })

    const cajaPrincipal = res.body.data.find((c) => c.codigo === '1.1.01.01.001')
    expect(cajaPrincipal).toMatchObject({
      nombre: 'Caja Principal',
      tipo: 'ACTIVO',
      nivel: 5,
      esMovimiento: true,
    })
  })

  it('obtiene el árbol jerárquico anidado', async () => {
    const res = await admin.get('/api/v1/cuentas/arbol')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)

    // Las raíces son nivel 1 (1, 2, 3, 4, 5, 6)
    const activoNodo = res.body.data.find((n) => n.codigo === '1')
    expect(activoNodo).toBeDefined()
    expect(activoNodo.hijos.length).toBeGreaterThan(0)
  })

  it('el contador crea una nueva subcuenta válida y calcula el nivel automáticamente', async () => {
    // Buscar la cuenta padre de bancos (1.1.01.02)
    const cuentasRes = await contador.get('/api/v1/cuentas')
    const padre = cuentasRes.body.data.find((c) => c.codigo === '1.1.01.02')

    const res = await contador.post('/api/v1/cuentas').send({
      codigo: '1.1.01.02.099',
      nombre: 'Banco Provincial Cta. Cte.',
      padreId: padre.id,
      esMovimiento: true,
    })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      codigo: '1.1.01.02.099',
      nombre: 'Banco Provincial Cta. Cte.',
      tipo: 'ACTIVO',
      naturaleza: 'DEUDORA',
      nivel: padre.nivel + 1,
      esMovimiento: true,
      padreId: padre.id,
    })

    // Verifica que quedó en bitácora
    const bitacora = await db('bitacora')
      .where({ entidad: 'cuentas', entidad_id: String(res.body.data.id) })
      .first()
    expect(bitacora).toBeDefined()
    expect(bitacora.accion).toBe('CREAR')
  })

  it('rechaza código duplicado', async () => {
    const res = await contador.post('/api/v1/cuentas').send({
      codigo: '1',
      nombre: 'Activo duplicado',
      tipo: 'ACTIVO',
    })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CODIGO_DUPLICADO')
  })

  it('rechaza crear una subcuenta si el código no concuerda con el padre', async () => {
    const padre = (await contador.get('/api/v1/cuentas')).body.data.find((c) => c.codigo === '1.1')
    const res = await contador.post('/api/v1/cuentas').send({
      codigo: '2.1.99', // código de pasivo con padre de activo
      nombre: 'Cuenta incoherente',
      padreId: padre.id,
      tipo: 'ACTIVO',
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CODIGO_NO_COINCIDE_CON_PADRE')
  })

  it('rechaza crear subcuentas bajo una cuenta que es de movimiento', async () => {
    // 1.1.01.01.001 es de movimiento
    const cuentaMov = (await contador.get('/api/v1/cuentas')).body.data.find(
      (c) => c.codigo === '1.1.01.01.001',
    )
    expect(cuentaMov.esMovimiento).toBe(true)

    const res = await contador.post('/api/v1/cuentas').send({
      codigo: '1.1.01.01.001.01',
      nombre: 'Subcuenta inválida',
      padreId: cuentaMov.id,
      tipo: 'ACTIVO',
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('PADRE_ES_MOVIMIENTO')
  })

  it('no permite eliminar una cuenta con subcuentas', async () => {
    // 1.1 tiene muchas subcuentas
    const cuentaConHijas = (await contador.get('/api/v1/cuentas')).body.data.find(
      (c) => c.codigo === '1.1',
    )
    const res = await contador.delete(`/api/v1/cuentas/${cuentaConHijas.id}`)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TIENE_HIJOS')
  })

  it('analista y auditor no pueden crear ni editar cuentas (solo lectura)', async () => {
    const intentoCrear = await analista.post('/api/v1/cuentas').send({
      codigo: '1.99',
      nombre: 'Intento analista',
      tipo: 'ACTIVO',
    })
    expect(intentoCrear.status).toBe(403)

    const intentoEditar = await auditor.put('/api/v1/cuentas/1').send({
      nombre: 'Intento auditor',
    })
    expect(intentoEditar.status).toBe(403)
  })

  it('actualiza y desactiva una cuenta registrando la acción en bitácora', async () => {
    const listado = await contador.get('/api/v1/cuentas')
    const padreGasto = listado.body.data.find((c) => c.codigo === '6.1')

    const resCrear = await contador.post('/api/v1/cuentas').send({
      codigo: '6.1.99',
      nombre: 'Gasto Temporal',
      tipo: 'GASTO',
      padreId: padreGasto.id,
      esMovimiento: true,
    })
    expect(resCrear.status).toBe(201)
    const creada = resCrear.body.data

    const resDesactivar = await contador.put(`/api/v1/cuentas/${creada.id}`).send({
      activa: false,
    })
    expect(resDesactivar.status).toBe(200)
    expect(resDesactivar.body.data.activa).toBe(false)

    // Eliminar la cuenta creada
    const resEliminar = await contador.delete(`/api/v1/cuentas/${creada.id}`)
    expect(resEliminar.status).toBe(204)
  })
})

describe('centros de costo', () => {
  it('el seed inicial contiene los centros de costo del hospital', async () => {
    const res = await analista.get('/api/v1/centros-costo')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(8)

    const quirofano = res.body.data.find((cc) => cc.codigo === 'QUI')
    expect(quirofano).toMatchObject({
      codigo: 'QUI',
      nombre: 'Quirófano y Cirugía',
      activo: true,
    })
  })

  it('el contador puede crear y actualizar un centro de costo', async () => {
    const resCrear = await contador.post('/api/v1/centros-costo').send({
      codigo: 'ONC',
      nombre: 'Oncología Médica',
    })
    expect(resCrear.status).toBe(201)
    expect(resCrear.body.data).toMatchObject({
      codigo: 'ONC',
      nombre: 'Oncología Médica',
      activo: true,
    })

    const resEditar = await contador
      .put(`/api/v1/centros-costo/${resCrear.body.data.id}`)
      .send({ nombre: 'Oncología y Quimioterapia' })
    expect(resEditar.status).toBe(200)
    expect(resEditar.body.data.nombre).toBe('Oncología y Quimioterapia')

    // Eliminar
    const resEliminar = await contador.delete(`/api/v1/centros-costo/${resCrear.body.data.id}`)
    expect(resEliminar.status).toBe(204)
  })
})

describe('reglas reforzadas del plan de cuentas', () => {
  const buscar = async (codigo) =>
    (await admin.get('/api/v1/cuentas')).body.data.find((c) => c.codigo === codigo)

  it('los filtros booleanos respetan "false"', async () => {
    const grupos = await admin.get('/api/v1/cuentas?soloMovimiento=false')
    expect(grupos.status).toBe(200)
    expect(grupos.body.data.length).toBeGreaterThan(0)
    expect(grupos.body.data.every((c) => !c.esMovimiento)).toBe(true)

    const movimiento = await admin.get('/api/v1/cuentas?soloMovimiento=true')
    expect(movimiento.body.data.every((c) => c.esMovimiento)).toBe(true)

    expect((await admin.get('/api/v1/cuentas?soloActivas=quizas')).status).toBe(400)
  })

  it('la búsqueda trata % y _ como texto', async () => {
    const res = await admin.get('/api/v1/cuentas').query({ q: '%' })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
  })

  it('una subcuenta va exactamente un nivel debajo de su cuenta superior', async () => {
    const padre = await buscar('6.1')
    const res = await contador.post('/api/v1/cuentas').send({
      codigo: '6.1.50.01',
      nombre: 'Salta un nivel',
      padreId: padre.id,
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CODIGO_NO_COINCIDE_CON_PADRE')
  })

  it('una cuenta raíz lleva un código de un solo número', async () => {
    const res = await contador
      .post('/api/v1/cuentas')
      .send({ codigo: '8.1', nombre: 'Raíz con punto', tipo: 'ORDEN' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CODIGO_RAIZ')
  })

  it('no se desactiva un grupo con subcuentas activas ni se crean subcuentas bajo uno inactivo', async () => {
    const padre = await buscar('6.1')
    const grupo = (
      await contador
        .post('/api/v1/cuentas')
        .send({ codigo: '6.1.80', nombre: 'Grupo temporal', padreId: padre.id })
    ).body.data
    const hija = (
      await contador.post('/api/v1/cuentas').send({
        codigo: '6.1.80.01',
        nombre: 'Hija temporal',
        padreId: grupo.id,
        esMovimiento: true,
      })
    ).body.data

    const desactivarGrupo = await contador
      .put(`/api/v1/cuentas/${grupo.id}`)
      .send({ activa: false })
    expect(desactivarGrupo.status).toBe(400)
    expect(desactivarGrupo.body.error.code).toBe('SUBCUENTAS_ACTIVAS')

    expect((await contador.put(`/api/v1/cuentas/${hija.id}`).send({ activa: false })).status).toBe(
      200,
    )
    expect((await contador.put(`/api/v1/cuentas/${grupo.id}`).send({ activa: false })).status).toBe(
      200,
    )

    const bajoInactivo = await contador.post('/api/v1/cuentas').send({
      codigo: '6.1.80.02',
      nombre: 'Bajo inactivo',
      padreId: grupo.id,
    })
    expect(bajoInactivo.status).toBe(400)
    expect(bajoInactivo.body.error.code).toBe('PADRE_INACTIVO')

    const activarHija = await contador.put(`/api/v1/cuentas/${hija.id}`).send({ activa: true })
    expect(activarHija.status).toBe(400)
    expect(activarHija.body.error.code).toBe('PADRE_INACTIVO')

    await admin.delete(`/api/v1/cuentas/${hija.id}`)
    await admin.delete(`/api/v1/cuentas/${grupo.id}`)
  })

  it('guardar sin cambios no escribe en la bitácora ni borra la descripción', async () => {
    const padre = await buscar('6.1')
    const cuenta = (
      await contador.post('/api/v1/cuentas').send({
        codigo: '6.1.81',
        nombre: 'Con descripción',
        descripcion: 'No se debe perder',
        padreId: padre.id,
        esMovimiento: true,
      })
    ).body.data

    const antes = await db('bitacora').where({ entidad: 'cuentas', entidad_id: String(cuenta.id) })
    const res = await contador
      .put(`/api/v1/cuentas/${cuenta.id}`)
      .send({ nombre: 'Con descripción' })
    expect(res.status).toBe(200)
    expect(res.body.data.descripcion).toBe('No se debe perder')
    const despues = await db('bitacora').where({
      entidad: 'cuentas',
      entidad_id: String(cuenta.id),
    })
    expect(despues).toHaveLength(antes.length)

    await admin.delete(`/api/v1/cuentas/${cuenta.id}`)
  })

  it('eliminar exige control total del plan de cuentas', async () => {
    const rol = await db('roles').where({ codigo: 'ANALISTA' }).first()
    await db('roles_permisos')
      .where({ rol_id: rol.id, modulo: 'plan_cuentas' })
      .update({ escritura: true, full: false })
    try {
      const padre = await buscar('6.1')
      const cuenta = (
        await admin
          .post('/api/v1/cuentas')
          .send({ codigo: '6.1.82', nombre: 'Para borrar', padreId: padre.id, esMovimiento: true })
      ).body.data
      expect((await analista.delete(`/api/v1/cuentas/${cuenta.id}`)).status).toBe(403)
      expect((await admin.delete(`/api/v1/cuentas/${cuenta.id}`)).status).toBe(204)
    } finally {
      await db('roles_permisos')
        .where({ rol_id: rol.id, modulo: 'plan_cuentas' })
        .update({ escritura: false, full: false })
    }
  })

  it('el código del centro de costo solo acepta letras, números y guiones', async () => {
    const res = await contador
      .post('/api/v1/centros-costo')
      .send({ codigo: 'EME 2', nombre: 'Con espacio' })
    expect(res.status).toBe(400)
  })
})
