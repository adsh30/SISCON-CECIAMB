import { z } from 'zod'

export const TIPOS_CUENTA = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO', 'ORDEN']

export const NATURALEZAS_CUENTA = ['DEUDORA', 'ACREEDORA']

export const NATURALEZA_POR_DEFECTO = {
  ACTIVO: 'DEUDORA',
  COSTO: 'DEUDORA',
  GASTO: 'DEUDORA',
  PASIVO: 'ACREEDORA',
  PATRIMONIO: 'ACREEDORA',
  INGRESO: 'ACREEDORA',
  ORDEN: 'DEUDORA',
}

export const crearCuentaSchema = z
  .object({
    codigo: z
      .string({ required_error: 'Escriba el código de la cuenta' })
      .trim()
      .min(1, 'El código es requerido')
      .max(30, 'El código no puede exceder 30 caracteres')
      .regex(
        /^[0-9]+(\.[0-9]+)*$/,
        'El código debe tener formato numérico por niveles (ej. 1, 1.1, 1.1.01)',
      ),
    nombre: z
      .string({ required_error: 'Escriba el nombre de la cuenta' })
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(160, 'El nombre no puede exceder 160 caracteres'),
    descripcion: z
      .string()
      .trim()
      .max(255, 'La descripción no puede exceder 255 caracteres')
      .nullish(),
    tipo: z.enum(TIPOS_CUENTA).optional(),
    naturaleza: z
      .enum(NATURALEZAS_CUENTA, {
        errorMap: () => ({ message: 'Naturaleza inválida (DEUDORA o ACREEDORA)' }),
      })
      .optional(),
    padreId: z.coerce.number().int().positive().nullish(),
    esMovimiento: z.boolean().default(false),
    activa: z.boolean().default(true),
  })
  .refine((data) => data.padreId || data.tipo, {
    message: 'Especifique el tipo de cuenta si no tiene una cuenta superior',
    path: ['tipo'],
  })

export const actualizarCuentaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(160, 'El nombre no puede exceder 160 caracteres')
    .optional(),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .nullish(),
  naturaleza: z.enum(NATURALEZAS_CUENTA).optional(),
  esMovimiento: z.boolean().optional(),
  activa: z.boolean().optional(),
})

export const consultaCuentasSchema = z.object({
  q: z.string().trim().optional(),
  tipo: z.enum(TIPOS_CUENTA).optional(),
  soloMovimiento: z.coerce.boolean().optional(),
  soloActivas: z.coerce.boolean().optional(),
  padreId: z.coerce.number().int().positive().nullish(),
})
