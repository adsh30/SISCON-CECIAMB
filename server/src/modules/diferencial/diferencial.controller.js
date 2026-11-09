import { requestContext } from '../../middlewares/auth.js'
import { AppError } from '../../middlewares/errorHandler.js'
import * as service from './diferencial.service.js'

export async function getConfiguracion(req, res) {
  res.json({ data: await service.obtenerConfiguracion() })
}

export async function putConfiguracion(req, res) {
  res.json({
    data: await service.guardarConfiguracion(req.body, req.user, requestContext(req)),
  })
}

export async function getVistaPrevia(req, res) {
  const id = Number(req.params.periodoId)
  if (!Number.isInteger(id) || id < 1)
    throw new AppError(404, 'NO_ENCONTRADO', 'El período no existe')
  res.json({ data: await service.vistaPrevia(id) })
}
