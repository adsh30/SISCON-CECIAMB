import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env.js'
import { auth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { getMe, postLogin, postLogout } from './auth.controller.js'
import { loginSchema } from './auth.schema.js'

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
