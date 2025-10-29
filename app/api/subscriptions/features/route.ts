/**
 * Feature Access Endpoint
 * 
 * Returns feature flags for an organization based on their subscription tier.
 * Used for frontend feature gating (Smart Context, Deep Reasoning, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { checkFeatureAccess, getOrganizationTier } from '@/lib/services/subscription-tier.service'

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get organization ID from query params
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId') || searchParams.get('orgId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'organizationId parameter required' },
        { status: 400 }
      )
    }

    // 3. Verify user belongs to organization
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, session.user.email),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 4. Get feature access from service layer
    const features = await checkFeatureAccess(organizationId)
    const tier = await getOrganizationTier(organizationId)

    // 5. Return feature flags
    return NextResponse.json({
      organizationId,
      tier,
      features: {
        hasSmartContext: features.hasSmartContext,
        hasDeepReasoning: features.hasDeepReasoning,
        hasSemanticSearch: features.hasSemanticSearch,
        canSplitToChildren: features.canSplitToChildren,
        hasAdvancedGherkin: features.hasAdvancedGherkin,
        canAccessPremium: features.canAccessPremium,
      },
      limits: {
        maxStoryChildren: tier === 'starter' ? 2 : tier === 'core' ? 3 : 999,
        canUseSmartContext: features.hasSmartContext,
        canUseDeepReasoning: features.hasDeepReasoning,
      }
    })

  } catch (error) {
    console.error('[features] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch feature access'
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

