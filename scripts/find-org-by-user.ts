#!/usr/bin/env tsx
/**
 * Find Organization by User Email
 * 
 * Quick script to find an organization and user details by email
 * Useful for identifying which org to update
 * 
 * Usage:
 *   pnpm tsx scripts/find-org-by-user.ts <user-email>
 * 
 * Example:
 *   pnpm tsx scripts/find-org-by-user.ts user@example.com
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
import { eq, sql } from 'drizzle-orm'

async function findOrganizationByEmail(email: string) {
  console.log(`\n🔍 Searching for user: ${email}\n`)

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    console.error(`❌ User not found with email: ${email}`)
    console.error(`\n💡 Try searching by partial email or check for typos`)
    process.exit(1)
  }

  // Find organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1)

  if (!org) {
    console.error(`❌ Organization not found for user: ${email}`)
    process.exit(1)
  }

  // Count users in organization
  const [userCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(users)
    .where(eq(users.organizationId, org.id))

  console.log(`✅ Found Organization!\n`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`👤 USER INFORMATION`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   ID:        ${user.id}`)
  console.log(`   Email:     ${user.email}`)
  console.log(`   Name:      ${user.name || 'N/A'}`)
  console.log(`   Role:      ${user.role}`)
  console.log(`   Active:    ${user.isActive ? 'Yes' : 'No'}`)
  console.log(`   Created:   ${user.createdAt?.toLocaleString() || 'N/A'}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🏢 ORGANIZATION INFORMATION`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   ID:                    ${org.id}`)
  console.log(`   Name:                  ${org.name}`)
  console.log(`   Slug:                  ${org.slug}`)
  console.log(`   Plan:                  ${org.plan}`)
  console.log(`   Tier:                  ${org.subscriptionTier}`)
  console.log(`   Plan Cycle:            ${org.planCycle}`)
  console.log(`   Subscription Status:   ${org.subscriptionStatus}`)
  console.log(`   Stripe Customer ID:    ${org.stripeCustomerId || 'None'}`)
  console.log(`   Stripe Subscription:   ${org.stripeSubscriptionId || 'None'}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 ENTITLEMENTS`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Seats Included:        ${org.seatsIncluded === 999999 ? 'Unlimited' : org.seatsIncluded}`)
  console.log(`   Projects Included:     ${org.projectsIncluded === 999999 ? 'Unlimited' : org.projectsIncluded}`)
  console.log(`   AI Tokens:             ${org.aiTokensIncluded === 999999 ? 'Unlimited' : org.aiTokensIncluded.toLocaleString()}`)
  console.log(`   Advanced AI:           ${org.advancedAi ? 'Yes' : 'No'}`)
  console.log(`   Exports Enabled:       ${org.exportsEnabled ? 'Yes' : 'No'}`)
  console.log(`   Templates Enabled:     ${org.templatesEnabled ? 'Yes' : 'No'}`)
  console.log(`   SSO Enabled:           ${org.ssoEnabled ? 'Yes' : 'No'}`)
  console.log(`   Support Tier:          ${org.supportTier}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📈 USAGE`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Total Users:           ${userCount?.count || 0}`)
  console.log(`   Subscription Renewal:   ${org.subscriptionRenewalAt ? org.subscriptionRenewalAt.toLocaleString() : 'N/A'}`)
  console.log(`   Created:                ${org.createdAt?.toLocaleString() || 'N/A'}`)
  console.log(`   Last Updated:          ${org.updatedAt?.toLocaleString() || 'N/A'}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\n💡 To manually assign a plan, run:`)
  console.log(`   pnpm tsx scripts/manually-assign-plan.ts ${email} <plan-name>`)
  console.log(`\n   Valid plans: free, solo, pro, team, enterprise, admin`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    console.error('Usage: pnpm tsx scripts/find-org-by-user.ts <user-email>')
    console.error('\nExample:')
    console.error('  pnpm tsx scripts/find-org-by-user.ts user@example.com')
    process.exit(1)
  }

  const email = args[0]

  try {
    await findOrganizationByEmail(email)
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

