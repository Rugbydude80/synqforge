/**
 * Pricing Component Test Utilities
 * 
 * Helper functions for testing plan upgrade/downgrade scenarios
 * and simulating user entitlement transitions.
 */

// Test utilities for pricing components
// Imports removed as they're not currently used in this file
import type { Plan } from '@/components/pricing/PricingGrid'
import plansData from '@/config/plans.json'

export type SubscriptionTier = 'starter' | 'core' | 'pro' | 'team' | 'enterprise'

export interface UpgradeSimulationResult {
  planId: string
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  upgradeAllowed: boolean
  buttonText: string
  featuresUnlocked: string[]
  featuresLocked: string[]
}

/**
 * Simulate a plan upgrade scenario
 * 
 * @param currentTier - User's current subscription tier
 * @param targetTier - Tier they want to upgrade to
 * @returns Simulation result with upgrade details
 */
export function simulateUpgrade(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): UpgradeSimulationResult {
  const plans = Object.values(plansData.tiers) as any[]
  const currentPlan = plans.find((p) => p.id === currentTier)
  const targetPlan = plans.find((p) => p.id === targetTier)

  if (!currentPlan || !targetPlan) {
    throw new Error(`Plan not found: ${currentTier} or ${targetTier}`)
  }

  // Tier hierarchy for upgrade validation
  const tierOrder: SubscriptionTier[] = ['starter', 'core', 'pro', 'team', 'enterprise']
  const currentIndex = tierOrder.indexOf(currentTier)
  const targetIndex = tierOrder.indexOf(targetTier)
  const upgradeAllowed = targetIndex > currentIndex

  // Determine button text based on target plan
  let buttonText = 'Start Free Trial'
  if (targetTier === 'starter') {
    buttonText = 'Continue with Starter Plan'
  } else if (targetTier === 'enterprise') {
    buttonText = 'Contact Sales →'
  }

  // Features that would be unlocked
  const featuresUnlocked: string[] = []
  const featuresLocked: string[] = []

  // Compare features between tiers
  const currentFeatures = new Set<string>(
    currentPlan.features?.map((f: string) => f.toLowerCase()) || []
  )
  const targetFeatures = new Set<string>(
    targetPlan.features?.map((f: string) => f.toLowerCase()) || []
  )

  targetFeatures.forEach((feature) => {
    if (!currentFeatures.has(feature)) {
      featuresUnlocked.push(feature)
    }
  })

  currentFeatures.forEach((feature) => {
    if (!targetFeatures.has(feature)) {
      featuresLocked.push(feature)
    }
  })

  return {
    planId: targetTier,
    currentTier,
    targetTier,
    upgradeAllowed,
    buttonText,
    featuresUnlocked,
    featuresLocked,
  }
}

/**
 * Simulate a plan downgrade scenario
 * 
 * @param currentTier - User's current subscription tier
 * @param targetTier - Tier they want to downgrade to
 * @returns Simulation result with downgrade details
 */
export function simulateDowngrade(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): UpgradeSimulationResult {
  const plans = Object.values(plansData.tiers) as any[]
  const currentPlan = plans.find((p) => p.id === currentTier)
  const targetPlan = plans.find((p) => p.id === targetTier)

  if (!currentPlan || !targetPlan) {
    throw new Error(`Plan not found: ${currentTier} or ${targetTier}`)
  }

  // Tier hierarchy for downgrade validation
  const tierOrder: SubscriptionTier[] = ['starter', 'core', 'pro', 'team', 'enterprise']
  const currentIndex = tierOrder.indexOf(currentTier)
  const targetIndex = tierOrder.indexOf(targetTier)
  const upgradeAllowed = targetIndex < currentIndex // Downgrade is opposite of upgrade

  // Determine button text
  let buttonText = 'Start Free Trial'
  if (targetTier === 'starter') {
    buttonText = 'Continue with Starter Plan'
  } else if (targetTier === 'enterprise') {
    buttonText = 'Contact Sales →'
  }

  // Features that would be lost
  const featuresUnlocked: string[] = []
  const featuresLocked: string[] = []

  const currentFeatures = new Set<string>(
    currentPlan.features?.map((f: string) => f.toLowerCase()) || []
  )
  const targetFeatures = new Set<string>(
    targetPlan.features?.map((f: string) => f.toLowerCase()) || []
  )

  // Features lost in downgrade
  currentFeatures.forEach((feature) => {
    if (!targetFeatures.has(feature)) {
      featuresLocked.push(feature)
    }
  })

  // Features still available
  targetFeatures.forEach((feature) => {
    if (currentFeatures.has(feature)) {
      featuresUnlocked.push(feature)
    }
  })

  return {
    planId: targetTier,
    currentTier,
    targetTier,
    upgradeAllowed,
    buttonText,
    featuresUnlocked,
    featuresLocked,
  }
}

/**
 * Get plans array from config
 * Helper to avoid duplicating plan conversion logic
 */
function getPlansArray(): Plan[] {
  return Object.values(plansData.tiers).map((tier: any) => ({
    id: tier.id,
    name: tier.name,
    label: tier.label,
    price: tier.price,
    priceAnnual: tier.priceAnnual,
    description: tier.description,
    minSeats: tier.minSeats,
    maxSeats: tier.maxSeats,
    features: tier.features || [],
    limitations: tier.limitations || [],
    popular: tier.popular || false,
    discount: tier.discount,
    discountNote: tier.discountNote,
  })) as Plan[]
}

/**
 * Render PricingGrid with current plan context
 * Useful for testing upgrade/downgrade UI states
 * 
 * Note: This function returns the render result, but the actual rendering
 * should be done in test files using React Testing Library directly.
 * This helper just provides the plan data.
 */
export function getPlansForContext(): Plan[] {
  return getPlansArray()
}

/**
 * Assert that a feature is visible for a tier
 * This is a helper that throws errors - use it with vitest's expect in test files
 */
export function expectFeatureVisible(
  container: HTMLElement,
  featureKeyword: string,
  shouldBeVisible: boolean = true
) {
  const text = container.textContent?.toLowerCase() || ''
  const hasFeature = text.includes(featureKeyword.toLowerCase())

  if (shouldBeVisible) {
    if (!hasFeature) {
      throw new Error(`Expected feature "${featureKeyword}" to be visible but it was not found`)
    }
  } else {
    if (hasFeature) {
      throw new Error(`Expected feature "${featureKeyword}" to be hidden but it was found`)
    }
  }
}

