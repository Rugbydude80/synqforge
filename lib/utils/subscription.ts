/**
 * Subscription Helper Utilities
 * Provides easy access to subscription limits and feature checks
 */

import { SUBSCRIPTION_LIMITS } from '@/lib/constants'

export type SubscriptionTier = 'free' | 'starter' | 'solo' | 'core' | 'team' | 'pro' | 'business' | 'enterprise'

export interface SubscriptionFeatures {
  // Projects & Stories
  canCreateProject: boolean
  canCreateUnlimitedStories: boolean
  maxProjects: number
  maxStoriesPerProject: number

  // Seats
  canAddSeats: boolean
  maxSeats: number
  seatPrice: number

  // AI Modules
  canUseBacklogAutopilot: boolean
  canUseACValidator: boolean
  canUseTestGeneration: boolean
  canUsePlanningForecast: boolean
  canUseEffortScoring: boolean
  canUseKnowledgeSearch: boolean
  canUseInboxParsing: boolean
  canUseRepoAwareness: boolean
  canUseWorkflowAgents: boolean
  canUseGovernance: boolean
  canUseModelControls: boolean
  canUseAnalytics: boolean

  // Features
  canExport: boolean
  canUseTemplates: boolean
  canUseAPI: boolean
  canUseSSO: boolean

  // Billing
  monthlyAITokens: number
  trialDays: number
}

/**
 * Get subscription features for a given tier
 */
export function getSubscriptionFeatures(tier: SubscriptionTier): SubscriptionFeatures {
  const limits = SUBSCRIPTION_LIMITS[tier]

  return {
    // Projects & Stories
    canCreateProject: true,
    canCreateUnlimitedStories: limits.maxStoriesPerProject === Infinity,
    maxProjects: limits.maxProjects,
    maxStoriesPerProject: limits.maxStoriesPerProject,

    // Seats
    canAddSeats: tier !== 'free' && tier !== 'starter',
    maxSeats: limits.maxSeats,
    seatPrice: limits.seatPrice,

    // AI Modules
    canUseBacklogAutopilot: limits.canUseBacklogAutopilot,
    canUseACValidator: limits.canUseACValidator,
    canUseTestGeneration: limits.canUseTestGeneration,
    canUsePlanningForecast: limits.canUsePlanningForecast,
    canUseEffortScoring: limits.canUseEffortScoring,
    canUseKnowledgeSearch: limits.canUseKnowledgeSearch,
    canUseInboxParsing: limits.canUseInboxParsing,
    canUseRepoAwareness: limits.canUseRepoAwareness,
    canUseWorkflowAgents: limits.canUseWorkflowAgents,
    canUseGovernance: limits.canUseGovernance,
    canUseModelControls: limits.canUseModelControls,
    canUseAnalytics: limits.canUseAnalytics,

    // Features
    canExport: limits.canExport,
    canUseTemplates: limits.canUseTemplates,
    canUseAPI: limits.canUseAPI,
    canUseSSO: limits.canUseSSO,

    // Billing
    monthlyAITokens: limits.monthlyAITokens,
    trialDays: limits.trialDays,
  }
}

/**
 * Check if a feature is available for a given tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof SubscriptionFeatures): boolean {
  const features = getSubscriptionFeatures(tier)
  const value = features[feature]

  // Handle boolean features
  if (typeof value === 'boolean') {
    return value
  }

  // Handle numeric features (consider non-zero as "has feature")
  if (typeof value === 'number') {
    return value > 0
  }

  return false
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  feature: keyof SubscriptionFeatures
): string {
  const tierMessages: Record<SubscriptionTier, Record<string, string>> = {
    free: {
      canUseBacklogAutopilot: 'Upgrade to Team to use Backlog Autopilot',
      canUseACValidator: 'Upgrade to Team to use AC Validator',
      canUseTestGeneration: 'Upgrade to Team to use Test Generation',
      canUsePlanningForecast: 'Upgrade to Team to use Planning & Forecasting',
      canUseEffortScoring: 'Upgrade to Team to use Effort Scoring',
      canUseKnowledgeSearch: 'Upgrade to Team to use Knowledge Search',
      canUseInboxParsing: 'Upgrade to Pro to use Inbox to Backlog',
      canUseRepoAwareness: 'Upgrade to Enterprise to use Repo Awareness',
      canUseWorkflowAgents: 'Upgrade to Enterprise to use Workflow Agents',
      canUseGovernance: 'Upgrade to Enterprise to use Governance & Compliance',
      canUseModelControls: 'Upgrade to Enterprise to use Model Controls',
      canUseAnalytics: 'Upgrade to Team to use Analytics',
      canExport: 'Upgrade to Solo to export projects',
      canUseTemplates: 'Upgrade to Solo to use templates',
      canUseAPI: 'Upgrade to Pro to use the API',
      canUseSSO: 'Upgrade to Pro to use SSO',
      canAddSeats: 'Upgrade to Team to add more seats',
    },
    starter: {
      canUseBacklogAutopilot: 'Upgrade to Team to use Backlog Autopilot',
      canUseACValidator: 'Upgrade to Team to use AC Validator',
      canUseTestGeneration: 'Upgrade to Team to use Test Generation',
      canUsePlanningForecast: 'Upgrade to Team to use Planning & Forecasting',
      canUseEffortScoring: 'Upgrade to Team to use Effort Scoring',
      canUseKnowledgeSearch: 'Upgrade to Team to use Knowledge Search',
      canUseInboxParsing: 'Upgrade to Pro to use Inbox to Backlog',
      canUseRepoAwareness: 'Upgrade to Enterprise to use Repo Awareness',
      canUseWorkflowAgents: 'Upgrade to Enterprise to use Workflow Agents',
      canUseGovernance: 'Upgrade to Enterprise to use Governance & Compliance',
      canUseModelControls: 'Upgrade to Enterprise to use Model Controls',
      canUseAnalytics: 'Upgrade to Team to use Analytics',
      canExport: 'Upgrade to Pro to export projects',
      canUseTemplates: 'Upgrade to Pro to use templates',
      canUseAPI: 'Upgrade to Pro to use the API',
      canUseSSO: 'Upgrade to Pro to use SSO',
      canAddSeats: 'Upgrade to Team to add more seats',
    },
    solo: {
      canUseBacklogAutopilot: 'Upgrade to Team to use Backlog Autopilot',
      canUseACValidator: 'Upgrade to Team to use AC Validator',
      canUseTestGeneration: 'Upgrade to Team to use Test Generation',
      canUsePlanningForecast: 'Upgrade to Team to use Planning & Forecasting',
      canUseEffortScoring: 'Upgrade to Team to use Effort Scoring',
      canUseKnowledgeSearch: 'Upgrade to Team to use Knowledge Search',
      canUseInboxParsing: 'Upgrade to Pro to use Inbox to Backlog',
      canUseRepoAwareness: 'Upgrade to Enterprise to use Repo Awareness',
      canUseWorkflowAgents: 'Upgrade to Enterprise to use Workflow Agents',
      canUseGovernance: 'Upgrade to Enterprise to use Governance & Compliance',
      canUseModelControls: 'Upgrade to Enterprise to use Model Controls',
      canUseAnalytics: 'Upgrade to Team to use Analytics',
      canUseAPI: 'Upgrade to Pro to use the API',
      canUseSSO: 'Upgrade to Pro to use SSO',
      canAddSeats: 'Upgrade to Team to add more seats',
    },
    team: {
      canUseInboxParsing: 'Upgrade to Pro to use Inbox to Backlog',
      canUseRepoAwareness: 'Upgrade to Enterprise to use Repo Awareness',
      canUseWorkflowAgents: 'Upgrade to Enterprise to use Workflow Agents',
      canUseGovernance: 'Upgrade to Enterprise to use Governance & Compliance',
      canUseModelControls: 'Upgrade to Enterprise to use Model Controls',
      canUseAPI: 'Upgrade to Pro to use the API',
      canUseSSO: 'Upgrade to Pro to use SSO',
    },
    pro: {
      canUseRepoAwareness: 'Upgrade to Enterprise to use Repo Awareness',
      canUseWorkflowAgents: 'Upgrade to Enterprise to use Workflow Agents',
      canUseGovernance: 'Upgrade to Enterprise to use Governance & Compliance',
      canUseModelControls: 'Upgrade to Enterprise to use Model Controls',
    },
    business: {
      canUseRepoAwareness: 'Upgrade to Enterprise to use Repo Awareness',
      canUseWorkflowAgents: 'Upgrade to Enterprise to use Workflow Agents',
      canUseGovernance: 'Upgrade to Enterprise to use Governance & Compliance',
      canUseModelControls: 'Upgrade to Enterprise to use Model Controls',
      canUseSSO: 'Upgrade to Enterprise to use SSO',
    },
    enterprise: {},
  }

  return tierMessages[currentTier][feature as string] || 'Upgrade your plan to access this feature'
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: keyof SubscriptionFeatures): SubscriptionTier {
  const tiers: SubscriptionTier[] = ['free', 'starter', 'solo', 'team', 'pro', 'business', 'enterprise']

  for (const tier of tiers) {
    if (hasFeature(tier, feature)) {
      return tier
    }
  }

  return 'enterprise'
}

/**
 * Check if tier upgrade is needed
 */
export function needsUpgrade(
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'solo', 'team', 'pro', 'business', 'enterprise']
  const currentIndex = tierOrder.indexOf(currentTier)
  const requiredIndex = tierOrder.indexOf(requiredTier)

  return currentIndex < requiredIndex
}

/**
 * Get recommended upgrade tier
 */
export function getRecommendedUpgrade(currentTier: SubscriptionTier): SubscriptionTier | null {
  const upgradeMap: Record<SubscriptionTier, SubscriptionTier | null> = {
    free: 'solo',
    starter: 'pro',
    solo: 'team',
    team: 'pro',
    pro: 'business',
    business: 'enterprise',
    enterprise: null,
  }

  return upgradeMap[currentTier]
}

/**
 * Format subscription tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  return SUBSCRIPTION_LIMITS[tier].displayName
}

/**
 * Get subscription price
 */
export function getTierPrice(tier: SubscriptionTier, interval: 'monthly' | 'annual' = 'monthly'): number {
  const limits = SUBSCRIPTION_LIMITS[tier]

  if (interval === 'annual' && 'annualPrice' in limits) {
    return limits.annualPrice as number
  }

  return limits.price
}

/**
 * Calculate annual savings
 */
export function calculateAnnualSavings(tier: SubscriptionTier): number {
  const limits = SUBSCRIPTION_LIMITS[tier]
  const monthlyTotal = limits.price * 12
  const annualPrice = 'annualPrice' in limits ? (limits.annualPrice as number) : monthlyTotal

  return monthlyTotal - annualPrice
}
