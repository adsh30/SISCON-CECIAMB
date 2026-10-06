import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { join } from 'node:path'
import { DIST, hashesScriptsEnLinea, hayCliente } from './config/cliente.js'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { bitacoraRoutes } from './modules/bitacora/bitacora.routes.js'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js'
import { empresaRoutes } from './modules/empresa/empresa.routes.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { periodosRoutes } from './modules/periodos/periodos.routes.js'
import { rolesRoutes } from './modules/roles/roles.routes.js'
import { tasasRoutes } from './modules/tasas/tasas.routes.js'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes.js'

/**
 * @param {{ servirCliente?: boolean }} opciones  servirCliente: entregar también la interfaz
 *   compilada (producción). En desarrollo la sirve Vite.
 */
export function createApp({ servirCliente = env.nodeEnv === 'production' && hayCliente() } = {}) {
  const app = express()
  const https = env.auth.cookieSecure

  app.disable('x-powered-by')
  app.set('trust proxy', 'loopback')
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'", ...(servirCliente ? hashesScriptsEnLinea() : [])],
          // En la red interna se usa http: no forzar https ni HSTS si no está configurado
          upgradeInsecureRequests: https ? [] : null,
        },
      },
      strictTransportSecurity: https,
    }),
  )
  app.use(cors({ origin: env.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  const api = express.Router()
  api.use('/health', healthRoutes)
  api.use('/auth', authRoutes)
  api.use('/bitacora', bitacoraRoutes)
  api.use('/dashboard', dashboardRoutes)
  api.use('/empresa', empresaRoutes)
  api.use('/periodos', periodosRoutes)
  api.use('/tasas', tasasRoutes)
  api.use('/usuarios', usuariosRoutes)
  api.use('/roles', rolesRoutes)
  app.use('/api/v1', api)

  if (servirCliente) {
    // Archivos con hash en el nombre: se guardan en caché un año; el resto se revalida
    // Un recurso inexistente responde 404, no la página de la aplicación
    app.use(
      '/assets',
      express.static(join(DIST, 'assets'), { immutable: true, maxAge: '1y' }),
      notFound,
    )
    app.use(express.static(DIST, { index: false }))
    // Rutas de la aplicación (/app, /login…): las resuelve React
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(join(DIST, 'index.html'))
    })
  }

  app.use(notFound)
  app.use(errorHandler)
  return app
}
