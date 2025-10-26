/**
 * Subscription Guard Middleware
 * 
 * Enforces subscription tier requirements for protected features.
 * Use this in API routes to ensure users have proper subscription tier.
 * 
 * For Edge Runtime (middleware), use subscription-guard-edge.ts instead.
 */

import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import type { UserContext } from './auth'

export type SubscriptionTier = 'free' | 'starter' | 'core' | 'pro' | 'team' | 'enterprise'

export interface SubscriptionCheckResult {
  hasAccess: boolean
  reason?: string
  currentTier: SubscriptionTier
  requiredTier: SubscriptionTier
  upgradeUrl?: string
}

/**
 * Tier hierarchy for access checks
 * Higher number = higher tier
 */
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 0,  // Same as free
  core: 1,
  pro: 2,
  team: 3,
  enterprise: 4,
}

/**
 * Check if user's subscription tier meets the required tier
 */
export async function checkSubscriptionTier(
  organizationId: string,
  requiredTier: SubscriptionTier
): Promise<SubscriptionCheckResult> {
  try {
    const [org] = await db
      .select({
        subscriptionTier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        trialEndsAt: organizations.trialEndsAt,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return {
        hasAccess: false,
        reason: 'Organization not found',
        currentTier: 'free',
        requiredTier,
      }
    }

    const currentTier = (org.subscriptionTier || 'free') as SubscriptionTier

    // Check if subscription is active
    const isActive = org.subscriptionStatus === 'active' || 
                     org.subscriptionStatus === 'trialing'

    // Check if trial has expired
    const trialExpired = org.trialEndsAt && new Date(org.trialEndsAt) < new Date()

    // If subscription is not active or trial expired, can only use free tier
    if (!isActive || trialExpired) {
      if (requiredTier !== 'free' && requiredTier !== 'starter') {
        return {
          hasAccess: false,
          reason: trialExpired 
            ? 'Your trial has expired. Please upgrade to continue using this feature.'
            : 'Active subscription required for this feature',
          currentTier: 'free',
          requiredTier,
          upgradeUrl: '/settings/billing',
        }
      }
    }

    // Check tier hierarchy
    const currentLevel = TIER_HIERARCHY[currentTier] || 0
    const requiredLevel = TIER_HIERARCHY[requiredTier] || 0

    if (currentLevel < requiredLevel) {
      return {
        hasAccess: false,
        reason: `This feature requires ${requiredTier} plan or higher. Your current plan is ${currentTier}.`,
        currentTier,
        requiredTier,
        upgradeUrl: '/settings/billing',
      }
    }

    return {
      hasAccess: true,
      currentTier,
      requiredTier,
    }
  } catch (error) {
    console.error('Error checking subscription tier:', error)
    return {
      hasAccess: false,
      reason: 'Error validating subscription',
      currentTier: 'free',
      requiredTier,
    }
  }
}

/**
 * Check if feature is enabled for organization's subscription
 */
export async function checkFeatureAccess(
  organizationId: string,
  feature: 'advancedAi' | 'exportsEnabled' | 'templatesEnabled' | 'ssoEnabled'
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    const [org] = await db
      .select({
        [feature]: organizations[feature],
        subscriptionTier: organizations.subscriptionTier,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return {
        hasAccess: false,
        reason: 'Organization not found',
      }
    }

    if (!org[feature]) {
      return {
        hasAccess: false,
        reason: `This feature (${feature}) is not included in your ${org.subscriptionTier} plan`,
      }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Error checking feature access:', error)
    return {
      hasAccess: false,
      reason: 'Error validating feature access',
    }
  }
}

/**
 * Middleware helper to enforce subscription tier requirement
 * Use in API routes before processing the request
 */
export async function requireSubscriptionTier(
  organizationId: string,
  requiredTier: SubscriptionTier
): Promise<NextResponse | null> {
  const check = await checkSubscriptionTier(organizationId, requiredTier)

  if (!check.hasAccess) {
    return NextResponse.json(
      {
        error: 'Subscription Required',
        message: check.reason,
        currentTier: check.currentTier,
        requiredTier: check.requiredTier,
        upgradeUrl: check.upgradeUrl,
      },
      { status: 402 } // Payment Required
    )
  }

  return null // No error, access granted
}

/**
 * Middleware helper to enforce feature access requirement
 */
export async function requireFeature(
  organizationId: string,
  feature: 'advancedAi' | 'exportsEnabled' | 'templatesEnabled' | 'ssoEnabled'
): Promise<NextResponse | null> {
  const check = await checkFeatureAccess(organizationId, feature)

  if (!check.hasAccess) {
    return NextResponse.json(
      {
        error: 'Feature Not Available',
        message: check.reason,
        upgradeUrl: '/settings/billing',
      },
      { status: 402 } // Payment Required
    )
  }

  return null // No error, access granted
}

/**
 * Get user's current subscription details
 */
export async function getSubscriptionDetails(organizationId: string) {
  try {
    const [org] = await db
      .select({
        subscriptionTier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        plan: organizations.plan,
        trialEndsAt: organizations.trialEndsAt,
        aiTokensIncluded: organizations.aiTokensIncluded,
        seatsIncluded: organizations.seatsIncluded,
        projectsIncluded: organizations.projectsIncluded,
        advancedAi: organizations.advancedAi,
        exportsEnabled: organizations.exportsEnabled,
        templatesEnabled: organizations.templatesEnabled,
        ssoEnabled: organizations.ssoEnabled,
        supportTier: organizations.supportTier,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    return org
  } catch (error) {
    console.error('Error fetching subscription details:', error)
    return null
  }
}

/**
 * Quick helper to check tier and return 402 if access denied
 * Use this at the start of API route handlers
 */
export async function requireTier(
  user: UserContext,
  requiredTier: SubscriptionTier
): Promise<NextResponse | null> {
  return await requireSubscriptionTier(user.organizationId, requiredTier)
}

/**
 * Check specific feature and return 402 if not enabled
 */
export async function requireFeatureEnabled(
  user: UserContext,
  feature: 'advancedAi' | 'exportsEnabled' | 'templatesEnabled' | 'ssoEnabled'
): Promise<NextResponse | null> {
  return await requireFeature(user.organizationId, feature)
}

