import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { and, eq, lt, sql } from 'drizzle-orm'

/**
 * GET /api/cron/expire-trials
 * 
 * Cron job to automatically expire trials and mark subscriptions as inactive
 * Should be called daily via Vercel Cron or external scheduler
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-trials",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Running trial expiration cron job...')

    // Find all organizations with expired trials that are still marked as active
    const expiredOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        plan: organizations.plan,
        trialEndsAt: organizations.trialEndsAt,
        subscriptionStatus: organizations.subscriptionStatus,
      })
      .from(organizations)
      .where(
        and(
          // Trial has ended
          lt(organizations.trialEndsAt, new Date()),
          // Still marked as active (not already processed)
          eq(organizations.subscriptionStatus, 'active'),
          // No Stripe subscription ID (meaning they're on trial, not paid)
          sql`${organizations.stripeSubscriptionId} IS NULL`
        )
      )

    console.log(`Found ${expiredOrgs.length} organizations with expired trials`)

    if (expiredOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired trials to process',
        processed: 0,
      })
    }

    // Update all expired organizations to inactive status
    const orgIds = expiredOrgs.map(org => org.id)
    
    await db
      .update(organizations)
      .set({
        subscriptionStatus: 'inactive',
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${organizations.id} = ANY(${orgIds})`,
          eq(organizations.subscriptionStatus, 'active')
        )
      )

    console.log(`✅ Updated ${expiredOrgs.length} organizations to inactive status`)
    
    // Log details for monitoring
    expiredOrgs.forEach(org => {
      console.log(`  - ${org.name} (${org.plan}): trial ended ${org.trialEndsAt}`)
    })

    return NextResponse.json({
      success: true,
      message: `Successfully expired ${expiredOrgs.length} trials`,
      processed: expiredOrgs.length,
      organizations: expiredOrgs.map(org => ({
        id: org.id,
        name: org.name,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt,
      })),
    })
  } catch (error) {
    console.error('❌ Error expiring trials:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

