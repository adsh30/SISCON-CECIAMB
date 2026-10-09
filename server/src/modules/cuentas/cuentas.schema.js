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

/** 'true'/'false' de la URL; z.coerce.boolean() convierte 'false' en true */
export const booleanoConsulta = z.enum(['true', 'false']).transform((v) => v === 'true')

const nombre = z
  .string('Escriba el nombre de la cuenta')
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(160, 'El nombre no puede pasar de 160 caracteres')
  .transform((v) => v.replace(/\s+/g, ' '))

const descripcion = z
  .string()
  .trim()
  .max(255, 'La descripción no puede pasar de 255 caracteres')
  .nullish()
  .transform((v) => (v === '' ? null : v))

const naturaleza = z.enum(NATURALEZAS_CUENTA, 'La naturaleza debe ser DEUDORA o ACREEDORA')

export const crearCuentaSchema = z
  .object({
    codigo: z
      .string('Escriba el código de la cuenta')
      .trim()
      .min(1, 'Escriba el código de la cuenta')
      .max(30, 'El código no puede pasar de 30 caracteres')
      .regex(
        /^[0-9]+(\.[0-9]+)*$/,
        'El código va en números separados por puntos, por ejemplo 1.1.01',
      ),
    nombre,
    descripcion,
    tipo: z.enum(TIPOS_CUENTA, 'Tipo de cuenta inválido').optional(),
    naturaleza: naturaleza.optional(),
    padreId: z.coerce.number().int().positive().nullish(),
    esMovimiento: z.boolean().default(false),
    activa: z.boolean().default(true),
  })
  .refine((d) => d.padreId || d.tipo, {
    message: 'Indique el tipo de cuenta si no tiene una cuenta superior',
    path: ['tipo'],
  })

export const actualizarCuentaSchema = z.object({
  nombre: nombre.optional(),
  descripcion: descripcion.optional(),
  naturaleza: naturaleza.optional(),
  esMovimiento: z.boolean().optional(),
  activa: z.boolean().optional(),
})

export const consultaCuentasSchema = z.object({
  q: z.string().trim().max(60).optional(),
  tipo: z.enum(TIPOS_CUENTA).optional(),
  soloMovimiento: booleanoConsulta.optional(),
  soloActivas: booleanoConsulta.optional(),
})
