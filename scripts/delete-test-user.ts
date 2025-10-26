#!/usr/bin/env tsx
/**
 * Delete Test User and Organization
 * 
 * Usage: tsx scripts/delete-test-user.ts <email>
 * Example: tsx scripts/delete-test-user.ts test@example.com
 */

import { db } from '../lib/db'
import { users, organizations } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

async function deleteTestUser(email: string) {
  console.log(`🔍 Looking for user with email: ${email}`)
  
  try {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log(`✓ Found user: ${user.name} (${user.id})`)
    console.log(`  Organization ID: ${user.organizationId}`)

    // Delete user
    await db.delete(users).where(eq(users.email, email))
    console.log('✓ Deleted user')

    // Delete organization if no other users
    if (user.organizationId) {
      const remainingUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, user.organizationId))

      if (remainingUsers.length === 0) {
        await db.delete(organizations).where(eq(organizations.id, user.organizationId))
        console.log('✓ Deleted organization (no remaining users)')
      } else {
        console.log(`⚠️  Organization has ${remainingUsers.length} remaining user(s), not deleting`)
      }
    }

    console.log('✅ Cleanup complete!')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: tsx scripts/delete-test-user.ts <email>')
  process.exit(1)
}

deleteTestUser(email).then(() => {
  console.log('Done')
  process.exit(0)
}).catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})

