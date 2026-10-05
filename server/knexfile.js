import { env } from './src/config/env.js'

/** @type {import('knex').Knex.Config} */
export default {
  client: 'mysql2',
  connection: {
    ...env.db,
    charset: 'utf8mb4',
    // DECIMAL llega como string: nunca convertir montos a float
    decimalNumbers: false,
    dateStrings: true,
    timezone: 'Z',
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migraciones',
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: './seeds',
    loadExtensions: ['.js'],
  },
}
