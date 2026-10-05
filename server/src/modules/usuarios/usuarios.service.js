import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as repo from './usuarios.repository.js'

// Sin caracteres que se confunden al dictarlos (0/O, 1/l/I)
const ALFABETO_LETRAS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const ALFABETO_NUMEROS = '23456789'

/** Clave temporal aleatoria de 10 caracteres con letras y números. */
export function generarClaveTemporal() {
  const todos = ALFABETO_LETRAS + ALFABETO_NUMEROS
  const chars = [
    ALFABETO_LETRAS[randomInt(ALFABETO_LETRAS.length)],
    ALFABETO_NUMEROS[randomInt(ALFABETO_NUMEROS.length)],
    ...Array.from({ length: 8 }, () => todos[randomInt(todos.length)]),
  ]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function aPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    ci: u.ci,
    email: u.email,
    telefono: u.telefono,
    departamento: u.departamento,
    rol: { id: u.rol_id, codigo: u.rol, nombre: u.rol_nombre, color: u.rol_color },
    activo: !!u.activo,
    debeCambiarClave: !!u.debe_cambiar_clave,
    bloqueadoHasta: u.bloqueado_hasta,
    ultimoAcceso: u.ultimo_acceso,
    creadoEn: u.creado_en,
    archivadoEn: u.archivado_en,
    archivadoPor: u.archivado_por_nombre || null,
  }
}

// Instantánea para la bitácora (sin datos sensibles)
const instantanea = (u) => ({
  nombre: u.nombre,
  apellido: u.apellido,
  ci: u.ci,
  email: u.email,
  telefono: u.telefono,
  departamento: u.departamento,
  rol: u.rol,
  activo: !!u.activo,
})

async function obtener(id, trx) {
  const u = await repo.buscarPorId(id, trx)
  if (!u) throw new AppError(404, 'NO_ENCONTRADO', 'El usuario no existe')
  return u
}

async function validarUnicos({ email, ci }, excluirId, trx) {
  if (await repo.existeCampo('email', email, excluirId, trx)) {
    throw new AppError(409, 'EMAIL_DUPLICADO', 'Ya existe un usuario con ese correo', [
      { campo: 'email', mensaje: 'Ya existe un usuario con ese correo' },
    ])
  }
  if (await repo.existeCampo('ci', ci, excluirId, trx)) {
    throw new AppError(409, 'CI_DUPLICADA', 'Ya existe un usuario con esa cédula', [
      { campo: 'ci', mensaje: 'Ya existe un usuario con esa cédula' },
    ])
  }
}

async function validarRol(rolId, trx) {
  const rol = await trx('roles').where({ id: rolId }).first()
  if (!rol) {
    throw new AppError(400, 'ROL_INEXISTENTE', 'El rol seleccionado no existe', [
      { campo: 'rolId', mensaje: 'El rol seleccionado no existe' },
    ])
  }
  return rol
}

/** Impide dejar el sistema sin ningún administrador activo. */
async function protegerUltimoAdmin(usuario, trx) {
  if (usuario.rol === 'ADMIN' && (await repo.contarAdminsActivos(usuario.id, trx)) === 0) {
    throw new AppError(
      409,
      'ULTIMO_ADMIN',
      'Debe quedar al menos un administrador activo en el sistema',
    )
  }
}

const datosDb = (d) => ({
  nombre: d.nombre,
  apellido: d.apellido,
  ci: d.ci,
  email: d.email,
  telefono: d.telefono ?? null,
  departamento: d.departamento ?? null,
  rol_id: d.rolId,
})

export async function listar(filtros) {
  const [filas, resumen] = await Promise.all([repo.listar(filtros), repo.resumen()])
  return { data: filas.map(aPublico), meta: { resumen } }
}

export async function detalle(id) {
  return aPublico(await obtener(id))
}

export const departamentos = () => repo.departamentos()

export async function crear(datos, actor, ctx) {
  const clave = generarClaveTemporal()
  const hash = await bcrypt.hash(clave, 12)
  const usuario = await db.transaction(async (trx) => {
    await validarRol(datos.rolId, trx)
    await validarUnicos(datos, null, trx)
    const [id] = await repo.crear(
      { ...datosDb(datos), password_hash: hash, debe_cambiar_clave: true },
      trx,
    )
    const creado = await obtener(id, trx)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: 'usuarios',
      entidadId: id,
      despues: instantanea(creado),
      ctx,
    })
    return creado
  })
  return { usuario: aPublico(usuario), claveTemporal: clave }
}

export async function editar(id, datos, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await obtener(id, trx)
    const rol = await validarRol(datos.rolId, trx)
    await validarUnicos(datos, id, trx)
    if (antes.rol === 'ADMIN' && rol.codigo !== 'ADMIN') await protegerUltimoAdmin(antes, trx)
    if (id === actor.id && rol.codigo !== antes.rol) {
      throw new AppError(409, 'CAMBIO_ROL_PROPIO', 'No puede cambiar su propio rol')
    }

    await repo.actualizar(id, datosDb(datos), trx)
    const despues = await obtener(id, trx)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.EDITAR,
      entidad: 'usuarios',
      entidadId: id,
      antes: instantanea(antes),
      despues: instantanea(despues),
      ctx,
    })
    return aPublico(despues)
  })
}

export async function cambiarEstado(id, activo, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await obtener(id, trx)
    if (!activo) {
      if (id === actor.id) {
        throw new AppError(409, 'AUTO_DESACTIVAR', 'No puede deshabilitar su propio usuario')
      }
      await protegerUltimoAdmin(antes, trx)
    }
    // Habilitar también lo saca del archivo
    const cambios = activo
      ? {
          activo: true,
          archivado_en: null,
          archivado_por: null,
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        }
      : { activo: false }
    await repo.actualizar(id, cambios, trx)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: activo ? ACCIONES.ACTIVAR : ACCIONES.DESACTIVAR,
      entidad: 'usuarios',
      entidadId: id,
      antes: { activo: !!antes.activo, archivado: !!antes.archivado_en },
      despues: { activo },
      ctx,
    })
    return aPublico(await obtener(id, trx))
  })
}

export async function archivar(id, archivar, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await obtener(id, trx)
    if (archivar && antes.activo) {
      throw new AppError(409, 'USUARIO_ACTIVO', 'Deshabilite el usuario antes de archivarlo')
    }
    await repo.actualizar(
      id,
      archivar
        ? { archivado_en: trx.raw('UTC_TIMESTAMP()'), archivado_por: actor.id }
        : { archivado_en: null, archivado_por: null },
      trx,
    )
    await registrar(trx, {
      usuarioId: actor.id,
      accion: archivar ? ACCIONES.ARCHIVAR : ACCIONES.DESARCHIVAR,
      entidad: 'usuarios',
      entidadId: id,
      ctx,
    })
    return aPublico(await obtener(id, trx))
  })
}

export async function resetearClave(id, actor, ctx) {
  const clave = generarClaveTemporal()
  const hash = await bcrypt.hash(clave, 12)
  await db.transaction(async (trx) => {
    await obtener(id, trx)
    await repo.actualizar(
      id,
      {
        password_hash: hash,
        debe_cambiar_clave: true,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
      },
      trx,
    )
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.RESETEAR_CLAVE,
      entidad: 'usuarios',
      entidadId: id,
      ctx,
    })
  })
  return { claveTemporal: clave }
}
