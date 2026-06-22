import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './lib/drizzle',
  schema: './lib/auth-schema.ts',
  dialect: 'sqlite',
})
