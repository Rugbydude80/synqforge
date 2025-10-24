import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { addOnPurchases } from '@/lib/db/schema'
import { and, eq, lt } from 'drizzle-orm'

/**
 * GET /api/cron/expire-addons
 * 
 * Cron job to automatically expire add-on purchases that have passed their expiry date
 * Should be called daily via Vercel Cron or external scheduler
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-addons",
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

    console.log('🔄 Running add-on expiration cron job...')

    const now = new Date()

    // Find all active add-ons that have passed their expiry date
    const expiredAddOns = await db
      .select({
        id: addOnPurchases.id,
        organizationId: addOnPurchases.organizationId,
        userId: addOnPurchases.userId,
        addonType: addOnPurchases.addonType,
        addonName: addOnPurchases.addonName,
        creditsRemaining: addOnPurchases.creditsRemaining,
        expiresAt: addOnPurchases.expiresAt,
        purchasedAt: addOnPurchases.purchasedAt,
      })
      .from(addOnPurchases)
      .where(
        and(
          // Has an expiry date set
          lt(addOnPurchases.expiresAt, now),
          // Still marked as active
          eq(addOnPurchases.status, 'active')
        )
      )

    console.log(`Found ${expiredAddOns.length} expired add-ons`)

    if (expiredAddOns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired add-ons to process',
        processed: 0,
      })
    }

    // Update all expired add-ons to expired status
    await db
      .update(addOnPurchases)
      .set({
        status: 'expired',
        creditsRemaining: 0, // Remove unused credits
        updatedAt: now,
      })
      .where(
        and(
          eq(addOnPurchases.status, 'active'),
          lt(addOnPurchases.expiresAt, now)
        )
      )

    console.log(`✅ Updated ${expiredAddOns.length} add-ons to expired status`)
    
    // Calculate total credits removed
    const totalCreditsRemoved = expiredAddOns.reduce(
      (sum, addOn) => sum + (addOn.creditsRemaining || 0), 
      0
    )

    // Log details for monitoring
    expiredAddOns.forEach(addOn => {
      console.log(
        `  - ${addOn.addonName} (${addOn.addonType}): expired ${addOn.expiresAt}, removed ${addOn.creditsRemaining} credits`
      )
    })

    // TODO: Send email notifications to affected users
    // For each expired add-on, notify the user about the expiration
    // and suggest renewal if appropriate

    return NextResponse.json({
      success: true,
      message: `Successfully expired ${expiredAddOns.length} add-ons`,
      processed: expiredAddOns.length,
      totalCreditsRemoved,
      addOns: expiredAddOns.map(addOn => ({
        id: addOn.id,
        organizationId: addOn.organizationId,
        userId: addOn.userId,
        type: addOn.addonType,
        name: addOn.addonName,
        creditsRemoved: addOn.creditsRemaining,
        expiresAt: addOn.expiresAt,
        purchasedAt: addOn.purchasedAt,
      })),
    })
  } catch (error) {
    console.error('❌ Error expiring add-ons:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

