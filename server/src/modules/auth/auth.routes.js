import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env.js'
import { auth, claveVigente } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { getMe, postCambiarClave, postLogin, postLogout, putPerfil } from './auth.controller.js'
import { cambiarClaveSchema, loginSchema, perfilSchema } from './auth.schema.js'

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.nodeEnv === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'DEMASIADAS_SOLICITUDES', message: 'Demasiados intentos. Espere unos minutos' },
  },
})

export const authRoutes = Router()

authRoutes.post('/login', loginLimiter, validate(loginSchema), postLogin)
authRoutes.post('/logout', auth, postLogout)
authRoutes.get('/me', auth, getMe)
authRoutes.post(
  '/cambiar-clave',
  loginLimiter,
  auth,
  validate(cambiarClaveSchema),
  postCambiarClave,
)
authRoutes.put('/perfil', auth, claveVigente, validate(perfilSchema), putPerfil)
