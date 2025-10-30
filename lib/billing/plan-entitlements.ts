/**
 * Plan Entitlements Helper
 * Maps plan names to entitlement configurations for manual plan assignment
 */

import { Entitlements, entitlementsToDbValues } from './entitlements'

/**
 * Get entitlements for a plan name
 * Used for manual plan assignment when Stripe metadata isn't available
 */
export function getEntitlementsForPlan(planName: string): Entitlements {
  const plan = planName.toLowerCase()

  switch (plan) {
    case 'free':
    case 'starter':
      return {
        plan: 'free',
        plan_cycle: 'monthly',
        seats_included: 1,
        projects_included: 1,
        ai_tokens_included: 5000,
        docs_per_month: 2,
        throughput_spm: 2,
        bulk_story_limit: 5,
        max_pages_per_upload: 10,
        advanced_ai: false,
        exports: false,
        templates: true,
        rbac_level: 'none',
        audit_level: 'none',
        sso_enabled: false,
        support_tier: 'community',
        fair_use: true,
      }

    case 'solo':
    case 'core':
      return {
        plan: 'solo',
        plan_cycle: 'monthly',
        seats_included: 1,
        projects_included: 3,
        ai_tokens_included: 50000,
        docs_per_month: 10,
        throughput_spm: 5,
        bulk_story_limit: 20,
        max_pages_per_upload: 50,
        advanced_ai: false,
        exports: true,
        templates: true,
        rbac_level: 'none',
        audit_level: 'none',
        sso_enabled: false,
        support_tier: 'community',
        fair_use: true,
      }

    case 'pro':
      return {
        plan: 'pro',
        plan_cycle: 'monthly',
        seats_included: 15,
        projects_included: 50,
        ai_tokens_included: 1000000, // 1M tokens
        docs_per_month: 50,
        throughput_spm: 10,
        bulk_story_limit: 50,
        max_pages_per_upload: 100,
        advanced_ai: true,
        exports: true,
        templates: true,
        rbac_level: 'basic',
        audit_level: 'basic',
        sso_enabled: false,
        support_tier: 'priority',
        fair_use: true,
      }

    case 'team':
      return {
        plan: 'team',
        plan_cycle: 'monthly',
        seats_included: 5, // Minimum 5 seats
        projects_included: 10,
        ai_tokens_included: 200000, // 200K tokens
        docs_per_month: 30,
        throughput_spm: 8,
        bulk_story_limit: 30,
        max_pages_per_upload: 75,
        advanced_ai: true,
        exports: true,
        templates: true,
        rbac_level: 'basic',
        audit_level: 'basic',
        sso_enabled: false,
        support_tier: 'priority',
        fair_use: true,
      }

    case 'enterprise':
      return {
        plan: 'enterprise',
        plan_cycle: 'monthly',
        seats_included: -1, // Unlimited
        projects_included: -1, // Unlimited
        ai_tokens_included: -1, // Unlimited
        docs_per_month: -1, // Unlimited
        throughput_spm: 20,
        bulk_story_limit: 100,
        max_pages_per_upload: 200,
        advanced_ai: true,
        exports: true,
        templates: true,
        rbac_level: 'advanced',
        audit_level: 'advanced',
        sso_enabled: true,
        support_tier: 'sla',
        fair_use: false,
      }

    case 'admin':
      return {
        plan: 'admin',
        plan_cycle: 'monthly',
        seats_included: -1, // Unlimited
        projects_included: -1, // Unlimited
        ai_tokens_included: -1, // Unlimited
        docs_per_month: -1, // Unlimited
        throughput_spm: 1000,
        bulk_story_limit: 999999,
        max_pages_per_upload: 999999,
        advanced_ai: true,
        exports: true,
        templates: true,
        rbac_level: 'advanced',
        audit_level: 'advanced',
        sso_enabled: true,
        support_tier: 'sla',
        fair_use: false,
      }

    default:
      throw new Error(`Unknown plan: ${planName}. Valid plans: free, solo, pro, team, enterprise, admin`)
  }
}

/**
 * Map plan name to legacy subscription tier enum
 */
export function mapPlanToLegacyTier(planName: string): 'starter' | 'core' | 'pro' | 'team' | 'enterprise' | 'admin' {
  const plan = planName.toLowerCase()

  if (plan === 'free' || plan === 'starter') return 'starter'
  if (plan === 'solo' || plan === 'core') return 'core'
  if (plan === 'pro') return 'pro'
  if (plan === 'team') return 'team'
  if (plan === 'enterprise') return 'enterprise'
  if (plan === 'admin') return 'admin'

  return 'starter' // Default fallback
}

/**
 * Get database values for a plan
 * CRITICAL: Ensures plan and subscriptionTier always match
 */
export function getPlanDbValues(planName: string) {
  const entitlements = getEntitlementsForPlan(planName)
  const legacyTier = mapPlanToLegacyTier(planName)
  const dbValues = entitlementsToDbValues(entitlements)

  // Override plan and tier to ensure they match
  return {
    ...dbValues,
    plan: planName, // Use the actual plan name (solo, pro, team, etc.) - overrides any value from entitlements
    subscriptionTier: legacyTier, // Use the mapped tier (core, pro, team, etc.)
    subscriptionStatus: planName === 'free' || planName === 'starter' ? 'active' : 'active',
  }
}

