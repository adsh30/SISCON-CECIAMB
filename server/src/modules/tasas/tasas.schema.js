import { z } from 'zod'

const fecha = z.iso.date('Use el formato AAAA-MM-DD')

export const rangoFechasSchema = z
  .object({ desde: fecha, hasta: fecha })
  .refine((q) => q.desde <= q.hasta, {
    message: 'La fecha inicial debe ser anterior a la final',
    path: ['desde'],
  })
