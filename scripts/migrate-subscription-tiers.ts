#!/usr/bin/env tsx
/**
 * Migration script to update subscription tiers from free/pro/enterprise to free/team/business/enterprise
 * This script safely migrates existing data before the schema change
 */

import { db } from '../lib/db'
import { organizations } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

async function migrateSubscriptionTiers() {
  console.log('Starting subscription tier migration...')

  try {
    // Step 1: Find all organizations with 'pro' tier
    console.log('Step 1: Finding organizations with "pro" tier...')
    const orgList = await db.execute(sql`
      SELECT id, name, subscription_tier
      FROM organizations
      WHERE subscription_tier = 'pro'
    `)

    const orgCount = Array.isArray(orgList) ? orgList.length : (orgList.rows?.length || 0)
    console.log(`Found ${orgCount} organizations with "pro" tier`)

    // Step 2: Add new enum values
    console.log('Step 2: Adding new enum values to subscription_tier...')
    try {
      await db.execute(sql`
        ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'team'
      `)
      await db.execute(sql`
        ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'business'
      `)
      console.log('New enum values added successfully')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('Enum values already exist, continuing...')
      } else {
        throw error
      }
    }

    // Step 3: Migrate 'pro' to 'team' (as Team is the new Pro replacement)
    console.log('Step 3: Migrating "pro" tier to "team"...')
    if (orgCount > 0) {
      await db.execute(sql`
        UPDATE organizations
        SET subscription_tier = 'team'::subscription_tier
        WHERE subscription_tier = 'pro'
      `)
      console.log(`Migrated ${orgCount} organizations from "pro" to "team"`)
    }

    // Step 4: Update owner role enum
    console.log('Step 4: Adding "owner" role to role enum...')
    try {
      await db.execute(sql`
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'owner'
      `)
      console.log('Owner role added successfully')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('Owner role already exists, continuing...')
      } else {
        throw error
      }
    }

    console.log('✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateSubscriptionTiers()
