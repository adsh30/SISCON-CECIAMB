import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import {
  deleteCuenta,
  getArbol,
  getCuenta,
  getCuentas,
  postCuenta,
  putCuenta,
} from './cuentas.controller.js'
import {
  actualizarCuentaSchema,
  consultaCuentasSchema,
  crearCuentaSchema,
} from './cuentas.schema.js'

export const cuentasRoutes = Router()

cuentasRoutes.use(auth, claveVigente)

cuentasRoutes.get(
  '/',
  requirePermiso('plan_cuentas', 'lectura'),
  validate(consultaCuentasSchema, 'query'),
  getCuentas,
)

cuentasRoutes.get(
  '/arbol',
  requirePermiso('plan_cuentas', 'lectura'),
  validate(consultaCuentasSchema, 'query'),
  getArbol,
)

cuentasRoutes.get('/:id', requirePermiso('plan_cuentas', 'lectura'), getCuenta)

cuentasRoutes.post(
  '/',
  requirePermiso('plan_cuentas', 'escritura'),
  validate(crearCuentaSchema),
  postCuenta,
)

cuentasRoutes.put(
  '/:id',
  requirePermiso('plan_cuentas', 'escritura'),
  validate(actualizarCuentaSchema),
  putCuenta,
)

cuentasRoutes.delete('/:id', requirePermiso('plan_cuentas', 'full'), deleteCuenta)
