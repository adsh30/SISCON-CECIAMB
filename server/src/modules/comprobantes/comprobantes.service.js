import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { fechaHoyVE } from '../../utils/fechas.js'
import { aEscalado, sumar } from '../../utils/money.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import { fechaVE, nombrePeriodo } from '../periodos/periodos.fechas.js'
import { exigirPeriodoAbierto } from '../periodos/periodos.service.js'
import * as repo from './comprobantes.repository.js'

const ENTIDAD = 'comprobantes'

/**
 * El correlativo lo comparten aprobaciones simultáneas. MariaDB 11.8 trae
 * innodb_snapshot_isolation activado: en REPEATABLE READ rechaza bloquear una fila que otra
 * transacción cambió después de la primera lectura ("Record has changed since last read").
 * Con READ COMMITTED cada bloqueo ve el último valor confirmado y espera su turno.
 */
const CONTADOR_COMPARTIDO = { isolationLevel: 'read committed' }
const conflicto = (code, message) => new AppError(409, code, message)
const invalido = (code, message) => new AppError(400, code, message)
const noExiste = () => new AppError(404, 'NO_ENCONTRADO', 'El comprobante no existe')
const nombre = (n, a) => (n ? [n, a].filter(Boolean).join(' ') : null)

/** Número legible: VEN-2026-10-0001 */
export const codigoComprobante = (tipoCodigo, periodo, numero) =>
  `${tipoCodigo}-${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-${String(numero).padStart(4, '0')}`

const aRenglon = (r) => ({
  id: r.id,
  renglon: r.renglon,
  cuentaId: r.cuenta_id,
  cuentaCodigo: r.cuenta_codigo,
  cuentaNombre: r.cuenta_nombre,
  centroCostoId: r.centro_costo_id,
  centroCodigo: r.centro_codigo,
  centroNombre: r.centro_nombre,
  descripcion: r.descripcion,
  debe: r.debe,
  haber: r.haber,
  referencia: r.referencia,
})

const aPublico = (c) => ({
  id: c.id,
  tipo: { id: c.tipo_id, codigo: c.tipo_codigo, nombre: c.tipo_nombre },
  periodo: {
    id: c.periodo_id,
    nombre: nombrePeriodo({ anio: c.periodo_anio, mes: c.periodo_mes }),
    estado: c.periodo_estado,
  },
  numero: c.numero,
  codigo: c.codigo,
  fecha: c.fecha,
  concepto: c.concepto,
  referencia: c.referencia,
  beneficiario: c.beneficiario,
  estado: c.estado,
  totalDebe: c.total_debe,
  totalHaber: c.total_haber,
  origen: c.origen_id ? { id: c.origen_id, codigo: c.origen_codigo, tipo: c.origen_tipo } : null,
  creadoEn: c.creado_en,
  creadoPor: nombre(c.creado_por_nombre, c.creado_por_apellido),
  actualizadoEn: c.actualizado_en,
  actualizadoPor: nombre(c.actualizado_por_nombre, c.actualizado_por_apellido),
  aprobadoEn: c.aprobado_en,
  aprobadoPor: nombre(c.aprobado_por_nombre, c.aprobado_por_apellido),
  anuladoEn: c.anulado_en,
  anuladoPor: nombre(c.anulado_por_nombre, c.anulado_por_apellido),
  motivoAnulacion: c.motivo_anulacion,
})

/** Lo que queda en la bitácora: cabecera y renglones legibles */
const instantanea = (c, renglones) => ({
  numero: c.codigo ?? `Borrador #${c.id}`,
  tipo: c.tipo_codigo,
  fecha: fechaVE(c.fecha),
  concepto: c.concepto,
  referencia: c.referencia,
  beneficiario: c.beneficiario,
  estado: c.estado,
  totalDebe: c.total_debe,
  totalHaber: c.total_haber,
  renglones: renglones.map((r) => ({
    cuenta: r.cuenta_codigo,
    centro: r.centro_codigo ?? null,
    debe: r.debe,
    haber: r.haber,
    descripcion: r.descripcion,
  })),
})

const nombreDe = (c) => (c.codigo ? `El comprobante ${c.codigo}` : `El borrador #${c.id}`)

// --- Consultas ---

export async function listar(filtros) {
  const { filas, total, porTipo } = await repo.listar(filtros)
  return {
    data: filas.map(aPublico),
    meta: {
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.max(1, Math.ceil(total / filtros.porPagina)),
      total,
      porTipo,
    },
  }
}

export async function detalle(id) {
  const c = await repo.porId(id)
  if (!c) throw noExiste()
  const [renglones, historial] = await Promise.all([
    repo.renglones(id),
    repo.historial(id, c.creado_en),
  ])
  return {
    ...aPublico(c),
    renglones: renglones.map(aRenglon),
    historial: historial.map((h) => ({
      id: h.id,
      fecha: h.fecha,
      accion: h.accion,
      usuario: nombre(h.nombre, h.apellido),
    })),
  }
}

// --- Validaciones compartidas ---

async function tipoActivo(tipoId, trx) {
  const tipo = await repo.tipoPorId(tipoId, trx)
  if (!tipo) throw invalido('TIPO_INVALIDO', 'El tipo de comprobante no existe')
  if (!tipo.activo) {
    throw invalido('TIPO_INACTIVO', `El tipo ${tipo.nombre} está inactivo; elija otro`)
  }
  return tipo
}

/** Cuentas de movimiento activas y centros de costo activos, renglón por renglón */
async function validarRenglones(renglones, trx) {
  const idsCuentas = [...new Set(renglones.map((r) => r.cuentaId))]
  const idsCentros = [...new Set(renglones.map((r) => r.centroCostoId).filter(Boolean))]
  const [cuentas, centros] = await Promise.all([
    idsCuentas.length ? repo.cuentasPorId(idsCuentas, trx) : [],
    idsCentros.length ? repo.centrosPorId(idsCentros, trx) : [],
  ])
  const cuenta = new Map(cuentas.map((c) => [c.id, c]))
  const centro = new Map(centros.map((c) => [c.id, c]))

  renglones.forEach((r, i) => {
    const n = `Renglón ${i + 1}`
    const cu = cuenta.get(r.cuentaId)
    if (!cu) throw invalido('CUENTA_INVALIDA', `${n}: la cuenta no existe`)
    if (!cu.es_movimiento) {
      throw invalido(
        'CUENTA_DE_GRUPO',
        `${n}: ${cu.codigo} ${cu.nombre} es una cuenta de grupo; use una cuenta de movimiento`,
      )
    }
    if (!cu.activa) {
      throw invalido('CUENTA_INACTIVA', `${n}: la cuenta ${cu.codigo} ${cu.nombre} está inactiva`)
    }
    if (r.centroCostoId) {
      const cc = centro.get(r.centroCostoId)
      if (!cc) throw invalido('CENTRO_INVALIDO', `${n}: el centro de costo no existe`)
      if (!cc.activo) {
        throw invalido('CENTRO_INACTIVO', `${n}: el centro de costo ${cc.codigo} está inactivo`)
      }
    }
  })
}

const totales = (renglones) => ({
  total_debe: sumar('0', ...renglones.map((r) => r.debe)),
  total_haber: sumar('0', ...renglones.map((r) => r.haber)),
})

/** Partida doble: al menos 2 renglones y Σ Debe = Σ Haber > 0 */
function exigirCuadre(renglones, c) {
  if (renglones.length < 2) {
    throw invalido(
      'MINIMO_RENGLONES',
      'Un comprobante necesita al menos 2 renglones para aprobarse',
    )
  }
  const debe = aEscalado(c.total_debe)
  const haber = aEscalado(c.total_haber)
  if (debe !== haber) {
    throw invalido(
      'DESCUADRADO',
      `El comprobante no cuadra: Debe ${c.total_debe} y Haber ${c.total_haber}. La diferencia debe ser cero`,
    )
  }
  if (debe === 0n) throw invalido('SIN_MONTOS', 'El comprobante no tiene montos')
}

async function cargarBloqueado(id, trx) {
  await repo.bloquear(id, trx)
  const c = await repo.porId(id, trx)
  if (!c) throw noExiste()
  return c
}

function exigirBorrador(c, accion) {
  if (c.estado !== 'BORRADOR') {
    throw conflicto(
      'NO_ES_BORRADOR',
      `${nombreDe(c)} está ${c.estado === 'APROBADO' ? 'aprobado' : 'anulado'}: no se puede ${accion}`,
    )
  }
}

// --- Escrituras ---

async function insertarBorrador(datos, actor, trx, origen) {
  await tipoActivo(datos.tipoId, trx)
  const periodo = await exigirPeriodoAbierto(datos.fecha, trx)
  await validarRenglones(datos.renglones, trx)

  const [id] = await trx('comprobantes').insert({
    tipo_id: datos.tipoId,
    periodo_id: periodo.id,
    fecha: datos.fecha,
    concepto: datos.concepto,
    referencia: datos.referencia ?? null,
    beneficiario: datos.beneficiario ?? null,
    ...totales(datos.renglones),
    origen_id: origen?.id ?? null,
    origen_tipo: origen?.tipo ?? null,
    creado_por: actor.id,
    actualizado_por: actor.id,
  })
  await repo.reemplazarRenglones(id, datos.renglones, trx)
  return id
}

async function registrarCambio(trx, { actor, accion, id, antes, ctx }) {
  const [c, renglones] = await Promise.all([repo.porId(id, trx), repo.renglones(id, trx)])
  await registrar(trx, {
    usuarioId: actor.id,
    accion,
    entidad: ENTIDAD,
    entidadId: id,
    antes,
    despues: instantanea(c, renglones),
    ctx,
  })
}

export async function crear(datos, actor, ctx) {
  const id = await db.transaction(async (trx) => {
    const id = await insertarBorrador(datos, actor, trx)
    await registrarCambio(trx, { actor, accion: ACCIONES.CREAR, id, ctx })
    return id
  })
  return detalle(id)
}

export async function actualizar(id, datos, actor, ctx) {
  await db.transaction(async (trx) => {
    const c = await cargarBloqueado(id, trx)
    exigirBorrador(c, 'modificar')
    // El período de origen también debe seguir abierto (si cambia la fecha, ambos)
    await exigirPeriodoAbierto(c.fecha, trx)
    const antes = instantanea(c, await repo.renglones(id, trx))

    await tipoActivo(datos.tipoId, trx)
    const periodo = await exigirPeriodoAbierto(datos.fecha, trx)
    await validarRenglones(datos.renglones, trx)

    await trx('comprobantes')
      .where({ id })
      .update({
        tipo_id: datos.tipoId,
        periodo_id: periodo.id,
        fecha: datos.fecha,
        concepto: datos.concepto,
        referencia: datos.referencia ?? null,
        beneficiario: datos.beneficiario ?? null,
        ...totales(datos.renglones),
        actualizado_por: actor.id,
        actualizado_en: trx.fn.now(),
      })
    await repo.reemplazarRenglones(id, datos.renglones, trx)
    await registrarCambio(trx, { actor, accion: ACCIONES.EDITAR, id, antes, ctx })
  })
  return detalle(id)
}

export async function eliminar(id, actor, ctx) {
  await db.transaction(async (trx) => {
    const c = await cargarBloqueado(id, trx)
    exigirBorrador(c, 'eliminar')
    const antes = instantanea(c, await repo.renglones(id, trx))
    await trx('comprobantes').where({ id }).del() // los renglones se van en cascada
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.ELIMINAR,
      entidad: ENTIDAD,
      entidadId: id,
      antes,
      ctx,
    })
  })
}

export async function aprobar(id, actor, ctx) {
  await db.transaction(async (trx) => {
    const c = await cargarBloqueado(id, trx)
    exigirBorrador(c, 'aprobar')
    const periodo = await exigirPeriodoAbierto(c.fecha, trx)
    const filas = await repo.renglones(id, trx)
    const renglones = filas.map((r) => ({
      cuentaId: r.cuenta_id,
      centroCostoId: r.centro_costo_id,
      debe: r.debe,
      haber: r.haber,
    }))
    // Las cuentas pudieron desactivarse desde que se guardó el borrador
    await validarRenglones(renglones, trx)
    exigirCuadre(renglones, c)
    const antes = instantanea(c, filas)

    const numero = await repo.siguienteNumero(c.tipo_id, periodo.id, trx)
    await trx('comprobantes')
      .where({ id })
      .update({
        estado: 'APROBADO',
        numero,
        codigo: codigoComprobante(c.tipo_codigo, periodo, numero),
        aprobado_por: actor.id,
        aprobado_en: trx.fn.now(),
      })
    await registrarCambio(trx, { actor, accion: ACCIONES.APROBAR, id, antes, ctx })
  }, CONTADOR_COMPARTIDO)
  return detalle(id)
}

export async function anular(id, motivo, actor, ctx) {
  await db.transaction(async (trx) => {
    const c = await cargarBloqueado(id, trx)
    if (c.estado !== 'APROBADO') {
      throw conflicto(
        'NO_ES_APROBADO',
        c.estado === 'ANULADO'
          ? `${nombreDe(c)} ya está anulado`
          : 'Un borrador no se anula: elimínelo o modifíquelo',
      )
    }
    await exigirPeriodoAbierto(c.fecha, trx)
    const antes = instantanea(c, await repo.renglones(id, trx))
    await trx('comprobantes').where({ id }).update({
      estado: 'ANULADO',
      anulado_por: actor.id,
      anulado_en: trx.fn.now(),
      motivo_anulacion: motivo,
    })
    await registrarCambio(trx, { actor, accion: ACCIONES.ANULAR, id, antes, ctx })
  })
  return detalle(id)
}

/** Copia como borrador nuevo; el reverso invierte Debe y Haber (RF-05.7) */
async function copiar(id, { fecha }, actor, ctx, tipoCopia) {
  const nuevoId = await db.transaction(async (trx) => {
    const c = await repo.porId(id, trx)
    if (!c) throw noExiste()
    if (tipoCopia === 'REVERSO' && c.estado !== 'APROBADO') {
      throw conflicto('NO_ES_APROBADO', 'Solo se reversan comprobantes aprobados')
    }
    const filas = await repo.renglones(id, trx)
    const reverso = tipoCopia === 'REVERSO'
    const datos = {
      tipoId: c.tipo_id,
      fecha: fecha ?? fechaHoyVE(),
      concepto: reverso ? `Reverso de ${c.codigo}: ${c.concepto}`.slice(0, 255) : c.concepto,
      referencia: c.referencia,
      beneficiario: c.beneficiario,
      renglones: filas.map((r) => ({
        cuentaId: r.cuenta_id,
        centroCostoId: r.centro_costo_id,
        descripcion: r.descripcion,
        debe: reverso ? r.haber : r.debe,
        haber: reverso ? r.debe : r.haber,
        referencia: r.referencia,
      })),
    }
    const nuevo = await insertarBorrador(datos, actor, trx, { id, tipo: tipoCopia })
    await registrarCambio(trx, { actor, accion: ACCIONES.CREAR, id: nuevo, ctx })
    return nuevo
  })
  return detalle(nuevoId)
}

export const duplicar = (id, datos, actor, ctx) => copiar(id, datos, actor, ctx, 'DUPLICADO')
export const reversar = (id, datos, actor, ctx) => copiar(id, datos, actor, ctx, 'REVERSO')

// --- Tipos de comprobante (RF-04) ---

const aTipo = (t) => ({
  id: t.id,
  codigo: t.codigo,
  nombre: t.nombre,
  descripcion: t.descripcion,
  orden: t.orden,
  activo: !!t.activo,
})

export const listarTipos = async () => (await repo.tipos()).map(aTipo)

export async function crearTipo(datos, actor, ctx) {
  return db.transaction(async (trx) => {
    if (await trx('tipos_comprobante').where({ codigo: datos.codigo }).first()) {
      throw conflicto('CODIGO_DUPLICADO', `Ya existe un tipo con el código ${datos.codigo}`)
    }
    const [id] = await trx('tipos_comprobante').insert({
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      orden: datos.orden,
      actualizado_por: actor.id,
    })
    const tipo = aTipo(await repo.tipoPorId(id, trx))
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: 'tipos_comprobante',
      entidadId: id,
      despues: tipo,
      ctx,
    })
    return tipo
  })
}

export async function actualizarTipo(id, datos, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await repo.tipoPorId(id, trx)
    if (!antes) throw new AppError(404, 'NO_ENCONTRADO', 'El tipo de comprobante no existe')
    const cambios = Object.fromEntries(
      Object.entries(datos).filter(([k, v]) => v !== undefined && v !== aTipo(antes)[k]),
    )
    if (!Object.keys(cambios).length) return aTipo(antes)

    await trx('tipos_comprobante')
      .where({ id })
      .update({ ...cambios, actualizado_por: actor.id, actualizado_en: trx.fn.now() })
    const despues = aTipo(await repo.tipoPorId(id, trx))
    const soloEstado = Object.keys(cambios).length === 1 && 'activo' in cambios
    await registrar(trx, {
      usuarioId: actor.id,
      accion: soloEstado
        ? cambios.activo
          ? ACCIONES.ACTIVAR
          : ACCIONES.DESACTIVAR
        : ACCIONES.EDITAR,
      entidad: 'tipos_comprobante',
      entidadId: id,
      antes: aTipo(antes),
      despues,
      ctx,
    })
    return despues
  })
}
