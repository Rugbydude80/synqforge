#!/usr/bin/env tsx
/**
 * Get User Plan Details
 * 
 * Quick lookup script to see a user's plan and organization details
 * Much faster than looking up org separately
 * 
 * Usage:
 *   pnpm tsx scripts/get-user-plan.ts <user-email>
 * 
 * Example:
 *   pnpm tsx scripts/get-user-plan.ts user@example.com
 */

import { db } from '../lib/db'
import { organizations, users } from '../lib/db/schema'
import { eq, sql } from 'drizzle-orm'

async function getUserPlan(email: string) {
  console.log(`\n🔍 Looking up user: ${email}\n`)

  const [result] = await db
    .select({
      // User info
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      
      // Organization info
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      
      // Plan info
      plan: organizations.plan,
      tier: organizations.subscriptionTier,
      planCycle: organizations.planCycle,
      subscriptionStatus: organizations.subscriptionStatus,
      subscriptionRenewalAt: organizations.subscriptionRenewalAt,
      
      // Entitlements
      seatsIncluded: organizations.seatsIncluded,
      projectsIncluded: organizations.projectsIncluded,
      aiTokensIncluded: organizations.aiTokensIncluded,
      advancedAi: organizations.advancedAi,
      exportsEnabled: organizations.exportsEnabled,
      templatesEnabled: organizations.templatesEnabled,
      ssoEnabled: organizations.ssoEnabled,
      supportTier: organizations.supportTier,
      
      // Stripe
      stripeCustomerId: organizations.stripeCustomerId,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
      
      // Stats
      userCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${users} 
        WHERE ${users.organizationId} = ${organizations.id}
      )`,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, email))
    .limit(1)

  if (!result) {
    console.error(`❌ User not found with email: ${email}`)
    console.error(`\n💡 Try searching with:`)
    console.error(`   pnpm tsx scripts/list-users-with-plans.ts ${email.split('@')[0]}`)
    process.exit(1)
  }

  console.log(`✅ Found User & Plan Info!\n`)
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`👤 USER INFORMATION`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   ID:            ${result.userId}`)
  console.log(`   Email:         ${result.email}`)
  console.log(`   Name:          ${result.name || 'N/A'}`)
  console.log(`   Role:          ${result.role}`)
  console.log(`   Active:        ${result.isActive ? 'Yes' : 'No'}`)
  console.log(`   Created:       ${result.createdAt?.toLocaleString() || 'N/A'}`)
  console.log(`   Last Active:   ${result.lastActiveAt?.toLocaleString() || 'Never'}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📦 PLAN INFORMATION`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Plan:          ${result.plan}`)
  console.log(`   Tier:          ${result.tier}`)
  console.log(`   Cycle:         ${result.planCycle}`)
  console.log(`   Status:        ${result.subscriptionStatus}`)
  console.log(`   Renewal Date:  ${result.subscriptionRenewalAt ? result.subscriptionRenewalAt.toLocaleString() : 'N/A'}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🏢 ORGANIZATION`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   ID:            ${result.organizationId}`)
  console.log(`   Name:          ${result.organizationName}`)
  console.log(`   Slug:          ${result.organizationSlug}`)
  console.log(`   Total Users:   ${result.userCount}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`⚙️  ENTITLEMENTS`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Seats:         ${result.seatsIncluded === 999999 ? 'Unlimited' : result.seatsIncluded}`)
  console.log(`   Projects:      ${result.projectsIncluded === 999999 ? 'Unlimited' : result.projectsIncluded}`)
  console.log(`   AI Tokens:     ${result.aiTokensIncluded === 999999 ? 'Unlimited' : result.aiTokensIncluded.toLocaleString()}`)
  console.log(`   Advanced AI:   ${result.advancedAi ? 'Yes' : 'No'}`)
  console.log(`   Exports:       ${result.exportsEnabled ? 'Yes' : 'No'}`)
  console.log(`   Templates:     ${result.templatesEnabled ? 'Yes' : 'No'}`)
  console.log(`   SSO:           ${result.ssoEnabled ? 'Yes' : 'No'}`)
  console.log(`   Support:       ${result.supportTier}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`💳 STRIPE`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Customer ID:   ${result.stripeCustomerId || 'None'}`)
  console.log(`   Subscription:  ${result.stripeSubscriptionId || 'None'}`)
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\n💡 Quick Actions:`)
  console.log(`   Change plan:   pnpm tsx scripts/manually-assign-plan.ts ${email} <plan-name>`)
  console.log(`   See all users:  pnpm tsx scripts/list-users-with-plans.ts`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    console.error('Usage: pnpm tsx scripts/get-user-plan.ts <user-email>')
    console.error('\nExample:')
    console.error('  pnpm tsx scripts/get-user-plan.ts user@example.com')
    process.exit(1)
  }

  const email = args[0]

  try {
    await getUserPlan(email)
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

