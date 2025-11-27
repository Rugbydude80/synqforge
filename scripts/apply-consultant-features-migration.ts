#!/usr/bin/env tsx
/**
 * Script to apply consultant features migration to database
 * Usage: tsx scripts/apply-consultant-features-migration.ts
 */

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('📦 Loading migration file...')
  const migrationPath = join(process.cwd(), 'db/migrations/0015_add_consultant_features.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('🔌 Connecting to database...')
  const sql = neon(databaseUrl)

  try {
    console.log('🚀 Applying migration...')
    console.log('Executing SQL migration file...')
    const result = await sql.unsafe(migrationSQL)
    console.log('✅ Migration applied successfully!')
    console.log('📊 Tables created: clients, time_entries, invoices, client_portal_access')
    console.log('📊 Columns added: projects.client_id, projects.billing_rate, organizations.last_invoice_number')
    console.log('📊 Triggers and indexes created')
  } catch (error) {
    console.error('❌ Error applying migration:', error)
    if (error instanceof Error) {
      // Check if table already exists (not a fatal error)
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⚠️  Some objects may already exist. This is OK if migration was already applied.')
        console.log('✅ Migration check complete')
      } else {
        throw error
      }
    } else {
      throw error
    }
  }
}

applyMigration().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

