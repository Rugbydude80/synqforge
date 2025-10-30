#!/usr/bin/env tsx
/**
 * Manual Plan Assignment Script
 * 
 * Allows you to manually assign a plan to an organization by user email
 * Useful for goodwill gestures, temporary upgrades, or testing
 * 
 * Usage:
 *   pnpm tsx scripts/manually-assign-plan.ts <user-email> <plan-name>
 * 
 * Examples:
 *   pnpm tsx scripts/manually-assign-plan.ts user@example.com pro
 *   pnpm tsx scripts/manually-assign-plan.ts user@example.com enterprise
 *   pnpm tsx scripts/manually-assign-plan.ts user@example.com free
 * 
 * Valid plans: free, solo, pro, team, enterprise, admin
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
import { eq } from 'drizzle-orm'
import { getPlanDbValues, mapPlanToLegacyTier } from '../lib/billing/plan-entitlements'

async function findOrganizationByUserEmail(email: string) {
  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    throw new Error(`User not found with email: ${email}`)
  }

  // Find organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization not found for user: ${email}`)
  }

  return { user, org }
}

async function assignPlan(email: string, planName: string) {
  console.log(`\n🔍 Finding organization for user: ${email}`)
  
  const { user, org } = await findOrganizationByUserEmail(email)

  console.log(`\n📋 Current Organization Details:`)
  console.log(`   ID: ${org.id}`)
  console.log(`   Name: ${org.name}`)
  console.log(`   Slug: ${org.slug}`)
  console.log(`   Current Plan: ${org.plan}`)
  console.log(`   Current Tier: ${org.subscriptionTier}`)
  console.log(`   Subscription Status: ${org.subscriptionStatus}`)
  console.log(`   Stripe Customer ID: ${org.stripeCustomerId || 'None'}`)
  console.log(`   User Name: ${user.name || 'N/A'}`)
  console.log(`   User Role: ${user.role}`)

  // Get plan entitlements
  const planValues = getPlanDbValues(planName)

  console.log(`\n📦 Plan Entitlements for "${planName}":`)
  console.log(`   Subscription Tier: ${planValues.subscriptionTier}`)
  console.log(`   Plan: ${planValues.plan}`)
  console.log(`   Seats Included: ${planValues.seatsIncluded === 999999 ? 'Unlimited' : planValues.seatsIncluded}`)
  console.log(`   Projects Included: ${planValues.projectsIncluded === 999999 ? 'Unlimited' : planValues.projectsIncluded}`)
  console.log(`   AI Tokens: ${planValues.aiTokensIncluded === 999999 ? 'Unlimited' : planValues.aiTokensIncluded.toLocaleString()}`)
  console.log(`   Advanced AI: ${planValues.advancedAi ? 'Yes' : 'No'}`)
  console.log(`   Exports: ${planValues.exportsEnabled ? 'Yes' : 'No'}`)
  console.log(`   SSO: ${planValues.ssoEnabled ? 'Yes' : 'No'}`)
  console.log(`   Support Tier: ${planValues.supportTier}`)

  // Confirm before proceeding
  console.log(`\n⚠️  WARNING: This will update the organization's plan manually.`)
  console.log(`   This bypasses Stripe billing and should be used for:`)
  console.log(`   - Goodwill gestures`)
  console.log(`   - Testing purposes`)
  console.log(`   - Temporary upgrades`)
  console.log(`\n   Proceeding will update:`)
  console.log(`   - Plan: ${org.plan} → ${planValues.plan}`)
  console.log(`   - Tier: ${org.subscriptionTier} → ${planValues.subscriptionTier}`)
  console.log(`   - All entitlements and limits`)

  // In a real script, you'd add a confirmation prompt here
  // For now, we'll proceed (you can add readline/prompt if needed)

  // CRITICAL: Ensure plan and tier match
  const expectedTier = mapPlanToLegacyTier(planName)
  const finalPlanValues = {
    ...planValues,
    plan: planName, // Ensure plan uses the actual plan name
    subscriptionTier: expectedTier, // Ensure tier matches plan
    updatedAt: new Date(),
  }

  // Update organization
  await db
    .update(organizations)
    .set(finalPlanValues)
    .where(eq(organizations.id, org.id))

  console.log(`\n✅ Successfully assigned plan "${planName}" to organization!`)
  console.log(`\n📊 Updated Organization:`)
  console.log(`   Plan: ${finalPlanValues.plan}`)
  console.log(`   Tier: ${finalPlanValues.subscriptionTier}`)
  console.log(`   Status: ${planValues.subscriptionStatus}`)
  
  console.log(`\n💡 Note: The user will see these changes immediately on their billing page.`)
  console.log(`   If they have an active Stripe subscription, you may want to:`)
  console.log(`   - Cancel it in Stripe, or`)
  console.log(`   - Let them know this is a manual override`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.error('Usage: pnpm tsx scripts/manually-assign-plan.ts <user-email> <plan-name>')
    console.error('\nValid plans: free, solo, pro, team, enterprise, admin')
    console.error('\nExamples:')
    console.error('  pnpm tsx scripts/manually-assign-plan.ts user@example.com pro')
    console.error('  pnpm tsx scripts/manually-assign-plan.ts user@example.com enterprise')
    process.exit(1)
  }

  const [email, planName] = args

  const validPlans = ['free', 'starter', 'solo', 'core', 'pro', 'team', 'enterprise', 'admin']
  if (!validPlans.includes(planName.toLowerCase())) {
    console.error(`\n❌ Invalid plan: ${planName}`)
    console.error(`Valid plans: ${validPlans.join(', ')}`)
    process.exit(1)
  }

  try {
    await assignPlan(email, planName.toLowerCase())
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

