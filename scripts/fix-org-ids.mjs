import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { projects, users, stories } from '../lib/db/schema.ts'
import { eq, sql } from 'drizzle-orm'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL not found in environment')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

async function fixOrganizationIds() {
  console.log('🔧 Fixing organization IDs...\n')

  try {
    // Fix projects
    console.log('📁 Updating projects...')
    const result = await client`
      UPDATE projects p
      SET organization_id = u.organization_id
      FROM users u
      WHERE p.owner_id = u.id
        AND (p.organization_id IS NULL OR p.organization_id != u.organization_id)
    `
    console.log(`✅ Updated ${result.count} projects\n`)

    // Fix stories
    console.log('📝 Updating stories...')
    const storyResult = await client`
      UPDATE stories s
      SET organization_id = p.organization_id
      FROM projects p
      WHERE s.project_id = p.id
        AND (s.organization_id IS NULL OR s.organization_id != p.organization_id)
    `
    console.log(`✅ Updated ${storyResult.count} stories\n`)

    console.log('✨ All done!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
    process.exit(0)
  }
}

fixOrganizationIds()
