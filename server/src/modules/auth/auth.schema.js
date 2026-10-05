import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Escriba un correo válido')),
  password: z.string().min(1, 'Escriba su contraseña').max(200),
})

export const claveSchema = z
  .string()
  .min(8, 'La clave debe tener al menos 8 caracteres')
  .max(72, 'La clave no puede superar 72 caracteres')
  .regex(/[A-Za-z]/, 'La clave debe incluir al menos una letra')
  .regex(/[0-9]/, 'La clave debe incluir al menos un número')

export const cambiarClaveSchema = z
  .object({
    actual: z.string().min(1, 'Escriba su clave actual'),
    nueva: claveSchema,
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    path: ['confirmacion'],
    message: 'Las claves no coinciden',
  })

const letras = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/
const nombrePropio = (campo) =>
  z
    .string()
    .trim()
    .min(1, `Escriba su ${campo}`)
    .max(120)
    .regex(letras, `El ${campo} solo puede tener letras`)
    .transform((v) => v.replace(/s+/g, ' ').toUpperCase())

const vacioANull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v)

export const perfilSchema = z.object({
  nombre: nombrePropio('nombre'),
  apellido: nombrePropio('apellido'),
  telefono: z.preprocess(
    vacioANull,
    z
      .string()
      .trim()
      .regex(/^[0-9]{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos')
      .nullable(),
  ),
  departamento: z.preprocess(vacioANull, z.string().trim().max(80).nullable()),
})
