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
  auth: {
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    cookieMaxAgeMs: 8 * 60 * 60 * 1000,
  },
  tasas: {
    bcvUsdUrl: process.env.BCV_USD_URL ?? 'https://ve.dolarapi.com/v1/dolares/oficial',
    bcvEurUrl: process.env.BCV_EUR_URL ?? 'https://ve.dolarapi.com/v1/euros/oficial',
    binanceP2pUrl:
      process.env.BINANCE_P2P_URL ?? 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
  },
}
