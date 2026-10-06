import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { bitacoraRoutes } from './modules/bitacora/bitacora.routes.js'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { rolesRoutes } from './modules/roles/roles.routes.js'
import { tasasRoutes } from './modules/tasas/tasas.routes.js'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 'loopback')
  app.use(helmet())
  app.use(cors({ origin: env.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  const api = express.Router()
  api.use('/health', healthRoutes)
  api.use('/auth', authRoutes)
  api.use('/bitacora', bitacoraRoutes)
  api.use('/dashboard', dashboardRoutes)
  api.use('/tasas', tasasRoutes)
  api.use('/usuarios', usuariosRoutes)
  api.use('/roles', rolesRoutes)
  app.use('/api/v1', api)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
