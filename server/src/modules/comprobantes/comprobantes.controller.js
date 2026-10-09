import { requestContext } from '../../middlewares/auth.js'
import { AppError } from '../../middlewares/errorHandler.js'
import * as service from './comprobantes.service.js'

const idDe = (req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) throw new AppError(404, 'NO_ENCONTRADO', 'No existe')
  return id
}

export const listar = async (req, res) => res.json(await service.listar(req.consulta))

export const detalle = async (req, res) => res.json({ data: await service.detalle(idDe(req)) })

export async function crear(req, res) {
  res.status(201).json({ data: await service.crear(req.body, req.user, requestContext(req)) })
}

export async function actualizar(req, res) {
  res.json({
    data: await service.actualizar(idDe(req), req.body, req.user, requestContext(req)),
  })
}

export async function eliminar(req, res) {
  await service.eliminar(idDe(req), req.user, requestContext(req))
  res.status(204).end()
}

export async function aprobar(req, res) {
  res.json({ data: await service.aprobar(idDe(req), req.user, requestContext(req)) })
}

export async function anular(req, res) {
  res.json({
    data: await service.anular(idDe(req), req.body.motivo, req.user, requestContext(req)),
  })
}

export async function duplicar(req, res) {
  res
    .status(201)
    .json({ data: await service.duplicar(idDe(req), req.body, req.user, requestContext(req)) })
}

export async function reversar(req, res) {
  res
    .status(201)
    .json({ data: await service.reversar(idDe(req), req.body, req.user, requestContext(req)) })
}

export const listarTipos = async (req, res) => res.json({ data: await service.listarTipos() })

export async function crearTipo(req, res) {
  res.status(201).json({ data: await service.crearTipo(req.body, req.user, requestContext(req)) })
}

export async function actualizarTipo(req, res) {
  res.json({
    data: await service.actualizarTipo(idDe(req), req.body, req.user, requestContext(req)),
  })
}
