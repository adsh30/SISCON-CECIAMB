import { AppError } from '../../middlewares/errorHandler.js'
import { requestContext } from '../../middlewares/auth.js'
import { filtrosSchema } from './usuarios.schema.js'
import * as service from './usuarios.service.js'

function idParam(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, 'ID_INVALIDO', 'Identificador inválido')
  return id
}

export async function getListado(req, res) {
  const filtros = filtrosSchema.safeParse(req.query)
  if (!filtros.success) throw new AppError(400, 'VALIDACION', 'Filtros inválidos')
  res.json(await service.listar(filtros.data))
}

export async function getDepartamentos(req, res) {
  res.json({ data: await service.departamentos() })
}

export async function getDetalle(req, res) {
  res.json({ data: await service.detalle(idParam(req)) })
}

export async function postCrear(req, res) {
  const data = await service.crear(req.body, req.user, requestContext(req))
  res.status(201).json({ data })
}

export async function putEditar(req, res) {
  res.json({ data: await service.editar(idParam(req), req.body, req.user, requestContext(req)) })
}

export async function patchEstado(req, res) {
  const data = await service.cambiarEstado(
    idParam(req),
    req.body.activo,
    req.user,
    requestContext(req),
  )
  res.json({ data })
}

export async function postArchivar(req, res) {
  res.json({ data: await service.archivar(idParam(req), true, req.user, requestContext(req)) })
}

export async function postDesarchivar(req, res) {
  res.json({ data: await service.archivar(idParam(req), false, req.user, requestContext(req)) })
}

export async function postResetearClave(req, res) {
  res.json({ data: await service.resetearClave(idParam(req), req.user, requestContext(req)) })
}
