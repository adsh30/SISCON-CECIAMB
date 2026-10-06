import { z } from 'zod'

export const ejercicioSchema = z.object({
  anio: z.coerce
    .number('Escriba el año')
    .int('Escriba el año')
    .min(2000, 'El año debe estar entre 2000 y 2100')
    .max(2100, 'El año debe estar entre 2000 y 2100'),
  mesInicio: z.coerce.number().int().min(1, 'Mes inválido').max(12, 'Mes inválido').default(1),
})

export const reabrirSchema = z.object({
  motivo: z
    .string('Escriba el motivo')
    .trim()
    .min(10, 'Explique el motivo en al menos 10 caracteres')
    .max(255, 'El motivo no puede pasar de 255 caracteres'),
})
