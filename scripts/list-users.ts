/**
 * List all users in the database
 * Run with: npx tsx scripts/list-users.ts
 */

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

async function listUsers() {
  try {
    console.log('📋 Fetching all users from database...\n')

    const allUsers = await db.select().from(users)

    if (allUsers.length === 0) {
      console.log('❌ No users found in database!')
      console.log('\n💡 Tip: Sign in to https://synqforge.com first to create a user')
      return
    }

    console.log(`✅ Found ${allUsers.length} user(s):\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.name || 'Not set'}`)
      console.log(`   Role: ${user.role || 'Not set'}`)
      console.log(`   Organization ID: ${user.organizationId || '❌ MISSING (cause of 500 errors!)'}`)
      console.log(`   Created: ${user.createdAt?.toLocaleString() || 'Unknown'}`)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const usersWithoutOrg = allUsers.filter(u => !u.organizationId)
    if (usersWithoutOrg.length > 0) {
      console.log(`\n⚠️  ${usersWithoutOrg.length} user(s) without organization:`)
      usersWithoutOrg.forEach(u => console.log(`   - ${u.email}`))
      console.log('\n💡 Run: npx tsx scripts/setup-user-organization.ts <email>')
    } else {
      console.log('\n✅ All users have organizations!')
    }

  } catch (error) {
    console.error('❌ Error fetching users:', error)
    if (error instanceof Error) {
      console.error('Details:', error.message)
    }
  }
}

listUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

