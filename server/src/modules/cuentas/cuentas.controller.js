import { requestContext } from '../../middlewares/auth.js'
import { AppError } from '../../middlewares/errorHandler.js'
import * as service from './cuentas.service.js'

const idDe = (req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) throw new AppError(404, 'NO_ENCONTRADO', 'No existe')
  return id
}

export async function getCuentas(req, res) {
  res.json({ data: await service.listar(req.consulta ?? req.query) })
}

export async function getArbol(req, res) {
  res.json({ data: await service.arbol(req.consulta ?? req.query) })
}

export async function getCuenta(req, res) {
  res.json({ data: await service.obtener(idDe(req)) })
}

export async function postCuenta(req, res) {
  res.status(201).json({ data: await service.crear(req.body, req.user, requestContext(req)) })
}

export async function putCuenta(req, res) {
  res.json({
    data: await service.actualizar(idDe(req), req.body, req.user, requestContext(req)),
  })
}

export async function deleteCuenta(req, res) {
  await service.eliminar(idDe(req), req.user, requestContext(req))
  res.status(204).end()
}
