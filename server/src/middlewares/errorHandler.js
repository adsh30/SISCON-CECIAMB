import { logger } from '../config/logger.js'

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NO_ENCONTRADO',
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } })
  }
  logger.error(err)
  res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' } })
}
