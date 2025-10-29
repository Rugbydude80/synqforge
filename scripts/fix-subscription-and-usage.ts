/**
 * Fix subscription status and initialize usage tracking
 */

import { db, generateId } from '@/lib/db'
import { organizations, aiUsageMetering, workspaceUsage } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

async function fixSubscriptionAndUsage() {
  console.log('='.repeat(80))
  console.log('FIXING SUBSCRIPTION STATUS & INITIALIZING USAGE TRACKING')
  console.log('='.repeat(80))

  try {
    // Get all organizations
    const orgs = await db.select().from(organizations)
    console.log(`\n📊 Found ${orgs.length} organizations to process\n`)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0) // Last day of current month
    monthEnd.setHours(23, 59, 59, 999)

    let fixedCount = 0
    let skippedCount = 0

    for (const org of orgs) {
      console.log(`\nProcessing: ${org.name} (${org.id})`)
      console.log(`  Current Plan: ${org.plan}`)
      console.log(`  Current Status: ${org.subscriptionStatus}`)

      // Determine if subscription should be active
      // Free plan and all other plans should be active unless there's a specific reason they shouldn't be
      let shouldBeActive = false
      
      if (org.plan === 'free') {
        // Free plan is always active
        shouldBeActive = true
      } else if (org.stripeSubscriptionId) {
        // Has a Stripe subscription - keep current status (will be managed by webhooks)
        shouldBeActive = org.subscriptionStatus === 'active'
        console.log(`  ℹ️  Has Stripe subscription - keeping webhook-managed status`)
      } else if (['solo', 'team', 'pro', 'enterprise'].includes(org.plan || '')) {
        // Has a paid plan but no Stripe subscription - this might be a test/demo account
        // Set to active so users can use the app
        shouldBeActive = true
      }

      // Update subscription status if needed
      if (shouldBeActive && org.subscriptionStatus !== 'active') {
        await db
          .update(organizations)
          .set({
            subscriptionStatus: 'active',
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, org.id))
        
        console.log(`  ✅ Updated subscription status to 'active'`)
        fixedCount++
      } else {
        console.log(`  ⏭️  No subscription status change needed`)
        skippedCount++
      }

      // Check if AI usage metering exists for current month
      const [existingMetering] = await db
        .select()
        .from(aiUsageMetering)
        .where(
          and(
            eq(aiUsageMetering.organizationId, org.id),
            eq(aiUsageMetering.billingPeriodStart, monthStart)
          )
        )
        .limit(1)

      if (!existingMetering) {
        // Get token pool based on plan
        const tokenPool = org.aiTokensIncluded || 5000
        
        // Create AI usage metering record
        await db.insert(aiUsageMetering).values({
          id: generateId(),
          organizationId: org.id,
          billingPeriodStart: monthStart,
          billingPeriodEnd: monthEnd,
          tokenPool,
          tokensUsed: 0,
          tokensRemaining: tokenPool,
          overageTokens: 0,
          overageCharges: '0',
          aiActionsCount: 0,
          heavyJobsCount: 0,
          lastResetAt: new Date(),
        })
        
        console.log(`  ✅ Created AI usage metering record (${tokenPool.toLocaleString()} tokens)`)
      } else {
        console.log(`  ⏭️  AI usage metering already exists`)
      }

      // Check if workspace usage exists for current month
      const [existingWorkspace] = await db
        .select()
        .from(workspaceUsage)
        .where(
          and(
            eq(workspaceUsage.organizationId, org.id),
            eq(workspaceUsage.billingPeriodStart, monthStart)
          )
        )
        .limit(1)

      if (!existingWorkspace) {
        // Get token limit based on plan
        const tokensLimit = org.aiTokensIncluded || 5000
        
        // Create workspace usage record
        await db.insert(workspaceUsage).values({
          id: generateId(),
          organizationId: org.id,
          billingPeriodStart: monthStart,
          billingPeriodEnd: monthEnd,
          tokensLimit,
          tokensUsed: 0,
          purchasedTokenBalance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        
        console.log(`  ✅ Created workspace usage record (${tokensLimit.toLocaleString()} token limit)`)
      } else {
        console.log(`  ⏭️  Workspace usage already exists`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('FIX COMPLETE')
    console.log(`✅ Fixed: ${fixedCount} organizations`)
    console.log(`⏭️  Skipped: ${skippedCount} organizations`)
    console.log('='.repeat(80))
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// Run the fix
fixSubscriptionAndUsage()
  .then(() => {
    console.log('\n✅ Fix completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error)
    process.exit(1)
  })

