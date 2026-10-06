import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { getDetalle, getExportar, getListado, getOpciones } from './bitacora.controller.js'
import { filtrosSchema } from './bitacora.schema.js'

// Solo lectura: la bitácora no tiene rutas para modificar ni borrar
export const bitacoraRoutes = Router()

bitacoraRoutes.use(auth, claveVigente, requirePermiso('bitacora', 'lectura'))
bitacoraRoutes.get('/', validate(filtrosSchema, 'query'), getListado)
bitacoraRoutes.get('/opciones', getOpciones)
bitacoraRoutes.get('/exportar', validate(filtrosSchema, 'query'), getExportar)
bitacoraRoutes.get('/:id', getDetalle)
