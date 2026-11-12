import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { getConfiguracion, getVistaPrevia, putConfiguracion } from './diferencial.controller.js'
import { configuracionSchema } from './diferencial.schema.js'

export const diferencialRoutes = Router()

diferencialRoutes.use(auth, claveVigente)
// Las cuentas de ganancia y pérdida cambiaria son parte de los datos de la empresa
diferencialRoutes.get('/configuracion', requirePermiso('empresa', 'lectura'), getConfiguracion)
diferencialRoutes.put(
  '/configuracion',
  requirePermiso('empresa', 'escritura'),
  validate(configuracionSchema),
  putConfiguracion,
)
// Lo que registrará el cierre del período
diferencialRoutes.get('/periodos/:periodoId', requirePermiso('periodos', 'lectura'), getVistaPrevia)
