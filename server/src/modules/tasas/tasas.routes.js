import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { getActual, getHistorial, postActualizar } from './tasas.controller.js'
import { rangoFechasSchema } from './tasas.schema.js'

export const tasasRoutes = Router()

tasasRoutes.use(auth, claveVigente)
tasasRoutes.get('/actual', getActual)
tasasRoutes.get(
  '/historial',
  requirePermiso('tasas', 'lectura'),
  validate(rangoFechasSchema, 'query'),
  getHistorial,
)
tasasRoutes.post('/actualizar', requirePermiso('tasas', 'escritura'), postActualizar)
