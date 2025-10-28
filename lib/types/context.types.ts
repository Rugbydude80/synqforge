/**
 * Type definitions for AI context levels and tier-based access control
 */

export enum ContextLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  COMPREHENSIVE = 'comprehensive',
  COMPREHENSIVE_THINKING = 'comprehensive-thinking',
}

export enum UserTier {
  STARTER = 'starter',
  CORE = 'core',
  PRO = 'pro',
  TEAM = 'team',
  ENTERPRISE = 'enterprise',
}

export interface ContextConfig {
  level: ContextLevel;
  actionsRequired: number;
  tokenEstimate: number;
  features: string[];
}

export const CONTEXT_CONFIGS: Record<ContextLevel, ContextConfig> = {
  [ContextLevel.MINIMAL]: {
    level: ContextLevel.MINIMAL,
    actionsRequired: 1,
    tokenEstimate: 2000,
    features: ['Basic story generation', 'INVEST rating'],
  },
  [ContextLevel.STANDARD]: {
    level: ContextLevel.STANDARD,
    actionsRequired: 2,
    tokenEstimate: 3000,
    features: [
      'Project roles & terminology',
      'Example stories for consistency',
      'Common constraints',
    ],
  },
  [ContextLevel.COMPREHENSIVE]: {
    level: ContextLevel.COMPREHENSIVE,
    actionsRequired: 2,
    tokenEstimate: 4500,
    features: [
      'All Standard features',
      'Semantic search (top 5 similar stories)',
      'Epic-level constraints',
      'Dependency detection',
    ],
  },
  [ContextLevel.COMPREHENSIVE_THINKING]: {
    level: ContextLevel.COMPREHENSIVE_THINKING,
    actionsRequired: 3,
    tokenEstimate: 6000,
    features: [
      'All Comprehensive features',
      'Deep reasoning mode',
      'Complex edge case analysis',
      'Compliance & security focus',
    ],
  },
};

export const TIER_CONTEXT_ACCESS: Record<UserTier, ContextLevel[]> = {
  [UserTier.STARTER]: [ContextLevel.MINIMAL],
  [UserTier.CORE]: [ContextLevel.MINIMAL, ContextLevel.STANDARD],
  [UserTier.PRO]: [
    ContextLevel.MINIMAL,
    ContextLevel.STANDARD,
    ContextLevel.COMPREHENSIVE,
  ],
  [UserTier.TEAM]: [
    ContextLevel.MINIMAL,
    ContextLevel.STANDARD,
    ContextLevel.COMPREHENSIVE,
    ContextLevel.COMPREHENSIVE_THINKING,
  ],
  [UserTier.ENTERPRISE]: [
    ContextLevel.MINIMAL,
    ContextLevel.STANDARD,
    ContextLevel.COMPREHENSIVE,
    ContextLevel.COMPREHENSIVE_THINKING,
  ],
};

export const TIER_MONTHLY_LIMITS: Record<UserTier, number> = {
  [UserTier.STARTER]: 25,
  [UserTier.CORE]: 400,
  [UserTier.PRO]: 800,
  [UserTier.TEAM]: 15000,
  [UserTier.ENTERPRISE]: 999999,
};

