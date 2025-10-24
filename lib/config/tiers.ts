/**
 * SynqForge Tier Configuration
 * 
 * This file defines the complete pricing model including:
 * - Four core tiers (Starter, Pro, Team, Enterprise)
 * - Three bolt-on add-ons (AI Actions Pack, AI Booster, Priority Support)
 * - AI action costs and tier-specific limits
 */

export type SubscriptionTier = 'starter' | 'pro' | 'team' | 'enterprise'

export type AddOnType = 'ai_actions' | 'ai_booster' | 'priority_support'

export type AIOperationType = 'split' | 'refine' | 'update'

// ============================================
// AI ACTION COSTS
// ============================================

export const AI_ACTION_COSTS: Record<AIOperationType, number> = {
  split: 0.7,
  refine: 0.5,
  update: 1.2,
}

// ============================================
// TIER DEFINITIONS
// ============================================

export interface TierConfig {
  id: string
  name: string
  displayName: string
  tier: SubscriptionTier
  pricing: {
    monthly: number // USD cents
    yearly?: number // USD cents (with discount)
    yearlyDiscount?: number // percentage
  }
  limits: {
    minSeats: number
    maxSeats: number | null // null = unlimited
    aiActionsBase: number // per user per month
    aiActionsPerSeat?: number // for pooled tiers (Team/Enterprise)
    pooling: boolean
    rolloverPercentage: number
    maxRollover: number | null // null = unlimited
  }
  features: {
    maxSplitChildren: number
    bulkSplitLimit: number
    bulkOperationLimit: number
    updateEnabled: boolean
    approvalsRequired: boolean
    gherkinTemplates: 'basic' | 'advanced' | 'team_library' | 'enterprise_library'
    auditLogRetention: number // days, 0 = none, -1 = unlimited
    supportTier: 'community' | 'email_48h' | 'priority_24h' | '24_7_dedicated'
    advancedFeatures: {
      sso: boolean
      saml: boolean
      rbac: boolean
      dataResidency: boolean
      complianceExports: boolean
    }
  }
  addOns: {
    availableAddOns: AddOnType[]
  }
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  starter: {
    id: 'prod_starter',
    name: 'Starter',
    displayName: 'Starter (Free)',
    tier: 'starter',
    pricing: {
      monthly: 0,
    },
    limits: {
      minSeats: 1,
      maxSeats: 1,
      aiActionsBase: 25,
      pooling: false,
      rolloverPercentage: 0,
      maxRollover: 0,
    },
    features: {
      maxSplitChildren: 2,
      bulkSplitLimit: 1,
      bulkOperationLimit: 1,
      updateEnabled: false,
      approvalsRequired: false,
      gherkinTemplates: 'basic',
      auditLogRetention: 0,
      supportTier: 'community',
      advancedFeatures: {
        sso: false,
        saml: false,
        rbac: false,
        dataResidency: false,
        complianceExports: false,
      },
    },
    addOns: {
      availableAddOns: ['ai_booster'],
    },
  },
  pro: {
    id: 'prod_pro',
    name: 'Pro',
    displayName: 'Pro',
    tier: 'pro',
    pricing: {
      monthly: 1099, // $10.99
      yearly: 10500, // $105/year (20% discount)
      yearlyDiscount: 20,
    },
    limits: {
      minSeats: 1,
      maxSeats: 4,
      aiActionsBase: 400,
      pooling: false,
      rolloverPercentage: 20,
      maxRollover: 80, // 20% of 400
    },
    features: {
      maxSplitChildren: 3,
      bulkSplitLimit: 1,
      bulkOperationLimit: 1,
      updateEnabled: true,
      approvalsRequired: false,
      gherkinTemplates: 'advanced',
      auditLogRetention: 30,
      supportTier: 'email_48h',
      advancedFeatures: {
        sso: false,
        saml: false,
        rbac: false,
        dataResidency: false,
        complianceExports: false,
      },
    },
    addOns: {
      availableAddOns: ['ai_actions', 'priority_support'],
    },
  },
  team: {
    id: 'prod_team',
    name: 'Team',
    displayName: 'Team',
    tier: 'team',
    pricing: {
      monthly: 1699, // $16.99 per seat (15% discount vs 5× Pro)
      yearly: 16200, // $162/year per seat (20% discount)
      yearlyDiscount: 20,
    },
    limits: {
      minSeats: 5,
      maxSeats: null,
      aiActionsBase: 10000,
      aiActionsPerSeat: 1000,
      pooling: true,
      rolloverPercentage: 20,
      maxRollover: null, // unlimited rollover for pooled
    },
    features: {
      maxSplitChildren: 7,
      bulkSplitLimit: 5,
      bulkOperationLimit: 5,
      updateEnabled: true,
      approvalsRequired: true,
      gherkinTemplates: 'team_library',
      auditLogRetention: 365,
      supportTier: 'priority_24h',
      advancedFeatures: {
        sso: false,
        saml: false,
        rbac: false,
        dataResidency: false,
        complianceExports: false,
      },
    },
    addOns: {
      availableAddOns: ['ai_actions'],
    },
  },
  enterprise: {
    id: 'prod_enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise',
    tier: 'enterprise',
    pricing: {
      monthly: 0, // Custom pricing
    },
    limits: {
      minSeats: 10,
      maxSeats: null,
      aiActionsBase: -1, // custom
      pooling: true,
      rolloverPercentage: -1, // policy-based
      maxRollover: null,
    },
    features: {
      maxSplitChildren: -1, // unlimited (recommended max 10)
      bulkSplitLimit: -1, // unlimited
      bulkOperationLimit: -1, // unlimited
      updateEnabled: true,
      approvalsRequired: true, // configurable
      gherkinTemplates: 'enterprise_library',
      auditLogRetention: -1, // unlimited
      supportTier: '24_7_dedicated',
      advancedFeatures: {
        sso: true,
        saml: true,
        rbac: true,
        dataResidency: true,
        complianceExports: true,
      },
    },
    addOns: {
      availableAddOns: ['ai_actions'],
    },
  },
}

// ============================================
// ADD-ON DEFINITIONS
// ============================================

export interface AddOnConfig {
  id: string
  productId: string
  name: string
  description: string
  type: AddOnType
  pricing: {
    amount: number // USD cents
    recurring: boolean
    interval?: 'month' | 'year'
  }
  grants: {
    credits?: number
    aiActionsBonus?: number
    supportUpgrade?: string
  }
  constraints: {
    availableFor: SubscriptionTier[]
    maxActive?: number // max concurrent purchases (for non-recurring)
    expiryDays?: number
    cancellable: boolean
  }
}

export const ADD_ON_CONFIGS: Record<AddOnType, AddOnConfig> = {
  ai_actions: {
    id: 'prod_ai_actions_pack',
    productId: 'prod_ai_actions_pack',
    name: 'AI Actions Pack',
    description: '1,000 additional AI actions with 90-day expiration',
    type: 'ai_actions',
    pricing: {
      amount: 2000, // $20
      recurring: false,
    },
    grants: {
      credits: 1000,
    },
    constraints: {
      availableFor: ['pro', 'team', 'enterprise'],
      maxActive: 5,
      expiryDays: 90,
      cancellable: false,
    },
  },
  ai_booster: {
    id: 'prod_ai_booster_starter',
    productId: 'prod_ai_booster_starter',
    name: 'AI Booster (Starter)',
    description: 'Add 200 AI actions per month to your Starter plan',
    type: 'ai_booster',
    pricing: {
      amount: 500, // $5
      recurring: true,
      interval: 'month',
    },
    grants: {
      aiActionsBonus: 200,
    },
    constraints: {
      availableFor: ['starter'],
      cancellable: true,
    },
  },
  priority_support: {
    id: 'prod_priority_support',
    productId: 'prod_priority_support',
    name: 'Priority Support Pack',
    description: '24-hour priority email and live chat support for Pro users',
    type: 'priority_support',
    pricing: {
      amount: 1500, // $15
      recurring: true,
      interval: 'month',
    },
    grants: {
      supportUpgrade: '24h_priority',
    },
    constraints: {
      availableFor: ['pro'],
      cancellable: true,
    },
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIGS[tier]
}

export function getAddOnConfig(type: AddOnType): AddOnConfig {
  return ADD_ON_CONFIGS[type]
}

export function calculateAIActionCost(operationType: AIOperationType): number {
  return AI_ACTION_COSTS[operationType]
}

export function calculatePooledAllowance(seats: number): number {
  const teamConfig = TIER_CONFIGS.team
  return teamConfig.limits.aiActionsBase + (seats * (teamConfig.limits.aiActionsPerSeat || 0))
}

export function isAddOnAvailableForTier(addOnType: AddOnType, tier: SubscriptionTier): boolean {
  const addOn = ADD_ON_CONFIGS[addOnType]
  return addOn.constraints.availableFor.includes(tier)
}

export function getMaxSeatsForTier(tier: SubscriptionTier): number | null {
  return TIER_CONFIGS[tier].limits.maxSeats
}

export function getMinSeatsForTier(tier: SubscriptionTier): number {
  return TIER_CONFIGS[tier].limits.minSeats
}

export function isFeatureEnabled(tier: SubscriptionTier, feature: keyof TierConfig['features']): boolean {
  const config = TIER_CONFIGS[tier]
  const featureValue = config.features[feature]
  
  if (typeof featureValue === 'boolean') {
    return featureValue
  }
  
  return true // Non-boolean features are configuration values, not gates
}

export function getFeatureLimit(tier: SubscriptionTier, limit: keyof TierConfig['limits']): number | null {
  const config = TIER_CONFIGS[tier]
  return config.limits[limit] as number | null
}

// ============================================
// UPGRADE PROMPTS
// ============================================

export interface UpgradePrompt {
  feature: string
  currentTier: SubscriptionTier
  requiredTier: SubscriptionTier
  message: string
  ctaText: string
  upgradeUrl: string
}

export function getUpgradePrompt(
  feature: string,
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): UpgradePrompt {
  const requiredConfig = TIER_CONFIGS[requiredTier]
  
  return {
    feature,
    currentTier,
    requiredTier,
    message: `This feature requires ${requiredConfig.displayName} or higher`,
    ctaText: `Upgrade to ${requiredConfig.name}`,
    upgradeUrl: '/pricing',
  }
}

export function getQuotaExceededPrompt(
  currentTier: SubscriptionTier,
  remaining: number
): {
  message: string
  upgradeOptions: Array<{
    type: 'addon' | 'tier'
    name: string
    description: string
    price: number
    credits?: number
    ctaText: string
    ctaUrl: string
  }>
} {
  const upgradeOptions: Array<{
    type: 'addon' | 'tier'
    name: string
    description: string
    price: number
    credits?: number
    ctaText: string
    ctaUrl: string
  }> = []

  // Check if AI Actions Pack is available for current tier
  if (isAddOnAvailableForTier('ai_actions', currentTier)) {
    const aiActionsPack = ADD_ON_CONFIGS.ai_actions
    upgradeOptions.push({
      type: 'addon',
      name: aiActionsPack.name,
      description: aiActionsPack.description,
      price: aiActionsPack.pricing.amount / 100,
      credits: aiActionsPack.grants.credits,
      ctaText: 'Buy AI Actions Pack',
      ctaUrl: '/billing/add-ons',
    })
  }

  // Suggest tier upgrade if beneficial
  if (currentTier === 'starter') {
    upgradeOptions.push({
      type: 'tier',
      name: 'Pro',
      description: '400 AI actions/month with 20% rollover',
      price: 10.99,
      ctaText: 'Try Pro Free for 14 Days',
      ctaUrl: '/pricing',
    })
  } else if (currentTier === 'pro') {
    upgradeOptions.push({
      type: 'tier',
      name: 'Team',
      description: 'Pooled actions for your whole team',
      price: 16.99,
      ctaText: 'Upgrade to Team',
      ctaUrl: '/pricing',
    })
  }

  return {
    message: `You've used all your AI actions this month (${remaining} remaining).`,
    upgradeOptions,
  }
}

// ============================================
// VALIDATION
// ============================================

export function validateSeatCount(tier: SubscriptionTier, seats: number): {
  valid: boolean
  error?: string
} {
  const config = TIER_CONFIGS[tier]
  
  if (seats < config.limits.minSeats) {
    return {
      valid: false,
      error: `${config.name} plan requires a minimum of ${config.limits.minSeats} seat(s)`,
    }
  }
  
  if (config.limits.maxSeats !== null && seats > config.limits.maxSeats) {
    return {
      valid: false,
      error: `${config.name} plan supports a maximum of ${config.limits.maxSeats} seat(s). Please upgrade to Team or Enterprise.`,
    }
  }
  
  return { valid: true }
}

export function validateAddOnPurchase(
  addOnType: AddOnType,
  tier: SubscriptionTier,
  activeCount: number = 0
): {
  valid: boolean
  error?: string
} {
  const addOn = ADD_ON_CONFIGS[addOnType]
  
  // Check tier availability
  if (!addOn.constraints.availableFor.includes(tier)) {
    const availableTiers = addOn.constraints.availableFor.join(', ')
    return {
      valid: false,
      error: `${addOn.name} is only available for: ${availableTiers}`,
    }
  }
  
  // Check max active limit (for non-recurring add-ons)
  if (addOn.constraints.maxActive && activeCount >= addOn.constraints.maxActive) {
    return {
      valid: false,
      error: `Maximum ${addOn.constraints.maxActive} active ${addOn.name}s allowed. Use existing credits first.`,
    }
  }
  
  return { valid: true }
}

export default {
  TIER_CONFIGS,
  ADD_ON_CONFIGS,
  AI_ACTION_COSTS,
  getTierConfig,
  getAddOnConfig,
  calculateAIActionCost,
  calculatePooledAllowance,
  isAddOnAvailableForTier,
  getMaxSeatsForTier,
  getMinSeatsForTier,
  isFeatureEnabled,
  getFeatureLimit,
  getUpgradePrompt,
  getQuotaExceededPrompt,
  validateSeatCount,
  validateAddOnPurchase,
}

