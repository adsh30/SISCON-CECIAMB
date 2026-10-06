import { z } from 'zod'
import { ACCIONES } from './bitacora.service.js'

const fecha = z.iso.date('Use el formato AAAA-MM-DD')
const opcional = (esquema) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), esquema.optional())

export const POR_PAGINA = [10, 25, 50, 100]
export const MAX_EXPORTAR = 5000

export const filtrosSchema = z
  .object({
    desde: opcional(fecha),
    hasta: opcional(fecha),
    usuarioId: opcional(z.coerce.number().int().positive()),
    accion: opcional(z.enum(Object.values(ACCIONES), 'Acción desconocida')),
    entidad: opcional(z.string().trim().max(60)),
    buscar: opcional(z.string().trim().max(100)),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: z.coerce
      .number()
      .int()
      .refine((n) => POR_PAGINA.includes(n), `Use ${POR_PAGINA.join(', ')}`)
      .default(25),
  })
  .refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, {
    message: 'La fecha inicial debe ser anterior a la final',
    path: ['desde'],
  })
