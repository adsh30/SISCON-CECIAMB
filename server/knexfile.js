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
  pool: {
    min: 0,
    max: 10,
    // Toda fecha se guarda en UTC: NOW() y CURRENT_TIMESTAMP no dependen de la hora del equipo
    afterCreate: (conn, done) => conn.query("SET time_zone = '+00:00'", (err) => done(err, conn)),
  },
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
