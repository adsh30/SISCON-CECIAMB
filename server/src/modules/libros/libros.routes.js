import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import * as c from './libros.controller.js'
import { diarioSchema, mayorSchema } from './libros.schema.js'

export const librosRoutes = Router()

// Consultar y exportar los libros: todo rol con lectura (el Auditor incluido, RF-06.4)
librosRoutes.use(auth, claveVigente, requirePermiso('libros', 'lectura'))

librosRoutes.get('/diario', validate(diarioSchema, 'query'), c.diario)
librosRoutes.get('/diario/excel', validate(diarioSchema, 'query'), c.diarioXlsx)
librosRoutes.get('/mayor', validate(mayorSchema, 'query'), c.mayor)
librosRoutes.get('/mayor/excel', validate(mayorSchema, 'query'), c.mayorXlsx)
