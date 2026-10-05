import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'

export const AUTH_COOKIE = 'siscon_sesion'

export function auth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) throw new AppError(401, 'NO_AUTENTICADO', 'Inicie sesión para continuar')
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret)
    req.user = { id: Number(payload.sub), rol: payload.rol, nombre: payload.nombre }
  } catch {
    throw new AppError(401, 'SESION_EXPIRADA', 'Su sesión expiró. Inicie sesión de nuevo')
  }
  next()
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      throw new AppError(403, 'SIN_PERMISO', 'Su rol no tiene permiso para esta acción')
    }
    next()
  }

export const requestContext = (req) => ({ ip: req.ip, agente: req.get('user-agent') })
