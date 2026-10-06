import { z } from 'zod'

const opcional = (esquema) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    esquema.nullable().optional(),
  )

/**
 * RIF venezolano: letra (J, G, V, E, P, C) + número + dígito verificador.
 * Acepta 'j123456789', 'J-12345678-9' o 'J 12345678 9' y lo deja como 'J-12345678-9'.
 */
export const rifSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[\s.-]/g, ''))
  .refine((v) => /^[JGVEPC]\d{7,9}$/.test(v), 'Escriba un RIF válido, por ejemplo J-12345678-9')
  .transform((v) => `${v[0]}-${v.slice(1, -1).padStart(8, '0')}-${v.at(-1)}`)

export const empresaSchema = z.object({
  razonSocial: z
    .string()
    .trim()
    .min(3, 'Escriba la razón social')
    .max(160)
    .transform((v) => v.replace(/\s+/g, ' ')),
  nombreComercial: opcional(z.string().trim().max(120)),
  rif: rifSchema,
  direccion: opcional(z.string().trim().max(255)),
  ciudad: opcional(z.string().trim().max(80)),
  estado: opcional(z.string().trim().max(60)),
  telefono: opcional(
    z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s()-]/g, ''))
      .refine((v) => /^\+?\d{7,15}$/.test(v), 'El teléfono debe tener entre 7 y 15 dígitos'),
  ),
  email: opcional(z.string().trim().toLowerCase().pipe(z.email('Escriba un correo válido'))),
  sitioWeb: opcional(z.url({ message: 'Escriba una dirección web completa (https://…)' }).max(160)),
})

export const LOGO_MAX_BYTES = 500 * 1024

export const logoSchema = z.object({
  // Imagen en base64 (con o sin el prefijo data:...;base64,)
  contenido: z
    .string()
    .min(1, 'Seleccione una imagen')
    .transform((v) => v.replace(/^data:[^;]+;base64,/, '')),
})
