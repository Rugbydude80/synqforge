/**
 * Add-ons Billing API
 * Handles purchase and management of add-ons
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { addOnPurchases, organizations, subscriptions } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { activateAddon, getActiveAddons } from '@/lib/services/tokenService'

/**
 * GET /api/billing/add-ons
 * List active add-ons for the organization
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const organizationId = req.nextUrl.searchParams.get('organizationId')

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization ID required' },
      { status: 400 }
    )
  }

  try {
    const addons = await getActiveAddons(session.user.id, organizationId)

    return NextResponse.json({
      addons,
      count: addons.length
    })
  } catch (error) {
    console.error('Error fetching add-ons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch add-ons' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/billing/add-ons
 * Purchase a new add-on
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { organizationId, addonType, stripePaymentIntentId, stripePriceId, stripeProductId } = body

    if (!organizationId || !addonType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate organization access
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

    // Get subscription tier to validate eligibility
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1)

    const tier = subscription?.tier || 'starter'

    // Validate add-on eligibility
    if (addonType === 'ai_booster' && tier !== 'starter') {
      return NextResponse.json(
        { error: 'AI Booster is only available for Starter tier' },
        { status: 403 }
      )
    }

    if (addonType === 'ai_actions' && !['core', 'pro', 'team', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'AI Actions Pack is only available for Core, Pro, Team, and Enterprise tiers' },
        { status: 403 }
      )
    }

    // Define add-on credits based on type
    let credits = 0
    let expiryDays = 0
    let addonName = ''

    switch (addonType) {
      case 'ai_actions':
        credits = 1000
        expiryDays = 90
        addonName = 'AI Actions Pack'
        break
      case 'ai_booster':
        credits = 200
        expiryDays = 30 // Monthly recurring
        addonName = 'AI Booster'
        break
      case 'priority_support':
        credits = 0
        expiryDays = 30 // Monthly recurring
        addonName = 'Priority Support Pack'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid add-on type' },
          { status: 400 }
        )
    }

    // Activate the add-on
    const result = await activateAddon(
      session.user.id,
      organizationId,
      addonType,
      credits,
      expiryDays,
      {
        stripePaymentIntentId,
        stripePriceId,
        stripeProductId,
        addonName,
        recurring: addonType !== 'ai_actions'
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      addonId: result.addonId,
      message: `${addonName} activated successfully`
    })
  } catch (error) {
    console.error('Error purchasing add-on:', error)
    return NextResponse.json(
      { error: 'Failed to purchase add-on' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/billing/add-ons/[id]
 * Cancel a recurring add-on
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const addonId = req.nextUrl.searchParams.get('id')

  if (!addonId) {
    return NextResponse.json(
      { error: 'Add-on ID required' },
      { status: 400 }
    )
  }

  try {
    // Get add-on
    const [addon] = await db
      .select()
      .from(addOnPurchases)
      .where(eq(addOnPurchases.id, addonId))
      .limit(1)

    if (!addon) {
      return NextResponse.json(
        { error: 'Add-on not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (addon.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Only allow cancellation of recurring add-ons
    if (!addon.recurring) {
      return NextResponse.json(
        { error: 'Cannot cancel one-time purchases' },
        { status: 400 }
      )
    }

    // Update add-on status
    await db
      .update(addOnPurchases)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(addOnPurchases.id, addonId))

    return NextResponse.json({
      success: true,
      message: 'Add-on cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling add-on:', error)
    return NextResponse.json(
      { error: 'Failed to cancel add-on' },
      { status: 500 }
    )
  }
}
