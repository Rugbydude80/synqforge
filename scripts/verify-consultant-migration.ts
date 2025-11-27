#!/usr/bin/env tsx
/**
 * Verify consultant features migration was applied
 */

import { neon } from '@neondatabase/serverless'

async function verifyMigration() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('🔍 Checking database for consultant features tables...\n')
  const sql = neon(databaseUrl)

  try {
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('clients', 'time_entries', 'invoices', 'client_portal_access')
      ORDER BY table_name
    `
    
    const tables = result.map((r: any) => r.table_name)
    
    if (tables.length === 4) {
      console.log('✅ All tables found:')
      tables.forEach(t => console.log(`   ✓ ${t}`))
    } else {
      console.log('⚠️  Some tables missing:')
      const expected = ['clients', 'time_entries', 'invoices', 'client_portal_access']
      expected.forEach(t => {
        console.log(tables.includes(t) ? `   ✓ ${t}` : `   ✗ ${t} (missing)`)
      })
    }

    // Check for columns added to existing tables
    console.log('\n🔍 Checking for new columns...')
    
    const orgColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND column_name = 'last_invoice_number'
    `
    
    const projectColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name IN ('client_id', 'billing_rate')
    `

    if (orgColumns.length > 0) {
      console.log('   ✓ organizations.last_invoice_number')
    } else {
      console.log('   ✗ organizations.last_invoice_number (missing)')
    }

    const projectCols = projectColumns.map((r: any) => r.column_name)
    if (projectCols.includes('client_id')) {
      console.log('   ✓ projects.client_id')
    } else {
      console.log('   ✗ projects.client_id (missing)')
    }
    if (projectCols.includes('billing_rate')) {
      console.log('   ✓ projects.billing_rate')
    } else {
      console.log('   ✗ projects.billing_rate (missing)')
    }

    console.log('\n✅ Verification complete!')
  } catch (error) {
    console.error('❌ Error verifying migration:', error)
    process.exit(1)
  }
}

verifyMigration().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

