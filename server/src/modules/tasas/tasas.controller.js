import { requestContext } from '../../middlewares/auth.js'
import * as service from './tasas.service.js'

export async function getActual(req, res) {
  res.json({ data: await service.obtenerActuales() })
}

export async function postActualizar(req, res) {
  const data = await service.obtenerActuales({
    forzar: true,
    usuarioId: req.user.id,
    ctx: requestContext(req),
  })
  res.json({ data })
}
