import { requestContext } from '../../middlewares/auth.js'
import * as service from './empresa.service.js'

export async function getEmpresa(req, res) {
  res.json({ data: await service.obtener() })
}

export async function putEmpresa(req, res) {
  res.json({ data: await service.actualizar(req.body, req.user, requestContext(req)) })
}

export async function putLogo(req, res) {
  res.json({
    data: await service.guardarLogo(req.body.contenido, req.user, requestContext(req)),
  })
}

export async function deleteLogo(req, res) {
  res.json({ data: await service.quitarLogo(req.user, requestContext(req)) })
}

export async function getLogo(req, res) {
  const { buffer, tipo } = await service.logo()
  res.set({ 'Content-Type': tipo, 'Cache-Control': 'no-cache' })
  res.send(buffer)
}
