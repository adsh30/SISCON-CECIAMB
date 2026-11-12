import { z } from 'zod'

export const crearConciliacionSchema = z.object({
  cuentaId: z.number().int().positive('Seleccione una cuenta bancaria válida'),
  periodoId: z.number().int().positive('Seleccione un período válido'),
  fechaCorte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD'),
  saldoBanco: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), 'Monto de saldo bancario inválido'),
  observaciones: z.string().trim().max(1000).optional(),
})

export const importarMovimientosBancoSchema = z.object({
  movimientos: z
    .array(
      z.object({
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD'),
        referencia: z.string().trim().max(100).optional().default(''),
        descripcion: z.string().trim().min(1, 'Descripción requerida').max(255),
        monto: z
          .union([z.string(), z.number()])
          .transform((v) => String(v).trim())
          .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Monto inválido'),
        tipoMovimiento: z.enum(['DEBITO', 'CREDITO']),
        notas: z.string().trim().max(255).optional(),
      }),
    )
    .min(1, 'Debe incluir al menos un movimiento bancario'),
})

export const emparejarSchema = z.object({
  partidaLibroId: z.number().int().positive(),
  partidaBancoId: z.number().int().positive(),
})

export const desemparejarSchema = z.object({
  partidaId: z.number().int().positive(),
})

export const finalizarConciliacionSchema = z.object({
  observaciones: z.string().trim().max(1000).optional(),
})

export const anularConciliacionSchema = z.object({
  motivo: z.string().trim().min(3, 'Indique el motivo de la anulación').max(255),
})
