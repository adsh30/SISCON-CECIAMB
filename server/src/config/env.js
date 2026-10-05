import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// El .env vive en la raíz del monorepo
const envPath = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(envPath)) process.loadEnvFile(envPath)

function required(name) {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno ${name} (ver .env.example)`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },
}
