import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { deleteLogo, getEmpresa, getLogo, putEmpresa, putLogo } from './empresa.controller.js'
import { empresaSchema, logoSchema } from './empresa.schema.js'

export const empresaRoutes = Router()

empresaRoutes.use(auth, claveVigente)
// El logo lo usan pantallas y reportes de cualquier módulo
empresaRoutes.get('/logo', getLogo)
empresaRoutes.get('/', requirePermiso('empresa', 'lectura'), getEmpresa)
empresaRoutes.put('/', requirePermiso('empresa', 'escritura'), validate(empresaSchema), putEmpresa)
empresaRoutes.put('/logo', requirePermiso('empresa', 'escritura'), validate(logoSchema), putLogo)
empresaRoutes.delete('/logo', requirePermiso('empresa', 'escritura'), deleteLogo)
