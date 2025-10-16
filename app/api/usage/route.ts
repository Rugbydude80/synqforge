import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { getOrCreateUsageMetering } from '@/lib/services/ai-metering.service'
import { getOrganizationSeats } from '@/lib/services/seat-management.service'
import { getAIQuota } from '@/lib/services/ai-rate-limit.service'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/usage
 * Get current usage information for the organization
 */
async function getUsage(req: NextRequest, context: any) {
  try {
    const organizationId = context.user.organizationId

    // Get organization details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const tier = org.subscriptionTier || 'free'

    // Get AI usage metering
    const aiUsage = await getOrCreateUsageMetering(organizationId)

    // Get seat information
    const seatInfo = await getOrganizationSeats(organizationId)

    // Get rate limit quotas
    const rateLimitQuota = await getAIQuota(organizationId, tier)

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        tier,
      },
      aiUsage: aiUsage
        ? {
            tokenPool: aiUsage.tokenPool,
            tokensUsed: aiUsage.tokensUsed,
            tokensRemaining: aiUsage.tokensRemaining,
            overageTokens: aiUsage.overageTokens,
            overageCharges: aiUsage.overageCharges,
            usagePercentage: aiUsage.usagePercentage,
            aiActionsCount: aiUsage.aiActionsCount,
            heavyJobsCount: aiUsage.heavyJobsCount,
            billingPeriodStart: aiUsage.billingPeriodStart,
            billingPeriodEnd: aiUsage.billingPeriodEnd,
            isOverage: aiUsage.isOverage,
          }
        : null,
      seats: seatInfo
        ? {
            includedSeats: seatInfo.includedSeats,
            addonSeats: seatInfo.addonSeats,
            activeSeats: seatInfo.activeSeats,
            pendingInvites: seatInfo.pendingInvites,
            totalAvailableSeats: seatInfo.totalAvailableSeats,
            usedSeats: seatInfo.usedSeats,
            availableSeats: seatInfo.availableSeats,
            seatPrice: seatInfo.seatPrice,
            monthlyCost: seatInfo.monthlyCost,
          }
        : null,
      rateLimit: {
        standard: rateLimitQuota.standard,
        heavy: rateLimitQuota.heavy,
      },
    })
  } catch (error: any) {
    console.error('Error fetching usage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getUsage)
