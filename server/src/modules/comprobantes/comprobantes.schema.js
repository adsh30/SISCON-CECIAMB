import { z } from 'zod'
import { POR_PAGINA } from '../bitacora/bitacora.schema.js'

export const ESTADOS = ['BORRADOR', 'APROBADO', 'ANULADO']
export const MAX_RENGLONES = 500

const fecha = z.iso.date('Use el formato AAAA-MM-DD')
const opcional = (esquema) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), esquema.optional())
const textoOpcional = (max, mensaje) =>
  z
    .string()
    .trim()
    .max(max, mensaje)
    .nullish()
    // undefined se conserva: en una edición parcial significa "no tocar"
    .transform((v) => (v === undefined ? undefined : v ? v.replace(/\s+/g, ' ') : null))

/** Monto como string con hasta 2 decimales: '1500', '1500.5', '1500.50'. Vacío = 0 */
export const monto = z.preprocess(
  (v) => (v === '' || v == null ? '0' : typeof v === 'number' ? String(v) : v),
  z
    .string()
    .trim()
    .regex(/^\d{1,16}(\.\d{1,2})?$/, 'Monto inválido: use números con hasta 2 decimales'),
)

const esCero = (m) => /^0+(\.0+)?$/.test(m)

const renglon = z.object({
  cuentaId: z.coerce.number('Elija la cuenta').int().positive('Elija la cuenta'),
  centroCostoId: z.coerce.number().int().positive().nullish(),
  descripcion: textoOpcional(255, 'La descripción no puede pasar de 255 caracteres'),
  debe: monto,
  haber: monto,
  referencia: textoOpcional(60, 'La referencia no puede pasar de 60 caracteres'),
})

export const comprobanteSchema = z
  .object({
    tipoId: z.coerce.number('Elija el tipo de comprobante').int().positive(),
    fecha,
    concepto: z
      .string('Escriba el concepto')
      .trim()
      .min(3, 'Escriba el concepto (al menos 3 caracteres)')
      .max(255, 'El concepto no puede pasar de 255 caracteres')
      .transform((v) => v.replace(/\s+/g, ' ')),
    referencia: textoOpcional(60, 'La referencia no puede pasar de 60 caracteres'),
    beneficiario: textoOpcional(120, 'El beneficiario no puede pasar de 120 caracteres'),
    renglones: z
      .array(renglon)
      .max(MAX_RENGLONES, `Un comprobante admite hasta ${MAX_RENGLONES} renglones`)
      .default([]),
  })
  .superRefine((c, ctx) => {
    c.renglones.forEach((r, i) => {
      const conDebe = !esCero(r.debe)
      const conHaber = !esCero(r.haber)
      if (conDebe === conHaber) {
        ctx.addIssue({
          code: 'custom',
          path: ['renglones', i, conDebe ? 'haber' : 'debe'],
          message: conDebe
            ? `Renglón ${i + 1}: lleve el monto en Debe o en Haber, no en ambos`
            : `Renglón ${i + 1}: escriba un monto en Debe o en Haber`,
        })
      }
    })
  })

export const filtrosSchema = z
  .object({
    tipoId: opcional(z.coerce.number().int().positive()),
    estado: opcional(z.enum(ESTADOS, 'Estado desconocido')),
    desde: opcional(fecha),
    hasta: opcional(fecha),
    buscar: opcional(z.string().trim().max(100)),
    cuentaId: opcional(z.coerce.number().int().positive()),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: z.coerce
      .number()
      .int()
      .refine((n) => POR_PAGINA.includes(n), `Use ${POR_PAGINA.join(', ')}`)
      .default(25),
  })
  .refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, {
    message: 'La fecha inicial debe ser anterior a la final',
    path: ['desde'],
  })

export const anularSchema = z.object({
  motivo: z
    .string('Escriba el motivo')
    .trim()
    .min(10, 'Explique el motivo en al menos 10 caracteres')
    .max(255, 'El motivo no puede pasar de 255 caracteres'),
})

/** Duplicar o reversar: la fecha del comprobante nuevo (por defecto, hoy) */
export const copiaSchema = z.object({ fecha: opcional(fecha) }).default({})

const nombreTipo = z
  .string('Escriba el nombre')
  .trim()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(60, 'El nombre no puede pasar de 60 caracteres')

export const crearTipoSchema = z.object({
  codigo: z
    .string('Escriba el código')
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, 'El código lleva de 2 a 6 letras, por ejemplo VEN'),
  nombre: nombreTipo,
  descripcion: textoOpcional(255, 'La descripción no puede pasar de 255 caracteres'),
  orden: z.coerce.number().int().min(0).max(9999).default(100),
})

export const actualizarTipoSchema = z.object({
  nombre: nombreTipo.optional(),
  descripcion: textoOpcional(255, 'La descripción no puede pasar de 255 caracteres').optional(),
  orden: z.coerce.number().int().min(0).max(9999).optional(),
  activo: z.boolean().optional(),
})
