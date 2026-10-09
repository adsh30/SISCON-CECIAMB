import { z } from 'zod'
import { booleanoConsulta } from '../cuentas/cuentas.schema.js'

const nombre = z
  .string('Escriba el nombre del centro de costo')
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(120, 'El nombre no puede pasar de 120 caracteres')
  .transform((v) => v.replace(/\s+/g, ' '))

const descripcion = z
  .string()
  .trim()
  .max(255, 'La descripción no puede pasar de 255 caracteres')
  .nullish()
  .transform((v) => (v === '' ? null : v))

export const crearCentroCostoSchema = z.object({
  codigo: z
    .string('Escriba el código del centro de costo')
    .trim()
    .toUpperCase()
    .min(1, 'Escriba el código del centro de costo')
    .max(20, 'El código no puede pasar de 20 caracteres')
    .regex(
      /^[A-Z0-9][A-Z0-9-]*$/,
      'El código solo lleva letras, números y guiones, por ejemplo EME',
    ),
  nombre,
  descripcion,
  activo: z.boolean().default(true),
})

export const actualizarCentroCostoSchema = z.object({
  nombre: nombre.optional(),
  descripcion: descripcion.optional(),
  activo: z.boolean().optional(),
})

export const consultaCentrosCostoSchema = z.object({
  q: z.string().trim().max(60).optional(),
  soloActivos: booleanoConsulta.optional(),
})
