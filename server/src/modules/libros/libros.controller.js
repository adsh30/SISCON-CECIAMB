import { balanceExcel, diarioExcel, mayorExcel } from './libros.excel.js'
import * as service from './libros.service.js'

export const diario = async (req, res) => res.json(await service.diario(req.consulta))

export const mayor = async (req, res) => res.json(await service.mayor(req.consulta))

export const balance = async (req, res) => res.json(await service.balance(req.consulta))

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Envía el libro completo (sin paginar) como archivo .xlsx */
function excel(libro, armar, nombre) {
  return async (req, res) => {
    const filtros = { ...req.consulta, todo: true }
    const [contenido, cab] = await Promise.all([
      libro(filtros),
      service.encabezado(filtros, req.user.id),
    ])
    const archivo = await armar(contenido, filtros, cab)
    res
      .type(XLSX)
      .attachment(`${nombre}_${filtros.desde}_${filtros.hasta}.xlsx`)
      .set('Cache-Control', 'no-store')
      .send(archivo)
  }
}

export const diarioXlsx = excel(service.diario, diarioExcel, 'libro-diario')
export const mayorXlsx = excel(service.mayor, mayorExcel, 'libro-mayor')
export const balanceXlsx = excel(service.balance, balanceExcel, 'balance-comprobacion')
