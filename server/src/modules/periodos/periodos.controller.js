import { requestContext } from '../../middlewares/auth.js'
import { AppError } from '../../middlewares/errorHandler.js'
import * as service from './periodos.service.js'

const idDe = (req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) throw new AppError(404, 'NO_ENCONTRADO', 'No existe')
  return id
}

export async function getListado(req, res) {
  res.json({ data: await service.listar() })
}

export async function getActual(req, res) {
  res.json({ data: await service.actual() })
}

export async function postEjercicio(req, res) {
  res
    .status(201)
    .json({ data: await service.crearEjercicio(req.body, req.user, requestContext(req)) })
}

export async function deleteEjercicio(req, res) {
  await service.eliminarEjercicio(idDe(req), req.user, requestContext(req))
  res.status(204).end()
}

export async function postCerrar(req, res) {
  res.json({ data: await service.cerrar(idDe(req), req.user, requestContext(req)) })
}

export async function postReabrir(req, res) {
  res.json({
    data: await service.reabrir(idDe(req), req.body.motivo, req.user, requestContext(req)),
  })
}
