/**
 * Delete all activities for a specific user
 * 
 * This script deletes all activities from the activities table
 * for the user: chrisjrobertson@outlook.com
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { db } from '@/lib/db'
import { users, activities } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const TARGET_EMAIL = 'chrisjrobertson@outlook.com'

async function deleteUserActivities() {
  console.log('='.repeat(80))
  console.log('Delete User Activities Script')
  console.log('='.repeat(80))
  console.log(`Target email: ${TARGET_EMAIL}\n`)

  try {
    // Step 1: Find user by email
    console.log('Step 1: Finding user...')
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, TARGET_EMAIL))
      .limit(1)

    if (!targetUser) {
      console.log(`❌ No user found with email: ${TARGET_EMAIL}`)
      return
    }

    console.log(`✓ Found user: ${targetUser.email} (ID: ${targetUser.id})`)
    console.log(`  Organization ID: ${targetUser.organizationId}`)
    console.log()

    // Step 2: Count activities for this user
    console.log('Step 2: Counting activities...')
    const activityCount = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, targetUser.id))

    console.log(`✓ Found ${activityCount.length} activity/activities for this user`)
    console.log()

    if (activityCount.length === 0) {
      console.log('No activities to delete.')
      return
    }

    // Step 3: Delete all activities for this user
    console.log('Step 3: Deleting activities...')
    const deletedActivities = await db
      .delete(activities)
      .where(eq(activities.userId, targetUser.id))

    console.log(`✓ Deleted ${activityCount.length} activity/activities`)
    console.log()

    // Step 4: Also delete activities for the user's organization (to clear dashboard)
    console.log('Step 4: Checking organization activities...')
    const orgActivityCount = await db
      .select()
      .from(activities)
      .where(eq(activities.organizationId, targetUser.organizationId))

    if (orgActivityCount.length > 0) {
      console.log(`Found ${orgActivityCount.length} additional activities for organization`)
      console.log('Deleting organization activities...')
      await db
        .delete(activities)
        .where(eq(activities.organizationId, targetUser.organizationId))
      console.log(`✓ Deleted ${orgActivityCount.length} organization activity/activities`)
    } else {
      console.log('✓ No additional organization activities found')
    }
    console.log()

    console.log('='.repeat(80))
    console.log('✅ Activities Deletion Complete!')
    console.log('='.repeat(80))
    console.log(`Summary:`)
    console.log(`  - User: ${targetUser.email}`)
    console.log(`  - User activities deleted: ${activityCount.length}`)
    console.log(`  - Organization activities deleted: ${orgActivityCount.length}`)
    console.log('='.repeat(80))

  } catch (error) {
    console.error('\n❌ Error during deletion:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

deleteUserActivities()


