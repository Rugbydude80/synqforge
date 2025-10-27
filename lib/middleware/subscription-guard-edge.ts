/**
 * Edge-Compatible Subscription Guard
 * 
 * Uses @neondatabase/serverless for Edge Runtime compatibility in middleware.
 * Provides subscription tier validation with caching to minimize latency.
 */

import { neon } from '@neondatabase/serverless'

export type SubscriptionTier = 'free' | 'starter' | 'core' | 'pro' | 'team' | 'enterprise'

export interface SubscriptionCheckResult {
  hasAccess: boolean
  reason?: string
  currentTier: SubscriptionTier
  requiredTier: SubscriptionTier
  subscriptionStatus?: string
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
 * Feature to minimum tier mapping
 */
export const FEATURE_TIER_MAP: Record<string, SubscriptionTier> = {
  // Core tier features
  'export_basic': 'core',
  'custom_templates': 'core',
  'advanced_gherkin': 'core',
  
  // Pro tier features
  'export_jira': 'pro',
  'export_linear': 'pro',
  'bulk_operations': 'pro',
  'structured_patching': 'pro',
  'document_analysis': 'pro',
  'shared_templates': 'pro',
  
  // Team tier features
  'approval_flows': 'team',
  'advanced_split': 'team',  // 7 children vs 3
  'audit_logs_extended': 'team',
  
  // Enterprise tier features
  'sso': 'enterprise',
  'saml': 'enterprise',
  'unlimited_split': 'enterprise',
  'department_budgets': 'enterprise',
  'enforced_templates': 'enterprise',
}

/**
 * Get organization subscription data from database (Edge-compatible)
 */
async function getOrganizationSubscription(organizationId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }

  const sql = neon(process.env.DATABASE_URL)
  
  const result = await sql`
    SELECT 
      subscription_tier,
      subscription_status,
      plan,
      trial_ends_at,
      advanced_ai,
      exports_enabled,
      templates_enabled,
      sso_enabled
    FROM organizations
    WHERE id = ${organizationId}
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Check if user's subscription tier meets the required tier (Edge-compatible)
 */
export async function checkSubscriptionTierEdge(
  organizationId: string,
  requiredTier: SubscriptionTier
): Promise<SubscriptionCheckResult> {
  try {
    const org = await getOrganizationSubscription(organizationId)

    if (!org) {
      return {
        hasAccess: false,
        reason: 'Organization not found',
        currentTier: 'free',
        requiredTier,
      }
    }

    const currentTier = (org.subscription_tier || 'free') as SubscriptionTier
    const subscriptionStatus = org.subscription_status || 'inactive'

    // Check if subscription is active
    const isActive = subscriptionStatus === 'active' || 
                     subscriptionStatus === 'trialing'

    // Check if trial has expired
    const trialExpired = org.trial_ends_at && new Date(org.trial_ends_at) < new Date()

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
          subscriptionStatus,
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
        subscriptionStatus,
        upgradeUrl: '/settings/billing',
      }
    }

    return {
      hasAccess: true,
      currentTier,
      requiredTier,
      subscriptionStatus,
    }
  } catch (error) {
    console.error('Error checking subscription tier (Edge):', error)
    return {
      hasAccess: false,
      reason: 'Error validating subscription',
      currentTier: 'free',
      requiredTier,
    }
  }
}

/**
 * Check feature access by feature key (Edge-compatible)
 */
export async function checkFeatureAccessEdge(
  organizationId: string,
  feature: 'advancedAi' | 'exportsEnabled' | 'templatesEnabled' | 'ssoEnabled'
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    const org = await getOrganizationSubscription(organizationId)

    if (!org) {
      return {
        hasAccess: false,
        reason: 'Organization not found',
      }
    }

    const featureMap: Record<string, boolean> = {
      advancedAi: org.advanced_ai,
      exportsEnabled: org.exports_enabled,
      templatesEnabled: org.templates_enabled,
      ssoEnabled: org.sso_enabled,
    }

    if (!featureMap[feature]) {
      return {
        hasAccess: false,
        reason: `This feature (${feature}) is not included in your ${org.subscription_tier || 'free'} plan`,
      }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Error checking feature access (Edge):', error)
    return {
      hasAccess: false,
      reason: 'Error validating feature access',
    }
  }
}

/**
 * Get required tier for a feature by key
 */
export function getRequiredTierForFeature(featureKey: string): SubscriptionTier {
  return FEATURE_TIER_MAP[featureKey] || 'free'
}

/**
 * Check if route requires subscription based on path pattern
 * Uses regex for more precise matching to avoid false positives
 */
export function routeRequiresTier(pathname: string): { requiresTier: SubscriptionTier | null; feature?: string } {
  // Export routes (Core+)
  // Matches: /api/*/export or /api/*/*/export
  if (/\/api\/[^\/]+\/export(\?|$)/.test(pathname) || /\/api\/[^\/]+\/[^\/]+\/export(\?|$)/.test(pathname)) {
    if (/\/(jira|linear)/.test(pathname)) {
      return { requiresTier: 'pro', feature: 'export_jira' }
    }
    return { requiresTier: 'core', feature: 'export_basic' }
  }

  // Bulk operations (Pro+)
  // Matches: /api/*/bulk or /api/ai/batch-*
  if (/\/api\/[^\/]+\/bulk(\?|$)/.test(pathname) || /\/api\/ai\/batch-[^\/]+/.test(pathname)) {
    return { requiresTier: 'pro', feature: 'bulk_operations' }
  }

  // Document analysis (Pro+)
  // Exact match: /api/ai/analyze-document
  if (/^\/api\/ai\/analyze-document(\?|$)/.test(pathname)) {
    return { requiresTier: 'pro', feature: 'document_analysis' }
  }

  // Team features (Team+)
  // Matches: /api/team/* or routes with /approval
  if (/^\/api\/team\//.test(pathname) || /\/approval/.test(pathname)) {
    return { requiresTier: 'team', feature: 'approval_flows' }
  }

  // SSO (Enterprise)
  // Matches: /api/sso/* or /api/saml/*
  if (/^\/api\/(sso|saml)\//.test(pathname)) {
    return { requiresTier: 'enterprise', feature: 'sso' }
  }

  return { requiresTier: null }
}

