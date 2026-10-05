import { z } from 'zod'

const letras = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/

const nombre = (campo) =>
  z
    .string()
    .trim()
    .min(1, `Escriba el ${campo}`)
    .max(120)
    .regex(letras, `El ${campo} solo puede tener letras`)
    .transform((v) => v.replace(/\s+/g, ' ').toUpperCase())

const opcional = (schema) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    schema.nullable().optional(),
  )

export const usuarioSchema = z.object({
  nombre: nombre('nombre'),
  apellido: nombre('apellido'),
  ci: z
    .string()
    .trim()
    .regex(/^\d{6,9}$/, 'La cédula debe tener entre 6 y 9 dígitos'),
  email: z.string().trim().toLowerCase().pipe(z.email('Escriba un correo válido')),
  telefono: opcional(
    z
      .string()
      .trim()
      .regex(/^\d{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos'),
  ),
  departamento: opcional(z.string().trim().max(80)),
  rolId: z.coerce.number().int().positive('Seleccione un rol'),
})

export const estadoSchema = z.object({ activo: z.boolean() })

export const filtrosSchema = z.object({
  buscar: z.string().trim().max(100).optional(),
  rolId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['activos', 'inactivos', 'archivados', 'todos']).default('todos'),
})
