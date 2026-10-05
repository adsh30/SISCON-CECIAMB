import { testEnv } from './env.js'

export async function setup() {
  Object.assign(process.env, testEnv)
  const { default: knex } = await import('knex')
  const { default: config } = await import('../knexfile.js')
  const db = knex(config)
  try {
    await db.migrate.rollback(undefined, true)
    await db.migrate.latest()
    await db.seed.run()
  } finally {
    await db.destroy()
  }
}
