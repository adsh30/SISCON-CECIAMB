import { AppError } from './errorHandler.js'

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }))
    throw new AppError(400, 'VALIDACION', 'Revise los datos enviados', details)
  }
  req.body = result.data
  next()
}
