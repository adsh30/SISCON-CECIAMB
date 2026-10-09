import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import {
  deleteCentroCosto,
  getCentroCosto,
  getCentrosCosto,
  postCentroCosto,
  putCentroCosto,
} from './centros-costo.controller.js'
import {
  actualizarCentroCostoSchema,
  consultaCentrosCostoSchema,
  crearCentroCostoSchema,
} from './centros-costo.schema.js'

export const centrosCostoRoutes = Router()

centrosCostoRoutes.use(auth, claveVigente)

centrosCostoRoutes.get(
  '/',
  requirePermiso('plan_cuentas', 'lectura'),
  validate(consultaCentrosCostoSchema, 'query'),
  getCentrosCosto,
)

centrosCostoRoutes.get('/:id', requirePermiso('plan_cuentas', 'lectura'), getCentroCosto)

centrosCostoRoutes.post(
  '/',
  requirePermiso('plan_cuentas', 'escritura'),
  validate(crearCentroCostoSchema),
  postCentroCosto,
)

centrosCostoRoutes.put(
  '/:id',
  requirePermiso('plan_cuentas', 'escritura'),
  validate(actualizarCentroCostoSchema),
  putCentroCosto,
)

centrosCostoRoutes.delete('/:id', requirePermiso('plan_cuentas', 'full'), deleteCentroCosto)
