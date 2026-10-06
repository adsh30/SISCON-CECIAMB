import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import {
  deleteEjercicio,
  getActual,
  getListado,
  postCerrar,
  postEjercicio,
  postReabrir,
} from './periodos.controller.js'
import { ejercicioSchema, reabrirSchema } from './periodos.schema.js'

export const periodosRoutes = Router()

periodosRoutes.use(auth, claveVigente)
periodosRoutes.get('/', requirePermiso('periodos', 'lectura'), getListado)
periodosRoutes.get('/actual', requirePermiso('periodos', 'lectura'), getActual)
periodosRoutes.post(
  '/ejercicios',
  requirePermiso('periodos', 'escritura'),
  validate(ejercicioSchema),
  postEjercicio,
)
periodosRoutes.delete('/ejercicios/:id', requirePermiso('periodos', 'full'), deleteEjercicio)
periodosRoutes.post('/:id/cerrar', requirePermiso('periodos', 'escritura'), postCerrar)
// RF-08.2: reabrir exige control total (por defecto, el Administrador) y un motivo
periodosRoutes.post(
  '/:id/reabrir',
  requirePermiso('periodos', 'full'),
  validate(reabrirSchema),
  postReabrir,
)
