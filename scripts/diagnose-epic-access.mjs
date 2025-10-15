#!/usr/bin/env node

/**
 * Diagnostic Script: Epic Access Issues
 *
 * This script helps diagnose 403 Forbidden errors when accessing epics.
 * It checks:
 * 1. If the epic exists
 * 2. The epic's organization ID
 * 3. Your user's organization ID
 * 4. Any mismatches that would cause access denial
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema.js'

// Get the epic ID from command line argument
const epicId = process.argv[2]

if (!epicId) {
  console.error('\n❌ Error: Please provide an epic ID')
  console.log('\nUsage: node scripts/diagnose-epic-access.mjs <EPIC_ID>')
  console.log('\nExample: node scripts/diagnose-epic-access.mjs j6as6epx1yowhx7d4i5n0\n')
  process.exit(1)
}

// Database connection
const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql, { schema })

async function diagnose() {
  console.log('\n🔍 Diagnosing Epic Access Issue...\n')
  console.log(`Epic ID: ${epicId}\n`)
  console.log('━'.repeat(60))

  try {
    // 1. Check if epic exists
    console.log('\n📋 Step 1: Checking if epic exists...')
    const [epic] = await db
      .select({
        id: schema.epics.id,
        title: schema.epics.title,
        organizationId: schema.epics.organizationId,
        projectId: schema.epics.projectId,
        createdBy: schema.epics.createdBy,
        createdAt: schema.epics.createdAt,
      })
      .from(schema.epics)
      .where(eq(schema.epics.id, epicId))
      .limit(1)

    if (!epic) {
      console.log('❌ Epic not found in database!')
      console.log('\nPossible reasons:')
      console.log('  • The epic was deleted')
      console.log('  • The ID is incorrect')
      console.log('  • There was a database migration issue')
      process.exit(1)
    }

    console.log('✅ Epic found!')
    console.log(`   Title: "${epic.title}"`)
    console.log(`   Organization ID: ${epic.organizationId || 'NULL ⚠️'}`)
    console.log(`   Project ID: ${epic.projectId || 'NULL ⚠️'}`)
    console.log(`   Created By: ${epic.createdBy}`)
    console.log(`   Created At: ${epic.createdAt}`)

    // 2. Check if organizationId is set
    if (!epic.organizationId) {
      console.log('\n⚠️  WARNING: Epic has no organizationId!')
      console.log('   This is the root cause of the 403 error.')
      console.log('   The epic needs to be assigned to an organization.')
    }

    // 3. Get the project details if projectId exists
    if (epic.projectId) {
      console.log('\n📋 Step 2: Checking project association...')
      const [project] = await db
        .select({
          id: schema.projects.id,
          name: schema.projects.name,
          organizationId: schema.projects.organizationId,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, epic.projectId))
        .limit(1)

      if (project) {
        console.log('✅ Project found!')
        console.log(`   Name: "${project.name}"`)
        console.log(`   Organization ID: ${project.organizationId || 'NULL ⚠️'}`)

        if (epic.organizationId !== project.organizationId) {
          console.log('\n❌ MISMATCH DETECTED!')
          console.log(`   Epic Org ID: ${epic.organizationId}`)
          console.log(`   Project Org ID: ${project.organizationId}`)
        }
      } else {
        console.log('⚠️  Project not found!')
      }
    }

    // 4. Get the creator's details
    console.log('\n📋 Step 3: Checking creator details...')
    const [creator] = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        organizationId: schema.users.organizationId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, epic.createdBy))
      .limit(1)

    if (creator) {
      console.log('✅ Creator found!')
      console.log(`   Name: ${creator.name || 'N/A'}`)
      console.log(`   Email: ${creator.email}`)
      console.log(`   Organization ID: ${creator.organizationId || 'NULL ⚠️'}`)

      if (epic.organizationId && epic.organizationId !== creator.organizationId) {
        console.log('\n❌ MISMATCH DETECTED!')
        console.log(`   Epic Org ID: ${epic.organizationId}`)
        console.log(`   Creator Org ID: ${creator.organizationId}`)
      }
    } else {
      console.log('⚠️  Creator not found!')
    }

    // 5. List all organizations
    console.log('\n📋 Step 4: Listing all organizations...')
    const organizations = await db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
      })
      .from(schema.organizations)

    console.log(`\nFound ${organizations.length} organization(s):`)
    organizations.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name} (ID: ${org.id})`)
    })

    // 6. Summary and recommendations
    console.log('\n━'.repeat(60))
    console.log('\n📊 DIAGNOSIS SUMMARY:\n')

    if (!epic.organizationId) {
      console.log('🔴 CRITICAL ISSUE: Epic has no organizationId')
      console.log('\n💡 RECOMMENDED FIX:')
      console.log('   Run the fix script with the correct organization ID:')
      console.log(`   node scripts/fix-epic-organization.mjs ${epicId} <ORG_ID>`)
      if (creator && creator.organizationId) {
        console.log(`\n   Suggested organization ID (from creator): ${creator.organizationId}`)
      }
    } else if (creator && epic.organizationId !== creator.organizationId) {
      console.log('🟡 WARNING: Epic organization doesn\'t match creator\'s organization')
      console.log('\n💡 This might be intentional, but could cause access issues.')
    } else {
      console.log('🟢 No obvious issues found.')
      console.log('\n💡 The 403 error might be caused by:')
      console.log('   • The user accessing the epic is in a different organization')
      console.log('   • Session/authentication issues')
      console.log('   • Check the user\'s organizationId in their session')
    }

    console.log('\n━'.repeat(60))
    console.log('')

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error.message)
    console.error(error)
    process.exit(1)
  }
}

diagnose()
