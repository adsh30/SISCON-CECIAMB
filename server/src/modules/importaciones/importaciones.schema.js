import { z } from 'zod'

export const MAX_FILAS = 500 // el mismo tope de renglones de un comprobante

const fecha = z.iso.date('Use el formato AAAA-MM-DD')
const textoOpcional = (max, mensaje) =>
  z
    .string()
    .trim()
    .max(max, mensaje)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v ? v.replace(/\s+/g, ' ') : null))

/** Texto del archivo CSV tal cual se lee del disco (el análisis ocurre en el servidor) */
export const previsualizarSchema = z.object({
  csv: z
    .string('Adjunte el archivo CSV')
    .trim()
    .min(1, 'Adjunte el archivo CSV')
    .max(200_000, 'El archivo es demasiado grande: el máximo es 200 KB (unos 500 renglones)'),
})

/** El borrador que se arma con el archivo: cabecera + el resultado del análisis */
export const importarSchema = previsualizarSchema.extend({
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
})
