import { AppError } from './errorHandler.js'

/**
 * Valida el cuerpo (por defecto) o la query string con un esquema zod.
 * En Express 5 `req.query` es de solo lectura: la query validada queda en `req.consulta`.
 */
export const validate =
  (schema, origen = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(origen === 'query' ? req.query : req.body)
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        campo: i.path.join('.'),
        mensaje: i.message,
      }))
      throw new AppError(400, 'VALIDACION', 'Revise los datos enviados', details)
    }
    if (origen === 'query') req.consulta = result.data
    else req.body = result.data
    next()
  }
