/**
 * Check what tables exist in the database
 * Run with: npx tsx scripts/check-database-schema.ts
 */

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n')

    // Query to get all tables
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `) as any

    console.log('Raw result:', JSON.stringify(result, null, 2))

    const tables = Array.isArray(result) 
      ? result.map((row: any) => row.table_name)
      : result.rows 
        ? result.rows.map((row: any) => row.table_name)
        : []

    console.log(`📊 Found ${tables.length} tables:\n`)
    tables.forEach((table: string, index: number) => {
      console.log(`   ${index + 1}. ${table}`)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Check for required tables
    const requiredTables = [
      'users',
      'organizations',
      'clients',
      'projects',
      'epics',
      'stories',
      'time_entries',
      'invoices',
    ]

    console.log('\n✅ Checking required tables:\n')
    const missingTables: string[] = []

    requiredTables.forEach(table => {
      const exists = tables.includes(table)
      console.log(`   ${exists ? '✅' : '❌'} ${table}`)
      if (!exists) {
        missingTables.push(table)
      }
    })

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:', missingTables.join(', '))
      console.log('\n💡 You need to run database migrations!')
      console.log('   Run: npm run db:push')
      console.log('   Or:  npx drizzle-kit push')
    } else {
      console.log('\n✅ All required tables exist!')
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error)
    if (error instanceof Error) {
      console.error('Details:', error.message)
    }
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

