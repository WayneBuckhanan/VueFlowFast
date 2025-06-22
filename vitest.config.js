import { defineConfig } from 'vitest/config'
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Add test-specific bindings
          bindings: {
            ENVIRONMENT: 'test',
            MAILJET_API_KEY: 'test-mailjet-key',
            MAILJET_SECRET_KEY: 'test-mailjet-secret',
            FROM_EMAIL: 'test@example.com',
            FROM_NAME: 'Test App'
          },
          d1Databases: {
            DB: 'test-db'
          }
        }
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    },
    setupFiles: ['./tests/setup.js']
  }
})