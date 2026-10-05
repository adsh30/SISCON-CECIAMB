import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import { healthRoutes } from './modules/health/health.routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: env.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  const api = express.Router()
  api.use('/health', healthRoutes)
  app.use('/api/v1', api)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
