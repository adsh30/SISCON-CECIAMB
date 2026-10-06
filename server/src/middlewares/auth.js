import jwt from 'jsonwebtoken'
import { db } from '../config/db.js'
import { env } from '../config/env.js'
import { puede } from '../modules/roles/permisos.catalogo.js'
import { permisosDeRol } from '../modules/roles/permisos.repository.js'
import { AppError } from './errorHandler.js'

export const AUTH_COOKIE = 'siscon_sesion'

const noAutenticado = () => new AppError(401, 'NO_AUTENTICADO', 'Inicie sesión para continuar')

/**
 * Verifica la sesión y carga el usuario desde la base de datos en cada petición,
 * para que un cambio de rol o una desactivación se aplique de inmediato.
 */
export async function auth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) throw noAutenticado()

  let payload
  try {
    payload = jwt.verify(token, env.auth.jwtSecret)
  } catch {
    throw new AppError(401, 'SESION_EXPIRADA', 'Su sesión expiró. Inicie sesión de nuevo')
  }

  const usuario = await db('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select(
      'u.id',
      'u.nombre',
      'u.activo',
      'u.debe_cambiar_clave',
      'u.archivado_en',
      'r.id as rol_id',
      'r.codigo as rol',
    )
    .where('u.id', Number(payload.sub))
    .first()

  if (!usuario || !usuario.activo || usuario.archivado_en) {
    res.clearCookie(AUTH_COOKIE, { path: '/' })
    throw new AppError(
      401,
      'USUARIO_INACTIVO',
      'Su usuario está desactivado. Contacte al administrador',
    )
  }

  req.user = {
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    rolId: usuario.rol_id,
    debeCambiarClave: !!usuario.debe_cambiar_clave,
  }
  next()
}

/** Bloquea el resto del sistema mientras el usuario tenga una clave temporal. */
export function claveVigente(req, res, next) {
  if (req.user?.debeCambiarClave) {
    throw new AppError(
      403,
      'DEBE_CAMBIAR_CLAVE',
      'Debe cambiar su clave temporal antes de continuar',
    )
  }
  next()
}

/** Exige permiso sobre un módulo (`lectura`, `escritura` o `full`). ADMIN siempre pasa. */
export const requirePermiso =
  (modulo, nivel = 'lectura') =>
  async (req, res, next) => {
    if (!req.user) throw noAutenticado()
    req.permisos ??= await permisosDeRol(req.user.rolId)
    if (!puede(req.user.rol, req.permisos, modulo, nivel)) {
      throw new AppError(403, 'SIN_PERMISO', 'Su rol no tiene permiso para esta acción')
    }
    next()
  }

export const requestContext = (req) => ({ ip: req.ip, agente: req.get('user-agent') })
