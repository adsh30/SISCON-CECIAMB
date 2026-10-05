import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../../config/db.js'
import { env } from '../../config/env.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import { permisosDeRol } from '../roles/permisos.repository.js'
import * as repo from './auth.repository.js'

export const MAX_INTENTOS = 5
export const MINUTOS_BLOQUEO = 15

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe
const HASH_FICTICIO = bcrypt.hashSync('siscon-no-existe', 12)

const credencialesInvalidas = () =>
  new AppError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos')

const usuarioBloqueado = () =>
  new AppError(
    423,
    'USUARIO_BLOQUEADO',
    `Demasiados intentos fallidos. Su usuario queda bloqueado ${MINUTOS_BLOQUEO} minutos`,
  )

// Las fechas llegan como 'YYYY-MM-DD HH:mm:ss' en UTC (dateStrings + timezone Z)
const fechaUtc = (s) => new Date(s.replace(' ', 'T') + 'Z')

export function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    telefono: u.telefono,
    departamento: u.departamento,
    ultimoAcceso: u.ultimo_acceso,
    rol: u.rol,
    rolNombre: u.rol_nombre,
    rolColor: u.rol_color,
    debeCambiarClave: !!u.debe_cambiar_clave,
  }
}

async function conPermisos(u, trx) {
  return { ...usuarioPublico(u), permisos: await permisosDeRol(u.rol_id, trx) }
}

export async function login({ email, password }, ctx) {
  const usuario = await repo.buscarPorEmail(email)
  const ok = await bcrypt.compare(password, usuario?.password_hash ?? HASH_FICTICIO)

  if (!usuario) {
    await registrar(null, {
      accion: ACCIONES.LOGIN_FALLIDO,
      entidad: 'usuarios',
      despues: { email },
      ctx,
    })
    throw credencialesInvalidas()
  }
  if (usuario.bloqueado_hasta && fechaUtc(usuario.bloqueado_hasta) > new Date()) {
    throw usuarioBloqueado()
  }

  if (!ok) {
    const intentos = usuario.intentos_fallidos + 1
    const bloquear = intentos >= MAX_INTENTOS
    await db.transaction(async (trx) => {
      await repo.actualizar(
        usuario.id,
        {
          intentos_fallidos: bloquear ? 0 : intentos,
          bloqueado_hasta: bloquear
            ? trx.raw('UTC_TIMESTAMP() + INTERVAL ? MINUTE', [MINUTOS_BLOQUEO])
            : null,
        },
        trx,
      )
      await registrar(trx, {
        usuarioId: usuario.id,
        accion: bloquear ? ACCIONES.LOGIN_BLOQUEADO : ACCIONES.LOGIN_FALLIDO,
        entidad: 'usuarios',
        entidadId: usuario.id,
        despues: { intentos },
        ctx,
      })
    })
    throw bloquear ? usuarioBloqueado() : credencialesInvalidas()
  }

  // El estado se revela solo con la contraseña correcta, para no exponer qué cuentas existen
  if (!usuario.activo || usuario.archivado_en) {
    throw new AppError(
      403,
      'USUARIO_INACTIVO',
      'Su usuario está desactivado. Contacte al administrador',
    )
  }

  await db.transaction(async (trx) => {
    await repo.actualizar(
      usuario.id,
      { intentos_fallidos: 0, bloqueado_hasta: null, ultimo_acceso: trx.raw('UTC_TIMESTAMP()') },
      trx,
    )
    await registrar(trx, {
      usuarioId: usuario.id,
      accion: ACCIONES.LOGIN,
      entidad: 'usuarios',
      entidadId: usuario.id,
      ctx,
    })
  })

  const token = jwt.sign({ rol: usuario.rol, nombre: usuario.nombre }, env.auth.jwtSecret, {
    subject: String(usuario.id),
    expiresIn: env.auth.jwtExpiresIn,
  })
  return { token, usuario: await conPermisos(usuario) }
}

export async function logout(user, ctx) {
  await registrar(null, {
    usuarioId: user.id,
    accion: ACCIONES.LOGOUT,
    entidad: 'usuarios',
    entidadId: user.id,
    ctx,
  })
}

export async function perfil(id) {
  const usuario = await repo.buscarPorId(id)
  if (!usuario || !usuario.activo || usuario.archivado_en) {
    throw new AppError(401, 'NO_AUTENTICADO', 'Inicie sesión para continuar')
  }
  return conPermisos(usuario)
}

export async function cambiarClave(userId, { actual, nueva }, ctx) {
  const usuario = await repo.buscarPorId(userId, db, { conHash: true })
  if (!(await bcrypt.compare(actual, usuario.password_hash))) {
    throw new AppError(400, 'CLAVE_ACTUAL_INCORRECTA', 'La clave actual no es correcta', [
      { campo: 'actual', mensaje: 'La clave actual no es correcta' },
    ])
  }
  if (await bcrypt.compare(nueva, usuario.password_hash)) {
    throw new AppError(400, 'CLAVE_REPETIDA', 'La clave nueva debe ser distinta a la actual', [
      { campo: 'nueva', mensaje: 'La clave nueva debe ser distinta a la actual' },
    ])
  }
  await db.transaction(async (trx) => {
    await repo.actualizar(
      userId,
      { password_hash: await bcrypt.hash(nueva, 12), debe_cambiar_clave: false },
      trx,
    )
    await registrar(trx, {
      usuarioId: userId,
      accion: ACCIONES.CAMBIAR_CLAVE,
      entidad: 'usuarios',
      entidadId: userId,
      ctx,
    })
  })
  return perfil(userId)
}

export async function actualizarPerfil(userId, datos, ctx) {
  await db.transaction(async (trx) => {
    const antes = await trx('usuarios')
      .select('nombre', 'apellido', 'telefono', 'departamento')
      .where({ id: userId })
      .first()
    await repo.actualizar(userId, datos, trx)
    await registrar(trx, {
      usuarioId: userId,
      accion: ACCIONES.EDITAR,
      entidad: 'usuarios',
      entidadId: userId,
      antes,
      despues: datos,
      ctx,
    })
  })
  return perfil(userId)
}
