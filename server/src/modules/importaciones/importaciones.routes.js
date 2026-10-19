import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import * as c from './importaciones.controller.js'
import { importarSchema, previsualizarSchema } from './importaciones.schema.js'

export const importacionesRoutes = Router()

// Importar crea borradores de comprobantes: los mismos permisos que registrar a mano (RF-05.10)
const modificar = requirePermiso('comprobantes', 'escritura')

importacionesRoutes.use(auth, claveVigente)

importacionesRoutes.post('/previsualizar', modificar, validate(previsualizarSchema), c.previsualizar)
importacionesRoutes.post('/borrador', modificar, validate(importarSchema), c.crearBorrador)
