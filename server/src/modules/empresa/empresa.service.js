import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as repo from './empresa.repository.js'
import { LOGO_MAX_BYTES } from './empresa.schema.js'

const aPublico = (e) => ({
  razonSocial: e.razon_social,
  nombreComercial: e.nombre_comercial,
  rif: e.rif,
  direccion: e.direccion,
  ciudad: e.ciudad,
  estado: e.estado,
  telefono: e.telefono,
  email: e.email,
  sitioWeb: e.sitio_web,
  monedaBase: e.moneda_base,
  tieneLogo: !!e.logo_tipo,
  actualizadoEn: e.actualizado_en,
  actualizadoPor: e.actualizado_por_nombre
    ? [e.actualizado_por_nombre, e.actualizado_por_apellido].filter(Boolean).join(' ')
    : null,
  // Los libros y reportes necesitan al menos razón social y RIF
  completa: !!(e.razon_social && e.rif),
})

const aColumnas = (d) => ({
  razon_social: d.razonSocial,
  nombre_comercial: d.nombreComercial ?? null,
  rif: d.rif,
  direccion: d.direccion ?? null,
  ciudad: d.ciudad ?? null,
  estado: d.estado ?? null,
  telefono: d.telefono ?? null,
  email: d.email ?? null,
  sitio_web: d.sitioWeb ?? null,
})

// Para la bitácora: solo los datos editables, sin el logo
const instantanea = (e) => {
  const {
    tieneLogo: _l,
    actualizadoEn: _e,
    actualizadoPor: _p,
    completa: _c,
    monedaBase: _m,
    ...resto
  } = aPublico(e)
  return resto
}

export async function obtener() {
  return aPublico(await repo.obtener())
}

export async function actualizar(datos, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await repo.obtener(trx)
    await repo.actualizar(aColumnas(datos), actor.id, trx)
    const despues = await repo.obtener(trx)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.EDITAR,
      entidad: 'empresa',
      entidadId: 1,
      antes: instantanea(antes),
      despues: instantanea(despues),
      ctx,
    })
    return aPublico(despues)
  })
}

/** Identifica el formato por sus primeros bytes (no se confía en la extensión ni en el MIME) */
function tipoDeImagen(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

export async function guardarLogo(contenido, actor, ctx) {
  const buffer = Buffer.from(contenido, 'base64')
  if (!buffer.length) throw new AppError(400, 'LOGO_INVALIDO', 'La imagen está vacía')
  if (buffer.length > LOGO_MAX_BYTES) {
    throw new AppError(400, 'LOGO_GRANDE', 'El logo no puede pesar más de 500 KB')
  }
  const tipo = tipoDeImagen(buffer)
  if (!tipo) throw new AppError(400, 'LOGO_INVALIDO', 'Use una imagen PNG, JPG o WEBP')

  return db.transaction(async (trx) => {
    const antes = await repo.obtener(trx)
    await trx('empresa')
      .where({ id: 1 })
      .update({
        logo: buffer,
        logo_tipo: tipo,
        actualizado_por: actor.id,
        actualizado_en: trx.fn.now(),
      })
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.ACTUALIZAR,
      entidad: 'empresa',
      entidadId: 1,
      antes: { logo: antes.logo_tipo ? 'Sí' : 'No' },
      despues: {
        logo: `Nuevo (${tipo.replace('image/', '').toUpperCase()}, ${Math.ceil(buffer.length / 1024)} KB)`,
      },
      ctx,
    })
    return aPublico(await repo.obtener(trx))
  })
}

export async function quitarLogo(actor, ctx) {
  return db.transaction(async (trx) => {
    await trx('empresa')
      .where({ id: 1 })
      .update({
        logo: null,
        logo_tipo: null,
        actualizado_por: actor.id,
        actualizado_en: trx.fn.now(),
      })
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.ELIMINAR,
      entidad: 'empresa',
      entidadId: 1,
      antes: { logo: 'Sí' },
      despues: { logo: 'No' },
      ctx,
    })
    return aPublico(await repo.obtener(trx))
  })
}

export async function logo() {
  const fila = await repo.logo()
  if (!fila?.logo) throw new AppError(404, 'SIN_LOGO', 'La empresa no tiene logo cargado')
  return { buffer: fila.logo, tipo: fila.logo_tipo }
}
