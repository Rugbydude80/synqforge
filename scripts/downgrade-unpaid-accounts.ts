#!/usr/bin/env node

/**
 * Downgrade script to reset organizations with paid tiers but no valid Stripe subscription
 * back to the free tier
 *
 * This script fixes accounts that exploited the payment bypass vulnerability
 *
 * Usage:
 *   node scripts/downgrade-unpaid-accounts.mjs           # Dry run (preview only)
 *   node scripts/downgrade-unpaid-accounts.mjs --execute # Actually perform downgrades
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { organizations, stripeSubscriptions } from '../lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

// Parse command line arguments
const args = process.argv.slice(2)
const shouldExecute = args.includes('--execute')

// Database connection
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

// Free tier entitlements
const FREE_TIER_ENTITLEMENTS = {
  subscriptionTier: 'free',
  subscriptionStatus: 'inactive',
  stripeSubscriptionId: null,
  stripePriceId: null,
  stripeCustomerId: null,
  subscriptionRenewalAt: null,
  // Free tier limits
  seatsIncluded: 1,
  projectsIncluded: 1,
  storiesPerMonth: 50,
  aiTokensIncluded: 5000,
  docsPerMonth: 2,
  throughputSpm: 5,
  bulkStoryLimit: 10,
  maxPagesPerUpload: 50,
}

async function downgradeUnpaidAccounts() {
  console.log(shouldExecute ? '🔧 Downgrading unpaid accounts...' : '🔍 DRY RUN - Preview only (use --execute to apply changes)')
  console.log()

  try {
    // Find all organizations with paid tiers
    const paidTierOrgs = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.subscriptionTier, ['solo', 'team', 'pro', 'business', 'enterprise']))

    console.log(`📊 Found ${paidTierOrgs.length} organizations with paid subscription tiers\n`)

    const toDowngrade = []

    for (const org of paidTierOrgs) {
      // Check if they have a valid Stripe subscription
      const hasStripeSubscription = org.stripeSubscriptionId !== null
      let shouldDowngrade = false
      let reason = ''

      if (!hasStripeSubscription) {
        shouldDowngrade = true
        reason = 'No Stripe subscription ID'
      } else {
        // Verify the subscription exists and is active
        const [subscription] = await db
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.stripeSubscriptionId, org.stripeSubscriptionId))
          .limit(1)

        if (!subscription) {
          shouldDowngrade = true
          reason = 'Stripe subscription record not found'
        } else if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          shouldDowngrade = true
          reason = `Subscription status: ${subscription.status}`
        }
      }

      if (shouldDowngrade) {
        toDowngrade.push({ org, reason })
        console.log(`${shouldExecute ? '⬇️ ' : '📋 '}${org.name}`)
        console.log(`   ID: ${org.id}`)
        console.log(`   Current Tier: ${org.subscriptionTier}`)
        console.log(`   Reason: ${reason}`)
        console.log(`   ${shouldExecute ? 'Status: DOWNGRADING TO FREE' : 'Would be downgraded to: free'}\n`)
      }
    }

    if (toDowngrade.length === 0) {
      console.log('✅ No accounts need to be downgraded!')
      return
    }

    console.log('═'.repeat(80))
    console.log(`${shouldExecute ? '🔧 DOWNGRADING' : '📋 WOULD DOWNGRADE'} ${toDowngrade.length} ACCOUNTS`)
    console.log('═'.repeat(80))

    if (shouldExecute) {
      console.log('\n⏳ Applying downgrades...\n')

      for (const { org, reason } of toDowngrade) {
        try {
          await db
            .update(organizations)
            .set({
              ...FREE_TIER_ENTITLEMENTS,
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, org.id))

          console.log(`✅ Downgraded: ${org.name} (${reason})`)
        } catch (error) {
          console.error(`❌ Failed to downgrade ${org.name}:`, error.message)
        }
      }

      console.log('\n✅ Downgrade complete!')
    } else {
      console.log('\n⚠️  This was a DRY RUN - no changes were made')
      console.log('To actually downgrade these accounts, run:')
      console.log('   node scripts/downgrade-unpaid-accounts.mjs --execute')
    }

  } catch (error) {
    console.error('❌ Downgrade failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Run the downgrade
downgradeUnpaidAccounts()
  .then(() => {
    console.log(`\n${shouldExecute ? '✅' : '👀'} Process complete`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error)
    process.exit(1)
  })
