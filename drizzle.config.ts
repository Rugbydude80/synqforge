import type { Config } from 'drizzle-kit'
import { loadEnvConfig } from '@next/env'

// Load environment variables from .env.local
loadEnvConfig(process.cwd())

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
