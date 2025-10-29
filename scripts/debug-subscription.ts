/**
 * Debug script to check subscription and usage data
 */

import { db } from '@/lib/db'
import { organizations, users, aiUsageMetering, workspaceUsage, aiGenerations } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

async function debugSubscription() {
  console.log('='.repeat(80))
  console.log('SUBSCRIPTION & USAGE DEBUG')
  console.log('='.repeat(80))

  try {
    // Get all organizations
    const orgs = await db.select().from(organizations)
    console.log('\n📊 ORGANIZATIONS:')
    for (const org of orgs) {
      console.log(`\n  Organization: ${org.name} (${org.id})`)
      console.log(`    Plan: ${org.plan}`)
      console.log(`    Plan Cycle: ${org.planCycle}`)
      console.log(`    Subscription Status: ${org.subscriptionStatus}`)
      console.log(`    Subscription Tier (legacy): ${org.subscriptionTier}`)
      console.log(`    Subscription Renewal: ${org.subscriptionRenewalAt}`)
      console.log(`    Stripe Customer ID: ${org.stripeCustomerId}`)
      console.log(`    Stripe Subscription ID: ${org.stripeSubscriptionId}`)
      console.log(`    Stripe Price ID: ${org.stripePriceId}`)
      console.log(`\n    Entitlements:`)
      console.log(`      - Seats: ${org.seatsIncluded}`)
      console.log(`      - Projects: ${org.projectsIncluded}`)
      console.log(`      - Stories/Month: ${org.storiesPerMonth}`)
      console.log(`      - AI Tokens: ${org.aiTokensIncluded}`)
      console.log(`      - Advanced AI: ${org.advancedAi}`)
      console.log(`      - Exports: ${org.exportsEnabled}`)
      console.log(`      - Templates: ${org.templatesEnabled}`)

      // Get users in this org
      const orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, org.id))
      console.log(`\n    Users: ${orgUsers.length}`)
      for (const user of orgUsers) {
        console.log(`      - ${user.name} (${user.email}) - Active: ${user.isActive}`)
      }

      // Get AI usage metering for current billing period
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const [aiMetering] = await db
        .select()
        .from(aiUsageMetering)
        .where(
          and(
            eq(aiUsageMetering.organizationId, org.id),
            eq(aiUsageMetering.billingPeriodStart, monthStart)
          )
        )
        .limit(1)

      console.log(`\n    AI Usage Metering (current month):`)
      if (aiMetering) {
        console.log(`      - Token Pool: ${aiMetering.tokenPool}`)
        console.log(`      - Tokens Used: ${aiMetering.tokensUsed}`)
        console.log(`      - Tokens Remaining: ${aiMetering.tokensRemaining}`)
        console.log(`      - Overage Tokens: ${aiMetering.overageTokens}`)
        console.log(`      - AI Actions Count: ${aiMetering.aiActionsCount}`)
        console.log(`      - Heavy Jobs Count: ${aiMetering.heavyJobsCount}`)
        console.log(`      - Billing Period: ${aiMetering.billingPeriodStart} to ${aiMetering.billingPeriodEnd}`)
      } else {
        console.log(`      ⚠️  No AI usage metering record found for current month!`)
      }

      // Get workspace usage
      const [wsUsage] = await db
        .select()
        .from(workspaceUsage)
        .where(
          and(
            eq(workspaceUsage.organizationId, org.id),
            eq(workspaceUsage.billingPeriodStart, monthStart)
          )
        )
        .limit(1)

      console.log(`\n    Workspace Usage (current month):`)
      if (wsUsage) {
        console.log(`      - Tokens Limit: ${wsUsage.tokensLimit}`)
        console.log(`      - Tokens Used: ${wsUsage.tokensUsed}`)
        console.log(`      - Purchased Token Balance: ${wsUsage.purchasedTokenBalance}`)
        console.log(`      - Billing Period: ${wsUsage.billingPeriodStart} to ${wsUsage.billingPeriodEnd}`)
      } else {
        console.log(`      ⚠️  No workspace usage record found for current month!`)
      }

      // Get AI generations count for this month
      const [generationStats] = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalTokens: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)`,
        })
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.organizationId, org.id),
            gte(aiGenerations.createdAt, monthStart)
          )
        )

      console.log(`\n    AI Generations (current month):`)
      console.log(`      - Total Generations: ${generationStats?.count || 0}`)
      console.log(`      - Total Tokens: ${generationStats?.totalTokens || 0}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('DEBUG COMPLETE')
    console.log('='.repeat(80))
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// Run the debug
debugSubscription()
  .then(() => {
    console.log('\n✅ Debug completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error)
    process.exit(1)
  })

