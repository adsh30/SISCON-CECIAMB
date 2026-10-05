import { createApp } from './app.js'
import { db } from './config/db.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'

const server = createApp().listen(env.port, () => {
  logger.info(`API SISCON-CECIAMB escuchando en http://localhost:${env.port}/api/v1`)
})

async function shutdown(signal) {
  logger.info(`${signal} recibido, cerrando...`)
  server.close()
  await db.destroy()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
