/**
 * Feature Gates for Story Refinement
 * Controls access to features based on subscription tier
 */

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  BASIC = 'basic',
  CORE = 'core',
  PRO = 'pro',
  TEAM = 'team',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin',
}

export enum Feature {
  REFINE_STORY = 'refine_story',
  AI_GENERATION = 'ai_generation',
  ADVANCED_ANALYTICS = 'advanced_analytics',
}

const FEATURE_GATES: Record<Feature, SubscriptionTier[]> = {
  [Feature.REFINE_STORY]: [
    SubscriptionTier.PRO,
    SubscriptionTier.TEAM,
    SubscriptionTier.ENTERPRISE,
    SubscriptionTier.ADMIN,
  ],
  [Feature.AI_GENERATION]: [
    SubscriptionTier.PRO,
    SubscriptionTier.TEAM,
    SubscriptionTier.ENTERPRISE,
    SubscriptionTier.ADMIN,
  ],
  [Feature.ADVANCED_ANALYTICS]: [
    SubscriptionTier.TEAM,
    SubscriptionTier.ENTERPRISE,
    SubscriptionTier.ADMIN,
  ],
};

/**
 * Check if a user's tier can access a feature
 */
export function canAccessFeature(
  userTier: string | SubscriptionTier,
  feature: Feature
): boolean {
  const allowedTiers = FEATURE_GATES[feature];
  // Normalize tier names (handle case variations)
  const normalizedTier = userTier.toLowerCase() as SubscriptionTier;
  
  // Admin gets access to everything
  if (normalizedTier === SubscriptionTier.ADMIN) {
    return true;
  }
  
  return allowedTiers.includes(normalizedTier);
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTierForFeature(feature: Feature): SubscriptionTier {
  const allowedTiers = FEATURE_GATES[feature];
  // Return the lowest tier that has access
  if (allowedTiers.includes(SubscriptionTier.PRO)) return SubscriptionTier.PRO;
  if (allowedTiers.includes(SubscriptionTier.TEAM)) return SubscriptionTier.TEAM;
  return SubscriptionTier.ENTERPRISE;
}

