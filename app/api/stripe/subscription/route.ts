import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { stripeSubscriptions, organizations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

/**
 * GET /api/stripe/subscription
 * Get current subscription for the user's organization
 */
async function getSubscription(_req: NextRequest, context: any) {
  try {
    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, context.user.organizationId))
      .limit(1)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get active subscription
    const [subscription] = await db
      .select()
      .from(stripeSubscriptions)
      .where(
        and(
          eq(stripeSubscriptions.organizationId, organization.id),
          eq(stripeSubscriptions.status, 'active')
        )
      )
      .orderBy(desc(stripeSubscriptions.createdAt))
      .limit(1)

    if (!subscription) {
      // Return organization tier info if no active subscription
      return NextResponse.json({
        tier: organization.subscriptionTier,
        status: 'free',
      })
    }

    return NextResponse.json({
      id: subscription.id,
      tier: organization.subscriptionTier,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
    })
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getSubscription)
