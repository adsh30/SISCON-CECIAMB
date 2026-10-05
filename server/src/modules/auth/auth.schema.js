import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Escriba un correo válido')),
  password: z.string().min(1, 'Escriba su contraseña').max(200),
})
