import { z } from 'zod'

export const crearCentroCostoSchema = z.object({
  codigo: z
    .string({ required_error: 'Escriba el código del centro de costo' })
    .trim()
    .min(1, 'El código es requerido')
    .max(20, 'El código no puede exceder 20 caracteres')
    .toUpperCase(),
  nombre: z
    .string({ required_error: 'Escriba el nombre del centro de costo' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede exceder 120 caracteres'),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .nullish(),
  activo: z.boolean().default(true),
})

export const actualizarCentroCostoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede exceder 120 caracteres')
    .optional(),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .nullish(),
  activo: z.boolean().optional(),
})

export const consultaCentrosCostoSchema = z.object({
  q: z.string().trim().optional(),
  soloActivos: z.coerce.boolean().optional(),
})
