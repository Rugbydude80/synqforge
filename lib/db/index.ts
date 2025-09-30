import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { customAlphabet } from 'nanoid'
import * as schema from './schema'

const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'synqforge',
})

export const db = drizzle(poolConnection, { schema, mode: 'default' })

/**
 * Generate a unique ID for database records
 * Uses nanoid with custom alphabet for URL-safe IDs
 */
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21)

export function generateId(): string {
  return nanoid()
}
