import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { rangoFechasSchema } from '../tasas/tasas.schema.js'
import { getActividad, getResumen } from './dashboard.controller.js'

export const dashboardRoutes = Router()

dashboardRoutes.use(auth, claveVigente)
dashboardRoutes.get('/', requirePermiso('inicio', 'lectura'), getResumen)
dashboardRoutes.get(
  '/actividad',
  requirePermiso('bitacora', 'lectura'),
  validate(rangoFechasSchema, 'query'),
  getActividad,
)
