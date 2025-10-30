#!/usr/bin/env tsx
/**
 * List Users with Plan Information
 * 
 * Lists all users with their organization and plan details in one view
 * Makes it easy to see user plans without having to look up organizations
 * 
 * Usage:
 *   pnpm tsx scripts/list-users-with-plans.ts [search-term]
 * 
 * Examples:
 *   pnpm tsx scripts/list-users-with-plans.ts
 *   pnpm tsx scripts/list-users-with-plans.ts john
 *   pnpm tsx scripts/list-users-with-plans.ts @example.com
 * 
 * Note: Requires DATABASE_URL environment variable.
 *       Run: vercel env pull .env.local (or set DATABASE_URL manually)
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Try loading .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  console.error('\n💡 To fix this, run:')
  console.error('   vercel env pull .env.local')
  console.error('\n   Or set DATABASE_URL manually:')
  console.error('   export DATABASE_URL="your-database-url"')
  process.exit(1)
}

import { db } from '../lib/db'
import { organizations, users } from '../lib/db/schema'
import { eq, like, or, sql, desc } from 'drizzle-orm'
import { mapPlanToLegacyTier } from '../lib/billing/plan-entitlements'

interface UserWithPlan {
  userId: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  createdAt: Date | null
  organizationId: string
  organizationName: string
  organizationSlug: string
  plan: string
  tier: string
  subscriptionStatus: string
  seatsIncluded: number
  aiTokensIncluded: number
  userCount: number
}

async function listUsersWithPlans(searchTerm?: string) {
  const query = searchTerm?.trim() || ''

  console.log(`\n${query ? `🔍 Searching users: "${query}"` : '📋 Listing all users with plan information...'}\n`)

  let results: UserWithPlan[]

  if (query) {
    // Search users by email or name
    results = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        plan: organizations.plan,
        tier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        seatsIncluded: organizations.seatsIncluded,
        aiTokensIncluded: organizations.aiTokensIncluded,
        userCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${users} 
          WHERE ${users.organizationId} = ${organizations.id}
        )`,
      })
      .from(users)
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(
        or(
          like(users.email, `%${query}%`),
          like(users.name, `%${query}%`),
          like(organizations.name, `%${query}%`),
          like(organizations.slug, `%${query}%`)
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(100)
  } else {
    // List all users
    results = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        plan: organizations.plan,
        tier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        seatsIncluded: organizations.seatsIncluded,
        aiTokensIncluded: organizations.aiTokensIncluded,
        userCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${users} 
          WHERE ${users.organizationId} = ${organizations.id}
        )`,
      })
      .from(users)
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .orderBy(desc(users.createdAt))
      .limit(500)
  }

  if (results.length === 0) {
    console.log('❌ No users found')
    if (query) {
      console.log(`\n💡 Try a different search term or run without arguments to see all users`)
    }
    process.exit(0)
  }

  console.log(`✅ Found ${results.length} user(s)\n`)

  // Group by organization for better readability
  const orgMap = new Map<string, UserWithPlan[]>()
  results.forEach(user => {
    if (!orgMap.has(user.organizationId)) {
      orgMap.set(user.organizationId, [])
    }
    orgMap.get(user.organizationId)!.push(user)
  })

  orgMap.forEach((orgUsers, orgId) => {
    const org = orgUsers[0]
    
    const expectedTier = mapPlanToLegacyTier(org.plan || '')
    const hasMismatch = org.tier !== expectedTier

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`🏢 ${org.organizationName}${hasMismatch ? ' ⚠️  MISMATCH' : ''}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`   Slug:              ${org.organizationSlug}`)
    console.log(`   Plan:              ${org.plan}`)
    console.log(`   Tier:              ${org.tier}${hasMismatch ? ` ⚠️  (expected: ${expectedTier})` : ''}`)
    console.log(`   Status:            ${org.subscriptionStatus}`)
    console.log(`   Seats Included:    ${org.seatsIncluded === 999999 ? 'Unlimited' : org.seatsIncluded}`)
    console.log(`   AI Tokens:         ${org.aiTokensIncluded === 999999 ? 'Unlimited' : org.aiTokensIncluded.toLocaleString()}`)
    console.log(`   Total Users:       ${org.userCount}`)
    console.log(`\n   👥 Users in this org:`)
    
    orgUsers.forEach(user => {
      console.log(`   • ${user.name || 'N/A'} (${user.email})`)
      console.log(`     └─ Role: ${user.role} | Active: ${user.isActive ? 'Yes' : 'No'} | Created: ${user.createdAt?.toLocaleDateString() || 'N/A'}`)
    })
    
    console.log(`\n💡 To change plan for any user in this org:`)
    console.log(`   pnpm tsx scripts/manually-assign-plan.ts ${orgUsers[0].email} <plan-name>`)
    console.log(`\n`)
  })

  console.log(`\n📊 Summary:`)
  console.log(`   Total Users:      ${results.length}`)
  console.log(`   Total Orgs:       ${orgMap.size}`)
  
  // Plan distribution
  const planCounts = new Map<string, number>()
  results.forEach(user => {
    planCounts.set(user.plan, (planCounts.get(user.plan) || 0) + 1)
  })
  
  console.log(`\n   Plan Distribution:`)
  planCounts.forEach((count, plan) => {
    console.log(`   • ${plan}: ${count} user(s)`)
  })
}

async function main() {
  const args = process.argv.slice(2)
  const searchTerm = args[0]

  try {
    await listUsersWithPlans(searchTerm)
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

