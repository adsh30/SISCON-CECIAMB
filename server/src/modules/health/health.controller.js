import { obtenerEstado } from './health.service.js'

export async function getHealth(req, res) {
  const data = await obtenerEstado()
  res.status(data.baseDatos.estado === 'ok' ? 200 : 503).json({ data })
}
