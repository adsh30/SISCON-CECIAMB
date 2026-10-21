import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import * as c from './comprobantes.controller.js'
import {
  actualizarTipoSchema,
  adjuntoSchema,
  anularSchema,
  comprobanteSchema,
  copiaSchema,
  crearTipoSchema,
  filtrosSchema,
} from './comprobantes.schema.js'

export const comprobantesRoutes = Router()

const ver = requirePermiso('comprobantes', 'lectura')
const modificar = requirePermiso('comprobantes', 'escritura')
// Aprobar, anular y administrar los tipos: Contador general y Administrador (RF-05.4)
const total = requirePermiso('comprobantes', 'full')

comprobantesRoutes.use(auth, claveVigente)

comprobantesRoutes.get('/tipos', ver, c.listarTipos)
comprobantesRoutes.post('/tipos', total, validate(crearTipoSchema), c.crearTipo)
comprobantesRoutes.put('/tipos/:id', total, validate(actualizarTipoSchema), c.actualizarTipo)

comprobantesRoutes.get('/', ver, validate(filtrosSchema, 'query'), c.listar)
comprobantesRoutes.post('/', modificar, validate(comprobanteSchema), c.crear)
comprobantesRoutes.get('/:id', ver, c.detalle)
comprobantesRoutes.put('/:id', modificar, validate(comprobanteSchema), c.actualizar)
comprobantesRoutes.delete('/:id', modificar, c.eliminar)
comprobantesRoutes.post('/:id/aprobar', total, c.aprobar)
comprobantesRoutes.post('/:id/anular', total, validate(anularSchema), c.anular)
comprobantesRoutes.post('/:id/duplicar', modificar, validate(copiaSchema), c.duplicar)
comprobantesRoutes.post('/:id/reversar', modificar, validate(copiaSchema), c.reversar)

comprobantesRoutes.get('/:id/adjuntos', ver, c.listarAdjuntos)
comprobantesRoutes.post('/:id/adjuntos', modificar, validate(adjuntoSchema), c.subirAdjunto)
comprobantesRoutes.get('/:id/adjuntos/:adjuntoId', ver, c.descargarAdjunto)
comprobantesRoutes.delete('/:id/adjuntos/:adjuntoId', modificar, c.eliminarAdjunto)
