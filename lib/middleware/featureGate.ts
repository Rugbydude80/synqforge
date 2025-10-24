/**
 * Feature Gate Middleware
 * Controls access to features based on subscription tier
 * Includes "Coming Soon" flags for unreleased features
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { SUBSCRIPTION_LIMITS, COMING_SOON_FEATURES } from '@/lib/constants'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface FeatureGateResult {
  allowed: boolean
  comingSoon?: boolean
  message?: string
  tier?: string
  releaseQuarter?: string
  upgradeRequired?: string
}

export type FeatureKey = keyof typeof SUBSCRIPTION_LIMITS.starter

/**
 * Check if a feature is available for the user's tier
 */
export async function requireFeature(
  userId: string,
  organizationId: string,
  feature: FeatureKey
): Promise<FeatureGateResult> {
  try {
    // Get user's organization subscription
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return {
        allowed: false,
        message: 'Organization not found'
      }
    }

    // Get tier from organization
    const tier = org.subscriptionTier || 'starter'
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]

    if (!limits) {
      return {
        allowed: false,
        message: 'Invalid subscription tier',
        tier
      }
    }

    // Check if feature exists in limits
    const featureValue = (limits as any)[feature]

    // Check for coming soon features
    if (feature === 'canUseAPI' && !featureValue) {
      return {
        allowed: false,
        comingSoon: true,
        message: COMING_SOON_FEATURES.API_INTEGRATIONS.message,
        releaseQuarter: COMING_SOON_FEATURES.API_INTEGRATIONS.releaseQuarter,
        tier
      }
    }

    // Boolean features
    if (typeof featureValue === 'boolean') {
      return {
        allowed: featureValue,
        message: featureValue 
          ? 'Feature available' 
          : `This feature requires ${getRequiredTier(feature)} plan or higher`,
        tier,
        upgradeRequired: !featureValue ? getRequiredTier(feature) : undefined
      }
    }

    // Numeric features (limits)
    if (typeof featureValue === 'number') {
      return {
        allowed: featureValue > 0,
        message: `${feature} limit: ${featureValue}`,
        tier
      }
    }

    // Feature not found in limits
    return {
      allowed: false,
      message: 'Feature not available',
      tier
    }
  } catch (error) {
    console.error('Error checking feature gate:', error)
    return {
      allowed: false,
      message: 'Error checking feature access'
    }
  }
}

/**
 * Get the minimum tier required for a feature
 */
function getRequiredTier(feature: FeatureKey): string {
  const tiers = ['starter', 'core', 'pro', 'team', 'enterprise']
  
  for (const tier of tiers) {
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]
    if (limits && (limits as any)[feature]) {
      return tier
    }
  }
  
  return 'enterprise'
}

/**
 * Middleware factory for API routes
 */
export function withFeatureGate(feature: FeatureKey) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get organization ID from request (could be query param, body, or header)
    const organizationId = 
      req.nextUrl.searchParams.get('organizationId') ||
      req.headers.get('x-organization-id')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    const result = await requireFeature(
      session.user.id,
      organizationId,
      feature
    )

    if (result.comingSoon) {
      return NextResponse.json(
        {
          status: 'coming_soon',
          message: result.message,
          releaseQuarter: result.releaseQuarter,
          features: COMING_SOON_FEATURES.API_INTEGRATIONS.features
        },
        { status: 403 }
      )
    }

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          message: result.message,
          tier: result.tier,
          upgradeRequired: result.upgradeRequired
        },
        { status: 403 }
      )
    }

    return null // Feature allowed, continue
  }
}

/**
 * Check multiple features at once
 */
export async function requireFeatures(
  userId: string,
  organizationId: string,
  features: FeatureKey[]
): Promise<{ [key: string]: FeatureGateResult }> {
  const results: { [key: string]: FeatureGateResult } = {}

  for (const feature of features) {
    results[feature] = await requireFeature(userId, organizationId, feature)
  }

  return results
}

/**
 * Get all features available for a tier
 */
export function getTierFeatures(tier: string): { [key: string]: any } {
  const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]
  if (!limits) return {}

  const features: { [key: string]: any } = {}

  // Extract boolean features
  Object.keys(limits).forEach(key => {
    if (key.startsWith('can')) {
      features[key] = (limits as any)[key]
    }
  })

  return features
}

/**
 * Check if user can perform an action based on rate limits
 */
export async function checkRateLimit(
  userId: string,
  organizationId: string,
  limitType: 'aiActionsPerMinute' | 'heavyJobsPerMinute'
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  try {
    // Get subscription tier
    // Get organization to check tier
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)
    
    const tier = org?.subscriptionTier || 'starter'
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]

    if (!limits) {
      return { allowed: false, limit: 0, remaining: 0 }
    }

    const rateLimit = (limits as any)[limitType] || 0

    // TODO: Implement actual rate limiting logic with Redis or similar
    // For now, just return the limit
    return {
      allowed: true,
      limit: rateLimit,
      remaining: rateLimit
    }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    return { allowed: false, limit: 0, remaining: 0 }
  }
}
