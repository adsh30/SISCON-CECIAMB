import { requestContext } from '../../middlewares/auth.js'
import * as service from './importaciones.service.js'

export async function previsualizar(req, res) {
  res.json({ data: await service.previsualizar(req.body.csv) })
}

export async function crearBorrador(req, res) {
  res
    .status(201)
    .json({ data: await service.crearBorrador(req.body, req.user, requestContext(req)) })
}
