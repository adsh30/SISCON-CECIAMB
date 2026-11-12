import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import * as c from './conciliaciones.controller.js'
import {
  anularConciliacionSchema,
  crearConciliacionSchema,
  desemparejarSchema,
  emparejarSchema,
  finalizarConciliacionSchema,
  importarMovimientosBancoSchema,
} from './conciliaciones.schema.js'

export const conciliacionesRoutes = Router()

conciliacionesRoutes.use(auth, claveVigente)

// Lectura de conciliaciones
conciliacionesRoutes.get('/', requirePermiso('libros', 'lectura'), c.listar)
conciliacionesRoutes.get('/:id', requirePermiso('libros', 'lectura'), c.obtener)

// Operaciones de conciliación (escritura)
conciliacionesRoutes.post(
  '/',
  requirePermiso('libros', 'escritura'),
  validate(crearConciliacionSchema),
  c.iniciar,
)

conciliacionesRoutes.post(
  '/:id/importar-banco',
  requirePermiso('libros', 'escritura'),
  validate(importarMovimientosBancoSchema),
  c.importarBanco,
)

conciliacionesRoutes.post(
  '/:id/emparejar',
  requirePermiso('libros', 'escritura'),
  validate(emparejarSchema),
  c.emparejar,
)

conciliacionesRoutes.post(
  '/:id/desemparejar',
  requirePermiso('libros', 'escritura'),
  validate(desemparejarSchema),
  c.desemparejar,
)

conciliacionesRoutes.post(
  '/:id/finalizar',
  requirePermiso('libros', 'escritura'),
  validate(finalizarConciliacionSchema),
  c.finalizar,
)

conciliacionesRoutes.post(
  '/:id/anular',
  requirePermiso('libros', 'escritura'),
  validate(anularConciliacionSchema),
  c.anular,
)
