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
 */

import { db } from '../lib/db'
import { organizations, users } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { getPlanDbValues } from '../lib/billing/plan-entitlements'

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

  // Update organization
  await db
    .update(organizations)
    .set({
      ...planValues,
      updatedAt: new Date(),
      // Note: We DON'T clear Stripe fields for manual assignments
      // This allows Stripe to override if needed, but manual takes precedence
    })
    .where(eq(organizations.id, org.id))

  console.log(`\n✅ Successfully assigned plan "${planName}" to organization!`)
  console.log(`\n📊 Updated Organization:`)
  console.log(`   Plan: ${planValues.plan}`)
  console.log(`   Tier: ${planValues.subscriptionTier}`)
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

