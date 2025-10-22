#!/usr/bin/env node

/**
 * Audit script to find organizations with paid subscription tiers
 * but no corresponding Stripe subscription (payment bypass vulnerability)
 *
 * This script identifies accounts that may have exploited the payment bypass bug
 * where users could select paid plans during signup but not complete payment.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { organizations, stripeSubscriptions } from '../lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

// Database connection
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

async function auditUnpaidSubscriptions() {
  console.log('🔍 Starting audit of unpaid subscriptions...\n')

  try {
    // Find all organizations with paid tiers (not 'free')
    const paidTierOrgs = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.subscriptionTier, ['solo', 'team', 'pro', 'business', 'enterprise']))

    console.log(`📊 Found ${paidTierOrgs.length} organizations with paid subscription tiers\n`)

    const unpaidOrgs = []
    const validPaidOrgs = []

    for (const org of paidTierOrgs) {
      // Check if they have a valid Stripe subscription
      const hasStripeSubscription = org.stripeSubscriptionId !== null

      if (!hasStripeSubscription) {
        unpaidOrgs.push(org)
        console.log(`⚠️  UNPAID: ${org.name}`)
        console.log(`   ID: ${org.id}`)
        console.log(`   Tier: ${org.subscriptionTier}`)
        console.log(`   Status: ${org.subscriptionStatus || 'N/A'}`)
        console.log(`   Stripe Customer ID: ${org.stripeCustomerId || 'None'}`)
        console.log(`   Created: ${org.createdAt?.toISOString() || 'Unknown'}`)
        console.log(`   Trial Ends: ${org.trialEndsAt?.toISOString() || 'No trial'}\n`)
      } else {
        // Verify the subscription exists in Stripe records
        const [subscription] = await db
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.stripeSubscriptionId, org.stripeSubscriptionId))
          .limit(1)

        if (!subscription) {
          unpaidOrgs.push(org)
          console.log(`⚠️  MISSING SUBSCRIPTION RECORD: ${org.name}`)
          console.log(`   ID: ${org.id}`)
          console.log(`   Tier: ${org.subscriptionTier}`)
          console.log(`   Stripe Subscription ID: ${org.stripeSubscriptionId} (record not found)\n`)
        } else if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          unpaidOrgs.push(org)
          console.log(`⚠️  INACTIVE SUBSCRIPTION: ${org.name}`)
          console.log(`   ID: ${org.id}`)
          console.log(`   Tier: ${org.subscriptionTier}`)
          console.log(`   Status: ${subscription.status}\n`)
        } else {
          validPaidOrgs.push(org)
        }
      }
    }

    // Summary
    console.log('═'.repeat(80))
    console.log('📋 AUDIT SUMMARY')
    console.log('═'.repeat(80))
    console.log(`Total paid tier organizations: ${paidTierOrgs.length}`)
    console.log(`✅ Valid paid subscriptions: ${validPaidOrgs.length}`)
    console.log(`❌ Unpaid/Invalid subscriptions: ${unpaidOrgs.length}`)
    console.log('═'.repeat(80))

    if (unpaidOrgs.length > 0) {
      console.log('\n⚠️  ACTION REQUIRED:')
      console.log('The following organizations should be downgraded to free tier:\n')

      for (const org of unpaidOrgs) {
        console.log(`• ${org.name} (${org.id}) - ${org.subscriptionTier}`)
      }

      console.log('\n🔧 To automatically downgrade these accounts, run:')
      console.log('   node scripts/downgrade-unpaid-accounts.mjs')
    } else {
      console.log('\n✅ All paid subscriptions are valid!')
    }

  } catch (error) {
    console.error('❌ Audit failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Run the audit
auditUnpaidSubscriptions()
  .then(() => {
    console.log('\n✅ Audit complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Audit failed:', error)
    process.exit(1)
  })
