import { Router } from 'express'
import { auth, requireRole } from '../../middlewares/auth.js'
import { getActual, postActualizar } from './tasas.controller.js'

export const tasasRoutes = Router()

tasasRoutes.use(auth)
tasasRoutes.get('/actual', getActual)
tasasRoutes.post('/actualizar', requireRole('ADMIN', 'CONTADOR'), postActualizar)
