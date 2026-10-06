import { requestContext } from '../../middlewares/auth.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { MAX_EXPORTAR } from './bitacora.schema.js'
import * as service from './bitacora.service.js'

export async function getListado(req, res) {
  res.json(await service.listar(req.consulta))
}

export async function getOpciones(req, res) {
  res.json({ data: await service.opciones() })
}

export async function getDetalle(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1)
    throw new AppError(404, 'NO_ENCONTRADO', 'El evento no existe')
  res.json({ data: await service.detalle(id) })
}

export async function getExportar(req, res) {
  const { csv } = await service.exportarCsv(
    req.consulta,
    MAX_EXPORTAR,
    req.user.id,
    requestContext(req),
  )
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date())
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="bitacora-${hoy}.csv"`,
  })
  res.send(csv)
}
