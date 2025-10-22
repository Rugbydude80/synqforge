import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { entitlementsToDbValues, getFreeTierEntitlements } from '@/lib/billing/entitlements'

/**
 * POST /api/organizations/downgrade-to-free
 * Downgrade the current user's organization to the free plan
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify user is owner or admin
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only owners and admins can manage subscriptions' },
        { status: 403 }
      )
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get free tier entitlements
    const freeEntitlements = getFreeTierEntitlements()
    const dbValues = entitlementsToDbValues(freeEntitlements)

    // Set trial end date to 7 days from now for free plan
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    // Update organization to free tier
    await db
      .update(organizations)
      .set({
        subscriptionTier: 'free',
        ...dbValues,
        subscriptionStatus: 'active', // Free plan is always active
        trialEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organization.id))

    return NextResponse.json({
      success: true,
      message: 'Organization downgraded to free plan',
    })
  } catch (error) {
    console.error('Error downgrading organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

