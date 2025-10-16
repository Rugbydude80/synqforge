/**
 * AI Usage Tracking Service
 *
 * Handles checking AI usage limits based on subscription tiers
 */

import { db, generateId } from '@/lib/db';
import { aiGenerations, organizations, tokenBalances } from '@/lib/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { SUBSCRIPTION_LIMITS } from '@/lib/constants';
import type { UserContext } from '@/lib/middleware/auth';

export interface UsageStats {
  tokensUsed: number;
  tokensLimit: number;
  generationsCount: number;
  generationsLimit: number;
  percentUsed: number;
  isOverLimit: boolean;
  remainingTokens: number;
  remainingGenerations: number;
  purchasedTokensAvailable?: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: UsageStats;
  upgradeUrl?: string;
}

/**
 * Get the start of the current billing month
 */
function getBillingMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get subscription tier limits for an organization
 */
export async function getOrganizationLimits(organizationId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error('Organization not found');
  }

  const tier = org.subscriptionTier || 'free';
  return SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS];
}

/**
 * Get current month's AI usage statistics for an organization
 */
export async function getMonthlyUsage(organizationId: string): Promise<UsageStats> {
  const monthStart = getBillingMonthStart();
  const limits = await getOrganizationLimits(organizationId);

  // Get token usage and generation count for the current month
  const [usage] = await db
    .select({
      tokensUsed: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)`,
      generationsCount: sql<number>`COUNT(*)`,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.organizationId, organizationId),
        gte(aiGenerations.createdAt, monthStart),
        eq(aiGenerations.status, 'completed')
      )
    );

  const tokensUsed = Number(usage?.tokensUsed || 0);
  const generationsCount = Number(usage?.generationsCount || 0);
  const tokensLimit = limits.monthlyAITokens === Infinity ? Infinity : limits.monthlyAITokens;
  const generationsLimit = limits.monthlyAIGenerations === Infinity ? Infinity : limits.monthlyAIGenerations;

  const percentUsed = tokensLimit === Infinity
    ? 0
    : Math.round((tokensUsed / tokensLimit) * 100);

  const isOverLimit =
    tokensLimit !== Infinity && tokensUsed >= tokensLimit ||
    generationsLimit !== Infinity && generationsCount >= generationsLimit;

  const remainingTokens = tokensLimit === Infinity
    ? Infinity
    : Math.max(0, tokensLimit - tokensUsed);

  const remainingGenerations = generationsLimit === Infinity
    ? Infinity
    : Math.max(0, generationsLimit - generationsCount);

  return {
    tokensUsed,
    tokensLimit,
    generationsCount,
    generationsLimit,
    percentUsed,
    isOverLimit,
    remainingTokens,
    remainingGenerations,
  };
}

/**
 * Check if AI generation is allowed for the organization
 */
export async function checkAIUsageLimit(
  user: UserContext,
  estimatedTokens: number = 1000
): Promise<UsageCheckResult> {
  try {
    const limits = await getOrganizationLimits(user.organizationId);
    const usage = await getMonthlyUsage(user.organizationId);

    // Check if over token limit
    if (limits.monthlyAITokens !== Infinity && usage.tokensUsed >= limits.monthlyAITokens) {
      return {
        allowed: false,
        reason: `Monthly token limit reached (${usage.tokensUsed.toLocaleString()}/${limits.monthlyAITokens.toLocaleString()} tokens). Upgrade your plan or purchase additional tokens.`,
        usage,
        upgradeUrl: '/pricing',
      };
    }

    // Check if over generation count limit
    if (limits.monthlyAIGenerations !== Infinity && usage.generationsCount >= limits.monthlyAIGenerations) {
      return {
        allowed: false,
        reason: `Monthly generation limit reached (${usage.generationsCount}/${limits.monthlyAIGenerations} generations). Upgrade your plan for more AI generations.`,
        usage,
        upgradeUrl: '/pricing',
      };
    }

    // Check if estimated tokens would exceed limit
    if (limits.monthlyAITokens !== Infinity && usage.tokensUsed + estimatedTokens > limits.monthlyAITokens) {
      const remaining = limits.monthlyAITokens - usage.tokensUsed;
      return {
        allowed: false,
        reason: `Insufficient tokens remaining. This operation requires ~${estimatedTokens.toLocaleString()} tokens, but you only have ${remaining.toLocaleString()} tokens left this month.`,
        usage,
        upgradeUrl: '/pricing',
      };
    }

    // All checks passed
    return {
      allowed: true,
      usage,
    };
  } catch (error) {
    console.error('Error checking AI usage limit:', error);
    // Fail open - allow the request but log the error
    return {
      allowed: true,
      reason: 'Usage check failed, allowing request',
    };
  }
}

/**
 * Check if advanced AI features are allowed for the organization
 */
export async function checkAdvancedAIAccess(user: UserContext): Promise<UsageCheckResult> {
  try {
    const limits = await getOrganizationLimits(user.organizationId);

    // Check if organization has any AI modules enabled
    if (!limits.canUseBacklogAutopilot && !limits.canUseACValidator && !limits.canUseTestGeneration) {
      return {
        allowed: false,
        reason: 'AI features require Team plan or higher. Upgrade to unlock AI-powered features.',
        upgradeUrl: '/pricing',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking advanced AI access:', error);
    return {
      allowed: false,
      reason: 'Error checking feature access',
    };
  }
}

/**
 * Check if document analysis is allowed
 */
export async function checkDocumentAnalysisAccess(user: UserContext): Promise<UsageCheckResult> {
  try {
    const limits = await getOrganizationLimits(user.organizationId);

    // Document analysis is part of Backlog Autopilot
    if (!limits.canUseBacklogAutopilot) {
      return {
        allowed: false,
        reason: 'Document analysis requires Team plan or higher. Upgrade to analyze PRDs and generate stories.',
        upgradeUrl: '/pricing',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking document analysis access:', error);
    return {
      allowed: false,
      reason: 'Error checking feature access',
    };
  }
}

/**
 * Get user-friendly usage message for display
 */
export function getUsageMessage(usage: UsageStats): string {
  if (usage.tokensLimit === Infinity) {
    return 'Unlimited AI usage';
  }

  const percentUsed = usage.percentUsed;
  const tokensRemaining = usage.remainingTokens;
  const generationsRemaining = usage.remainingGenerations;

  if (percentUsed >= 90) {
    return `⚠️ Almost at limit: ${tokensRemaining.toLocaleString()} tokens remaining (${100 - percentUsed}% left)`;
  }

  if (percentUsed >= 75) {
    return `${tokensRemaining.toLocaleString()} tokens remaining this month (${100 - percentUsed}% left)`;
  }

  return `${generationsRemaining} AI generations remaining this month`;
}

/**
 * Check if organization can add more users
 */
export async function checkUserLimit(organizationId: string, currentUserCount: number): Promise<UsageCheckResult> {
  try {
    const limits = await getOrganizationLimits(organizationId);

    if (limits.maxSeats !== Infinity && currentUserCount >= limits.maxSeats) {
      return {
        allowed: false,
        reason: `User limit reached (${currentUserCount}/${limits.maxSeats} users). Upgrade to add more team members.`,
        upgradeUrl: '/pricing',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking user limit:', error);
    return {
      allowed: false,
      reason: 'Error checking user limit',
    };
  }
}

/**
 * Get or create token balance for an organization
 */
export async function getTokenBalance(organizationId: string): Promise<number> {
  const [balance] = await db
    .select()
    .from(tokenBalances)
    .where(eq(tokenBalances.organizationId, organizationId))
    .limit(1);

  if (!balance) {
    // Create initial balance record
    await db.insert(tokenBalances).values({
      id: generateId(),
      organizationId,
      purchasedTokens: 0,
      usedTokens: 0,
      bonusTokens: 0,
      totalTokens: 0,
    });
    return 0;
  }

  return balance.totalTokens || 0;
}

/**
 * Add purchased tokens to organization balance
 */
export async function addPurchasedTokens(
  organizationId: string,
  tokens: number,
  _stripeTransactionId: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(tokenBalances)
    .where(eq(tokenBalances.organizationId, organizationId))
    .limit(1);

  if (!existing) {
    // Create new balance
    await db.insert(tokenBalances).values({
      id: generateId(),
      organizationId,
      purchasedTokens: tokens,
      usedTokens: 0,
      bonusTokens: 0,
      totalTokens: tokens,
      lastPurchaseAt: new Date(),
    });
  } else {
    // Update existing balance
    const newPurchasedTokens = existing.purchasedTokens + tokens;
    const newTotalTokens = newPurchasedTokens + existing.bonusTokens - existing.usedTokens;

    await db
      .update(tokenBalances)
      .set({
        purchasedTokens: newPurchasedTokens,
        totalTokens: newTotalTokens,
        lastPurchaseAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tokenBalances.organizationId, organizationId));
  }
}

/**
 * Deduct tokens from organization balance after AI usage
 */
export async function deductTokens(organizationId: string, tokens: number): Promise<void> {
  const [existing] = await db
    .select()
    .from(tokenBalances)
    .where(eq(tokenBalances.organizationId, organizationId))
    .limit(1);

  if (!existing) {
    return; // No balance to deduct from
  }

  const newUsedTokens = existing.usedTokens + tokens;
  const newTotalTokens = existing.purchasedTokens + existing.bonusTokens - newUsedTokens;

  await db
    .update(tokenBalances)
    .set({
      usedTokens: newUsedTokens,
      totalTokens: Math.max(0, newTotalTokens),
      updatedAt: new Date(),
    })
    .where(eq(tokenBalances.organizationId, organizationId));
}
