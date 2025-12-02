/**
 * Cleanup Script: Delete all stories, epics, and projects for specific users
 * 
 * This script deletes all data for:
 * - chris@synqforge.com
 * - chrisjrobertson@outlook.com
 * 
 * Deletion order (to respect foreign keys):
 * 1. Story links (references stories)
 * 2. Tasks (references stories)
 * 3. Stories (including epics where isEpic=true)
 * 4. Epics (separate epics table)
 * 5. Projects
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { db } from '@/lib/db'
import { users, projects, stories, epics, storyLinks, tasks } from '@/lib/db/schema'
import { eq, inArray, or } from 'drizzle-orm'

const TARGET_EMAILS = [
  'chris@synqforge.com',
  'chrisjrobertson@outlook.com',
  'chrisjrobertson@me.com'
]

async function cleanupUserData() {
  console.log('='.repeat(80))
  console.log('User Data Cleanup Script')
  console.log('='.repeat(80))
  console.log(`Target emails: ${TARGET_EMAILS.join(', ')}\n`)

  try {
    // Step 1: Find users by email
    console.log('Step 1: Finding users...')
    const emailConditions = TARGET_EMAILS.map(email => eq(users.email, email))
    const targetUsers = await db
      .select()
      .from(users)
      .where(or(...emailConditions))

    if (targetUsers.length === 0) {
      console.log('❌ No users found with those email addresses')
      return
    }

    const userIds = targetUsers.map(u => u.id)
    console.log(`✓ Found ${targetUsers.length} user(s):`)
    targetUsers.forEach(u => {
      console.log(`  - ${u.email} (ID: ${u.id})`)
    })
    console.log()

    // Step 2: Find all projects owned by these users
    console.log('Step 2: Finding projects...')
    const userProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.ownerId, userIds))

    const projectIds = userProjects.map(p => p.id)
    console.log(`✓ Found ${projectIds.length} project(s)`)
    if (projectIds.length > 0) {
      userProjects.forEach(p => {
        console.log(`  - ${p.name} (ID: ${p.id})`)
      })
    }
    console.log()

    // Step 3: Find all stories for these projects
    console.log('Step 3: Finding stories...')
    const userStories = await db
      .select()
      .from(stories)
      .where(
        or(
          inArray(stories.projectId, projectIds),
          inArray(stories.createdBy, userIds)
        )
      )

    const storyIds = userStories.map(s => s.id)
    console.log(`✓ Found ${storyIds.length} story/stories (including epics where isEpic=true)`)
    console.log()

    // Step 4: Find all epics for these projects
    console.log('Step 4: Finding epics...')
    const userEpics = await db
      .select()
      .from(epics)
      .where(
        or(
          inArray(epics.projectId, projectIds),
          inArray(epics.createdBy, userIds)
        )
      )

    const epicIds = userEpics.map(e => e.id)
    console.log(`✓ Found ${epicIds.length} epic(s)`)
    console.log()

    // Step 5: Delete story links
    if (storyIds.length > 0) {
      console.log('Step 5: Deleting story links...')
      await db
        .delete(storyLinks)
        .where(
          or(
            inArray(storyLinks.storyId, storyIds),
            inArray(storyLinks.relatedStoryId, storyIds)
          )
        )
      console.log(`✓ Deleted story links`)
      console.log()
    }

    // Step 6: Delete tasks
    if (storyIds.length > 0) {
      console.log('Step 6: Deleting tasks...')
      await db
        .delete(tasks)
        .where(inArray(tasks.storyId, storyIds))
      console.log(`✓ Deleted tasks`)
      console.log()
    }

    // Step 7: Delete stories (including epics where isEpic=true)
    if (storyIds.length > 0) {
      console.log('Step 7: Deleting stories...')
      await db
        .delete(stories)
        .where(inArray(stories.id, storyIds))
      console.log(`✓ Deleted ${storyIds.length} story/stories`)
      console.log()
    }

    // Step 8: Delete epics
    if (epicIds.length > 0) {
      console.log('Step 8: Deleting epics...')
      await db
        .delete(epics)
        .where(inArray(epics.id, epicIds))
      console.log(`✓ Deleted ${epicIds.length} epic(s)`)
      console.log()
    }

    // Step 9: Delete projects
    if (projectIds.length > 0) {
      console.log('Step 9: Deleting projects...')
      await db
        .delete(projects)
        .where(inArray(projects.id, projectIds))
      console.log(`✓ Deleted ${projectIds.length} project(s)`)
      console.log()
    }

    console.log('='.repeat(80))
    console.log('✅ Cleanup Complete!')
    console.log('='.repeat(80))
    console.log(`Summary:`)
    console.log(`  - Users: ${targetUsers.length}`)
    console.log(`  - Projects deleted: ${projectIds.length}`)
    console.log(`  - Stories deleted: ${storyIds.length}`)
    console.log(`  - Epics deleted: ${epicIds.length}`)
    console.log('='.repeat(80))

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

cleanupUserData()
