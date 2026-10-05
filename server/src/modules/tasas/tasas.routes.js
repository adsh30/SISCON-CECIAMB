import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { getActual, postActualizar } from './tasas.controller.js'

export const tasasRoutes = Router()

tasasRoutes.use(auth, claveVigente)
tasasRoutes.get('/actual', getActual)
tasasRoutes.post('/actualizar', requirePermiso('tasas', 'escritura'), postActualizar)
