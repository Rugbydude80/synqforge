import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import { customAlphabet } from 'nanoid'
import * as schema from './schema'

type Database = PostgresJsDatabase<typeof schema>

const globalForDb = globalThis as {
  __postgresClient?: Sql
  __dbInstance?: Database
}

function createClient(): Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  return postgres(process.env.DATABASE_URL, {
    max: 1, // Use 1 connection for Edge/Serverless environments
    idle_timeout: 0, // Disable idle timeout
    max_lifetime: 0, // Disable max lifetime
    connect_timeout: 10, // 10 seconds connection timeout
    prepare: false, // Disable prepared statements for Neon compatibility
  })
}

export function getDb(): Database {
  if (!globalForDb.__dbInstance) {
    const client = globalForDb.__postgresClient ?? createClient()
    globalForDb.__postgresClient = client
    globalForDb.__dbInstance = drizzle(client, { schema })
  }

  return globalForDb.__dbInstance
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb() as any
    const value = instance[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  },
}) as Database

/**
 * Generate a unique ID for database records
 * Uses nanoid with custom alphabet for URL-safe IDs
 */
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21)

export function generateId(): string {
  return nanoid()
}
