/**
 * Feature Gate Middleware
 * 
 * Enforces tier-based feature access and operation limits
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations, stories } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { 
  getTierConfig, 
  validateSeatCount,
  getUpgradePrompt,
  type SubscriptionTier 
} from '@/lib/config/tiers'

// ============================================
// TYPES
// ============================================

export interface FeatureGateContext {
  organizationId: string
  userId: string
  tier: SubscriptionTier
}

export interface FeatureGateError {
  error: string
  feature: string
  requiredTier: SubscriptionTier
  currentTier: SubscriptionTier
  upgradeUrl: string
  ctaText: string
}

// ============================================
// FEATURE CHECKS
// ============================================

export async function requireFeature(
  feature: string,
  context: FeatureGateContext
): Promise<{ allowed: boolean; error?: FeatureGateError }> {
  const tierConfig = getTierConfig(context.tier)
  
  switch (feature) {
    case 'update_story':
      if (!tierConfig.features.updateEnabled) {
        const upgrade = getUpgradePrompt('update_story', context.tier, 'pro')
        return {
          allowed: false,
          error: {
            error: 'feature_unavailable',
            feature: 'update_story',
            requiredTier: 'pro',
            currentTier: context.tier,
            upgradeUrl: upgrade.upgradeUrl,
            ctaText: 'Upgrade to Pro',
          },
        }
      }
      return { allowed: true }
      
    case 'bulk_operations':
      if (tierConfig.features.bulkOperationLimit <= 1) {
        const upgrade = getUpgradePrompt('bulk_operations', context.tier, 'team')
        return {
          allowed: false,
          error: {
            error: 'feature_unavailable',
            feature: 'bulk_operations',
            requiredTier: 'team',
            currentTier: context.tier,
            upgradeUrl: upgrade.upgradeUrl,
            ctaText: 'Upgrade to Team',
          },
        }
      }
      return { allowed: true }
      
    default:
      return { allowed: true }
  }
}

// ============================================
// OPERATION LIMITS
// ============================================

export async function validateOperationLimits(
  operation: 'split' | 'bulk_split' | 'bulk_refine',
  context: FeatureGateContext,
  params: {
    childrenCount?: number
    storyCount?: number
  }
): Promise<{ valid: boolean; error?: string }> {
  const tierConfig = getTierConfig(context.tier)
  
  switch (operation) {
    case 'split':
      if (params.childrenCount && params.childrenCount > tierConfig.features.maxSplitChildren) {
        return {
          valid: false,
          error: `Maximum ${tierConfig.features.maxSplitChildren} child stories allowed for ${tierConfig.name} tier. Requested: ${params.childrenCount}`,
        }
      }
      return { valid: true }
      
    case 'bulk_split':
      if (params.storyCount && params.storyCount > tierConfig.features.bulkSplitLimit) {
        return {
          valid: false,
          error: `Bulk split limited to ${tierConfig.features.bulkSplitLimit} stor${tierConfig.features.bulkSplitLimit === 1 ? 'y' : 'ies'} for ${tierConfig.name} tier. Requested: ${params.storyCount}`,
        }
      }
      return { valid: true }
      
    case 'bulk_refine':
      if (params.storyCount && params.storyCount > tierConfig.features.bulkOperationLimit) {
        return {
          valid: false,
          error: `Bulk refine limited to ${tierConfig.features.bulkOperationLimit} stor${tierConfig.features.bulkOperationLimit === 1 ? 'y' : 'ies'} for ${tierConfig.name} tier. Requested: ${params.storyCount}`,
        }
      }
      return { valid: true }
      
    default:
      return { valid: true }
  }
}

// ============================================
// APPROVAL ENFORCEMENT
// ============================================

export async function requireApproval(
  storyIds: string[],
  context: FeatureGateContext
): Promise<{ required: boolean; unapprovedStories?: string[] }> {
  const tierConfig = getTierConfig(context.tier)
  
  if (!tierConfig.features.approvalsRequired) {
    return { required: false }
  }
  
  // Check if any stories are in Done/Closed status
  const storiesInDone = await db.query.stories.findMany({
    where: and(
      inArray(stories.id, storyIds),
      inArray(stories.status, ['done', 'blocked'])
    ),
  })
  
  if (storiesInDone.length > 0) {
    return {
      required: true,
      unapprovedStories: storiesInDone.map(s => s.id),
    }
  }
  
  return { required: false }
}

// ============================================
// SEAT ENFORCEMENT
// ============================================

export async function enforceMinSeats(
  tier: SubscriptionTier,
  requestedSeats: number
): Promise<{ valid: boolean; error?: string }> {
  const validation = validateSeatCount(tier, requestedSeats)
  
  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
    }
  }
  
  return { valid: true }
}

// ============================================
// CHECKOUT VALIDATION
// ============================================

export async function validateCheckout(
  tier: SubscriptionTier,
  seats: number
): Promise<{ valid: boolean; error?: string; suggestion?: string }> {
  const tierConfig = getTierConfig(tier)
  
  // Pro checkout: reject if seats > 4
  if (tier === 'pro' && seats > 4) {
    return {
      valid: false,
      error: 'Pro plan supports a maximum of 4 seats',
      suggestion: 'Upgrade to Team plan for 5+ seats with pooled AI actions',
    }
  }
  
  // Team checkout: reject if seats < 5
  if (tier === 'team' && seats < 5) {
    return {
      valid: false,
      error: 'Team plan requires a minimum of 5 seats',
      suggestion: 'Choose Pro plan for 1-4 seats',
    }
  }
  
  return { valid: true }
}

// ============================================
// MIDDLEWARE HELPERS
// ============================================

export async function getOrganizationContext(
  organizationId: string,
  userId: string
): Promise<FeatureGateContext | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })
  
  if (!org) {
    return null
  }
  
  return {
    organizationId,
    userId,
    tier: (org.plan as SubscriptionTier) || 'starter',
  }
}

export function createFeatureGateError(
  feature: string,
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): FeatureGateError {
  const upgrade = getUpgradePrompt(feature, currentTier, requiredTier)
  
  return {
    error: 'feature_unavailable',
    feature,
    requiredTier,
    currentTier,
    upgradeUrl: upgrade.upgradeUrl,
    ctaText: upgrade.ctaText,
  }
}

// ============================================
// EXPRESS/NEXT.JS MIDDLEWARE
// ============================================

export function featureGateMiddleware(requiredFeature: string) {
  return async (req: NextRequest) => {
    try {
      // Extract context from request (adjust based on your auth setup)
      const organizationId = req.headers.get('x-organization-id')
      const userId = req.headers.get('x-user-id')
      
      if (!organizationId || !userId) {
        return NextResponse.json(
          { error: 'Missing authentication context' },
          { status: 401 }
        )
      }
      
      const context = await getOrganizationContext(organizationId, userId)
      
      if (!context) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }
      
      const { allowed, error } = await requireFeature(requiredFeature, context)
      
      if (!allowed) {
        return NextResponse.json(error, { status: 403 })
      }
      
      // Feature check passed, continue
      return NextResponse.next()
    } catch (error) {
      console.error('Feature gate middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export default {
  requireFeature,
  validateOperationLimits,
  requireApproval,
  enforceMinSeats,
  validateCheckout,
  getOrganizationContext,
  createFeatureGateError,
  featureGateMiddleware,
}

