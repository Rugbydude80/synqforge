/**
 * Story Update Entitlement Checker
 *
 * Validates if a user can update a story based on their subscription tier
 * and current usage limits.
 *
 * Tier Limits:
 * - Free: 5 updates/month total
 * - Pro: 1000 updates/month
 * - Team: unlimited updates with approval required for Done/Closed stories
 * - Enterprise: unlimited updates with configurable policies
 */

import { db } from '@/lib/db';
import { storyUpdates, users } from '@/lib/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';

export interface StoryUpdateCheck {
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  requiresApproval?: boolean;
  upgradeRequired?: boolean;
  upgradeTier?: string;
  upgradeUrl?: string;
}

export interface StoryUpdateContext {
  userId: string;
  storyId: string;
  organizationId: string;
  tier: string;
  storyStatus?: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
}

/**
 * Check if user is allowed to update a story based on tier limits
 */
export async function checkStoryUpdateEntitlement(
  context: StoryUpdateContext
): Promise<StoryUpdateCheck> {
  const { userId, storyId: _storyId, organizationId, tier } = context;

  // Get tier limits
  const tierLimits = getTierUpdateLimits(tier);

  // Check if story update feature is enabled for this tier
  if (!tierLimits.canUpdate) {
    return {
      allowed: false,
      reason: 'Story update feature not available on your tier',
      upgradeRequired: true,
      upgradeTier: 'pro',
      upgradeUrl: '/pricing',
    };
  }

  // For Team and Enterprise tiers with Done/Closed stories, check approval requirement
  if (tierLimits.requiresApprovalForDone && context.storyStatus) {
    if (context.storyStatus === 'done' || context.storyStatus === 'blocked') {
      // Check if user has approval permissions (admin/owner role)
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user && user.role !== 'admin' && user.role !== 'owner') {
        return {
          allowed: false,
          reason: 'Updating Done/Blocked stories requires admin approval on Team tier',
          requiresApproval: true,
        };
      }
    }
  }

  // Check monthly update limit
  if (tierLimits.monthlyLimit !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const updatesThisMonth = await db
      .select({ count: count() })
      .from(storyUpdates)
      .where(
        and(
          tierLimits.perUser
            ? eq(storyUpdates.userId, userId)
            : eq(storyUpdates.organizationId, organizationId),
          gte(storyUpdates.updatedAt, startOfMonth)
        )
      );

    const usedUpdates = updatesThisMonth[0]?.count || 0;

    if (usedUpdates >= tierLimits.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly update limit reached (${tierLimits.monthlyLimit} updates/month)`,
        limit: tierLimits.monthlyLimit,
        used: usedUpdates,
        remaining: 0,
        upgradeRequired: true,
        upgradeTier: tier === 'free' ? 'pro' : 'team',
        upgradeUrl: '/pricing',
      };
    }

    return {
      allowed: true,
      limit: tierLimits.monthlyLimit,
      used: usedUpdates,
      remaining: tierLimits.monthlyLimit - usedUpdates,
    };
  }

  // Unlimited updates
  return {
    allowed: true,
  };
}

/**
 * Get tier-specific update limits
 */
function getTierUpdateLimits(tier: string) {
  switch (tier) {
    case 'free':
    case 'starter':
      return {
        canUpdate: true,
        monthlyLimit: 5,
        perUser: true,
        requiresApprovalForDone: false,
      };

    case 'solo':
    case 'pro_solo':
    case 'pro_collaborative':
    case 'pro':
      return {
        canUpdate: true,
        monthlyLimit: 1000,
        perUser: true,
        requiresApprovalForDone: false,
      };

    case 'team':
      return {
        canUpdate: true,
        monthlyLimit: Infinity,
        perUser: false,
        requiresApprovalForDone: true, // Require approval for Done/Blocked stories
      };

    case 'business':
    case 'enterprise':
      return {
        canUpdate: true,
        monthlyLimit: Infinity,
        perUser: false,
        requiresApprovalForDone: false, // Configurable via org settings
      };

    default:
      return {
        canUpdate: false,
        monthlyLimit: 0,
        perUser: true,
        requiresApprovalForDone: false,
      };
  }
}

/**
 * Get update usage stats for a user or organization
 */
export async function getUpdateUsageStats(
  organizationId: string,
  userId?: string,
  tier?: string
) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const tierLimits = tier ? getTierUpdateLimits(tier) : null;

  const updatesThisMonth = await db
    .select({ count: count() })
    .from(storyUpdates)
    .where(
      and(
        userId && tierLimits?.perUser
          ? eq(storyUpdates.userId, userId)
          : eq(storyUpdates.organizationId, organizationId),
        gte(storyUpdates.updatedAt, startOfMonth)
      )
    );

  const usedUpdates = updatesThisMonth[0]?.count || 0;
  const limit = tierLimits?.monthlyLimit || Infinity;

  return {
    used: usedUpdates,
    limit: limit === Infinity ? null : limit,
    remaining: limit === Infinity ? null : limit - usedUpdates,
    percentUsed: limit === Infinity ? 0 : Math.round((usedUpdates / limit) * 100),
    unlimitedUpdates: limit === Infinity,
  };
}

/**
 * Calculate diff between old and new story data
 */
export function calculateStoryDiff(
  oldStory: any,
  newStory: any
): Record<string, { before: any; after: any }> {
  const diff: Record<string, { before: any; after: any }> = {};

  const fieldsToTrack = [
    'title',
    'description',
    'acceptanceCriteria',
    'storyPoints',
    'priority',
    'status',
    'storyType',
    'tags',
    'labels',
    'assigneeId',
    'epicId',
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldStory[field];
    const newValue = newStory[field];

    // Deep comparison for arrays and objects
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff[field] = {
        before: oldValue,
        after: newValue,
      };
    }
  }

  return diff;
}
