import * as service from './dashboard.service.js'

export async function getResumen(req, res) {
  res.json({ data: await service.obtener(req.user) })
}

export async function getActividad(req, res) {
  res.json({ data: await service.actividadPorDia(req.consulta) })
}
