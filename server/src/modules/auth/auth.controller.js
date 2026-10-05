import { env } from '../../config/env.js'
import { AUTH_COOKIE, requestContext } from '../../middlewares/auth.js'
import * as service from './auth.service.js'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  path: '/',
}

export async function postLogin(req, res) {
  const { token, usuario } = await service.login(req.body, requestContext(req))
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: env.auth.cookieMaxAgeMs })
  res.json({ data: usuario })
}

export async function postLogout(req, res) {
  await service.logout(req.user, requestContext(req))
  res.clearCookie(AUTH_COOKIE, cookieOptions)
  res.status(204).end()
}

export async function getMe(req, res) {
  res.json({ data: await service.perfil(req.user.id) })
}

export async function postCambiarClave(req, res) {
  res.json({ data: await service.cambiarClave(req.user.id, req.body, requestContext(req)) })
}

export async function putPerfil(req, res) {
  res.json({ data: await service.actualizarPerfil(req.user.id, req.body, requestContext(req)) })
}
