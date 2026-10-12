import { z } from 'zod'
import { POR_PAGINA } from '../bitacora/bitacora.schema.js'
import { booleanoConsulta } from '../cuentas/cuentas.schema.js'

const fecha = (mensaje) => z.iso.date(mensaje)
const opcional = (esquema) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), esquema.optional())
const codigoCuenta = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9A-Za-z.-]+$/, 'Código de cuenta inválido')

const base = {
  desde: fecha('Indique la fecha inicial (AAAA-MM-DD)'),
  hasta: fecha('Indique la fecha final (AAAA-MM-DD)'),
  tipoId: opcional(z.coerce.number().int().positive()),
  centroCostoId: opcional(z.coerce.number().int().positive()),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce
    .number()
    .int()
    .refine((n) => POR_PAGINA.includes(n), `Use ${POR_PAGINA.join(', ')}`)
    .default(25),
  // Impresión: el libro completo, sin paginar
  todo: booleanoConsulta.default(false),
}

const rangoValido = (f) => f.desde <= f.hasta
const errorRango = { message: 'La fecha inicial debe ser anterior a la final', path: ['desde'] }

export const diarioSchema = z.object(base).refine(rangoValido, errorRango)

export const mayorSchema = z
  .object({
    ...base,
    // Rango de cuentas por código; una cuenta de grupo incluye todas sus subcuentas
    cuentaDesde: opcional(codigoCuenta),
    cuentaHasta: opcional(codigoCuenta),
  })
  .refine(rangoValido, errorRango)
  .refine(
    (f) =>
      !f.cuentaDesde ||
      !f.cuentaHasta ||
      f.cuentaDesde <= f.cuentaHasta ||
      f.cuentaDesde.startsWith(`${f.cuentaHasta}.`),
    {
      message: 'La cuenta inicial debe ir antes que la final en el plan de cuentas',
      path: ['cuentaDesde'],
    },
  )
