/**
 * Feature Gate Middleware
 * Server-side feature gating based on subscription tier
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSubscriptionFeatures, SubscriptionFeatures } from '@/lib/utils/subscription'

export interface FeatureGateContext {
  user: {
    id: string
    email: string
    name: string | null
    organizationId: string
    role: string
  }
  organization: {
    id: string
    name: string
    tier: 'free' | 'team' | 'business' | 'enterprise'
  }
  features: SubscriptionFeatures
}

/**
 * Check if user has access to a specific feature
 */
export async function checkFeatureAccess(
  featureName: keyof SubscriptionFeatures
): Promise<{
  allowed: boolean
  context?: FeatureGateContext
  reason?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return {
        allowed: false,
        reason: 'Not authenticated',
      }
    }

    // Get user with organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
      }
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!organization) {
      return {
        allowed: false,
        reason: 'Organization not found',
      }
    }

    const tier = organization.subscriptionTier || 'free'
    const features = getSubscriptionFeatures(tier)

    const context: FeatureGateContext = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.role || 'member',
      },
      organization: {
        id: organization.id,
        name: organization.name,
        tier,
      },
      features,
    }

    const hasAccess = features[featureName]

    if (!hasAccess) {
      return {
        allowed: false,
        context,
        reason: `Feature '${featureName}' not available on ${tier} plan`,
      }
    }

    return {
      allowed: true,
      context,
    }
  } catch (error) {
    console.error('Error checking feature access:', error)
    return {
      allowed: false,
      reason: 'Internal error',
    }
  }
}

/**
 * Feature gate middleware factory
 * Use this to protect API routes that require specific features
 */
export function withFeatureGate(
  featureName: keyof SubscriptionFeatures,
  handler: (req: NextRequest, context: FeatureGateContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const access = await checkFeatureAccess(featureName)

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          reason: access.reason,
          feature: featureName,
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    return handler(req, access.context!)
  }
}

/**
 * Check multiple features at once
 */
export async function checkMultipleFeatures(
  features: (keyof SubscriptionFeatures)[]
): Promise<{
  allowed: boolean
  context?: FeatureGateContext
  deniedFeatures: string[]
}> {
  const access = await checkFeatureAccess(features[0])

  if (!access.context) {
    return {
      allowed: false,
      deniedFeatures: features,
    }
  }

  const deniedFeatures: string[] = []

  for (const feature of features) {
    if (!access.context.features[feature]) {
      deniedFeatures.push(feature)
    }
  }

  return {
    allowed: deniedFeatures.length === 0,
    context: access.context,
    deniedFeatures,
  }
}

/**
 * Role-based access control check
 */
export function hasRole(
  context: FeatureGateContext,
  allowedRoles: ('owner' | 'admin' | 'member' | 'viewer')[]
): boolean {
  return allowedRoles.includes(context.user.role as any)
}

/**
 * Combined feature + role gate
 */
export function withFeatureAndRoleGate(
  featureName: keyof SubscriptionFeatures,
  allowedRoles: ('owner' | 'admin' | 'member' | 'viewer')[],
  handler: (req: NextRequest, context: FeatureGateContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const access = await checkFeatureAccess(featureName)

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          reason: access.reason,
          feature: featureName,
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    if (!hasRole(access.context!, allowedRoles)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          reason: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          requiredRoles: allowedRoles,
          userRole: access.context!.user.role,
        },
        { status: 403 }
      )
    }

    return handler(req, access.context!)
  }
}

/**
 * Get feature gate context without checking a specific feature
 * Useful for getting user/org info in any protected route
 */
export async function getFeatureGateContext(): Promise<FeatureGateContext | null> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return null
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return null
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!organization) {
      return null
    }

    const tier = organization.subscriptionTier || 'free'
    const features = getSubscriptionFeatures(tier)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.role || 'member',
      },
      organization: {
        id: organization.id,
        name: organization.name,
        tier,
      },
      features,
    }
  } catch (error) {
    console.error('Error getting feature gate context:', error)
    return null
  }
}
