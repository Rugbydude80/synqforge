/**
 * Context Access Service
 * Manages tier-based access control for AI context levels
 */

import { 
  UserTier, 
  ContextLevel, 
  TIER_CONTEXT_ACCESS, 
  CONTEXT_CONFIGS,
  TIER_MONTHLY_LIMITS 
} from '../types/context.types';

export class ContextAccessService {
  /**
   * Check if user's tier allows specific context level
   */
  static canAccessContextLevel(userTier: UserTier, contextLevel: ContextLevel): boolean {
    const allowedLevels = TIER_CONTEXT_ACCESS[userTier];
    return allowedLevels.includes(contextLevel);
  }

  /**
   * Get maximum context level available for user's tier
   */
  static getMaxContextLevel(userTier: UserTier): ContextLevel {
    const allowedLevels = TIER_CONTEXT_ACCESS[userTier];
    return allowedLevels[allowedLevels.length - 1];
  }

  /**
   * Get default recommended context level for user's tier
   */
  static getDefaultContextLevel(userTier: UserTier): ContextLevel {
    switch (userTier) {
      case UserTier.STARTER:
        return ContextLevel.MINIMAL;
      case UserTier.CORE:
        return ContextLevel.STANDARD;
      case UserTier.PRO:
        return ContextLevel.STANDARD; // Not comprehensive by default
      case UserTier.TEAM:
      case UserTier.ENTERPRISE:
        return ContextLevel.COMPREHENSIVE;
    }
  }

  /**
   * Get AI actions required for context level
   */
  static getActionsRequired(contextLevel: ContextLevel): number {
    return CONTEXT_CONFIGS[contextLevel].actionsRequired;
  }

  /**
   * Validate user has enough actions remaining
   */
  static canAffordGeneration(
    contextLevel: ContextLevel,
    userTier: UserTier,
    actionsUsedThisMonth: number
  ): { allowed: boolean; reason?: string } {
    const actionsRequired = this.getActionsRequired(contextLevel);
    const limit = TIER_MONTHLY_LIMITS[userTier];
    const remaining = limit - actionsUsedThisMonth;

    if (remaining < actionsRequired) {
      return {
        allowed: false,
        reason: `Insufficient AI actions. Need ${actionsRequired}, have ${remaining} remaining.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get upgrade message for locked context levels
   */
  static getUpgradeMessage(currentTier: UserTier, desiredLevel: ContextLevel): string {
    const messages: Record<UserTier, Record<ContextLevel, string>> = {
      [UserTier.STARTER]: {
        [ContextLevel.STANDARD]: 'Upgrade to Core (£10.99/mo) to use project context for 30-40% better accuracy',
        [ContextLevel.COMPREHENSIVE]: 'Upgrade to Pro (£19.99/mo) to use epic context with semantic search',
        [ContextLevel.COMPREHENSIVE_THINKING]: 'Upgrade to Team (£16.99/user) for advanced reasoning mode',
        [ContextLevel.MINIMAL]: '',
      },
      [UserTier.CORE]: {
        [ContextLevel.COMPREHENSIVE]: 'Upgrade to Pro (£19.99/mo) to unlock semantic search with epic context',
        [ContextLevel.COMPREHENSIVE_THINKING]: 'Upgrade to Team (£16.99/user) for advanced reasoning mode',
        [ContextLevel.STANDARD]: '',
        [ContextLevel.MINIMAL]: '',
      },
      [UserTier.PRO]: {
        [ContextLevel.COMPREHENSIVE_THINKING]: 'Upgrade to Team (£16.99/user) to unlock thinking mode for complex stories',
        [ContextLevel.COMPREHENSIVE]: '',
        [ContextLevel.STANDARD]: '',
        [ContextLevel.MINIMAL]: '',
      },
      [UserTier.TEAM]: {
        [ContextLevel.COMPREHENSIVE_THINKING]: '',
        [ContextLevel.COMPREHENSIVE]: '',
        [ContextLevel.STANDARD]: '',
        [ContextLevel.MINIMAL]: '',
      },
      [UserTier.ENTERPRISE]: {
        [ContextLevel.COMPREHENSIVE_THINKING]: '',
        [ContextLevel.COMPREHENSIVE]: '',
        [ContextLevel.STANDARD]: '',
        [ContextLevel.MINIMAL]: '',
      },
    };

    return messages[currentTier]?.[desiredLevel] ?? '';
  }

  /**
   * Get monthly limit for user's tier
   */
  static getMonthlyLimit(userTier: UserTier): number {
    return TIER_MONTHLY_LIMITS[userTier];
  }

  /**
   * Calculate actions remaining
   */
  static getActionsRemaining(userTier: UserTier, actionsUsed: number): number {
    const limit = this.getMonthlyLimit(userTier);
    return Math.max(0, limit - actionsUsed);
  }

  /**
   * Check if user is close to their limit (within 10%)
   */
  static isNearLimit(userTier: UserTier, actionsUsed: number): boolean {
    const limit = this.getMonthlyLimit(userTier);
    return actionsUsed >= limit * 0.9;
  }

  /**
   * Get all allowed context levels for a tier
   */
  static getAllowedContextLevels(userTier: UserTier): ContextLevel[] {
    return TIER_CONTEXT_ACCESS[userTier];
  }
}

