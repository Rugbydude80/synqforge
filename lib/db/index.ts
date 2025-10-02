import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { customAlphabet } from 'nanoid'
import * as schema from './schema'

// Create the connection
const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutes
})

export const db = drizzle(client, { schema })

/**
 * Generate a unique ID for database records
 * Uses nanoid with custom alphabet for URL-safe IDs
 */
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21)

export function generateId(): string {
  return nanoid()
}
