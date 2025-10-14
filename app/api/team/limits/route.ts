import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSubscriptionLimits, getUserCount } from '@/lib/middleware/subscription'

/**
 * GET /api/team/limits
 * Get current user count and subscription limits
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userContext = {
      id: currentUser.id,
      organizationId: currentUser.organizationId,
      role: currentUser.role || 'member',
    }

    // Get subscription limits
    const limits = await getSubscriptionLimits(userContext)

    // Get current user count
    const currentCount = await getUserCount(currentUser.organizationId)

    // Calculate remaining slots
    const remainingSlots = limits.maxUsers === Infinity
      ? Infinity
      : limits.maxUsers - currentCount

    const canAddMore = limits.maxUsers === Infinity || currentCount < limits.maxUsers

    return NextResponse.json({
      currentCount,
      maxUsers: limits.maxUsers,
      remainingSlots,
      canAddMore,
      subscriptionTier: limits.displayName,
      upgradeRequired: !canAddMore,
    })
  } catch (error: any) {
    console.error('Error fetching team limits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team limits' },
      { status: 500 }
    )
  }
}
