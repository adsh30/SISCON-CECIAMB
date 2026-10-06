import { defineConfig } from 'vitest/config'
import { testEnv } from './tests/env.js'

export default defineConfig({
  test: {
    environment: 'node',
    env: testEnv,
    globalSetup: './tests/globalSetup.js',
    fileParallelism: false,
    // bcrypt (costo 12) tarda ~1 s por hash en equipos modestos
    testTimeout: 20_000,
  },
})
