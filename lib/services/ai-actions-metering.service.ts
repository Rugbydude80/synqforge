/**
 * AI Actions Metering Service
 * Tracks AI actions separately from tokens for 2025 pricing model
 * Handles per-user allowances, pooling, rollover, and preflight estimates
 */

import { db } from '@/lib/db';
import { aiActionUsage, organizations } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { SUBSCRIPTION_LIMITS, AI_ACTION_COSTS } from '@/lib/constants';
import { generateId } from '@/lib/db';

export interface AIActionEstimate {
  actionType: keyof typeof AI_ACTION_COSTS;
  estimatedCost: number;
  currentUsage: number;
  allowance: number;
  remainingActions: number;
  wouldExceed: boolean;
  recommendation?: string;
}

export interface AIActionUsageResult {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
  percentage: number;
  isWarning?: boolean;
  upgradeUrl?: string;
  manageUrl?: string;
}

export interface RolloverResult {
  previousPeriodUnused: number;
  rolloverAmount: number;
  rolloverPercentage: number;
  addedToAllowance: number;
}

export class AIActionsMetering {
  /**
   * Get current billing period start and end dates
   */
  private getBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * Calculate total AI action allowance for a user/org
   */
  async calculateAllowance(organizationId: string, userId: string): Promise<number> {
    // Get organization subscription tier
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) throw new Error('Organization not found');

    const tier = org.subscriptionTier || 'starter';
    const limits = SUBSCRIPTION_LIMITS[tier];

    let totalAllowance = 0;

    // Calculate base allowance
    if (limits.aiActionsPoolingEnabled) {
      // Team/Enterprise: Base pool + per-seat allocation
      // Get member count - using a simple count query
      const memberCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE organization_id = ${organizationId}
      `);

      const seats = memberCount[0]?.count || 1;
      totalAllowance = limits.monthlyAIActions + (limits.aiActionsPerSeat || 0) * seats;
    } else {
      // Starter/Pro: Per-user allowance
      totalAllowance = limits.monthlyAIActions;
    }

    // Add rollover if applicable (Pro tier: 20%)
    if (limits.aiActionsRolloverPercent > 0) {
      const rollover = await this.calculateRollover(organizationId, userId);
      totalAllowance += rollover.addedToAllowance;
    }

    return totalAllowance;
  }

  /**
   * Calculate rollover from previous period (Pro tier: 20%)
   */
  async calculateRollover(organizationId: string, userId: string): Promise<RolloverResult> {
    const { start } = this.getBillingPeriod();
    const previousStart = new Date(start);
    previousStart.setMonth(previousStart.getMonth() - 1);
    const previousEnd = new Date(start);
    previousEnd.setSeconds(previousEnd.getSeconds() - 1);

    // Get previous period usage
    const previousUsage = await db.query.aiActionUsage.findFirst({
      where: and(
        eq(aiActionUsage.organizationId, organizationId),
        eq(aiActionUsage.userId, userId),
        gte(aiActionUsage.billingPeriodStart, previousStart),
        lte(aiActionUsage.billingPeriodEnd, previousEnd)
      ),
    });

    if (!previousUsage) {
      return {
        previousPeriodUnused: 0,
        rolloverAmount: 0,
        rolloverPercentage: 0,
        addedToAllowance: 0,
      };
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    const tier = org?.subscriptionTier || 'starter';
    const limits = SUBSCRIPTION_LIMITS[tier];

    const unused = Math.max(0, previousUsage.allowance - previousUsage.actionsUsed);
    const rolloverPercentage = limits.aiActionsRolloverPercent || 0;
    const rolloverAmount = Math.floor(unused * (rolloverPercentage / 100));

    return {
      previousPeriodUnused: unused,
      rolloverAmount,
      rolloverPercentage,
      addedToAllowance: rolloverAmount,
    };
  }

  /**
   * Get current usage for user/org
   */
  async getCurrentUsage(organizationId: string, userId: string): Promise<{
    actionsUsed: number;
    allowance: number;
    remaining: number;
    percentage: number;
  }> {
    const { start, end } = this.getBillingPeriod();

    // Get or create current period record
    let usage = await db.query.aiActionUsage.findFirst({
      where: and(
        eq(aiActionUsage.organizationId, organizationId),
        eq(aiActionUsage.userId, userId),
        gte(aiActionUsage.billingPeriodStart, start),
        lte(aiActionUsage.billingPeriodEnd, end)
      ),
    });

    if (!usage) {
      // Create new period record
      const allowance = await this.calculateAllowance(organizationId, userId);
      
      const [newUsage] = await db.insert(aiActionUsage).values({
        id: generateId(),
        organizationId,
        userId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        actionsUsed: 0,
        allowance,
        lastUpdatedAt: new Date(),
      }).returning();

      usage = newUsage;
    }

    const remaining = Math.max(0, usage.allowance - usage.actionsUsed);
    const percentage = usage.allowance > 0 ? Math.round((usage.actionsUsed / usage.allowance) * 100) : 0;

    return {
      actionsUsed: usage.actionsUsed,
      allowance: usage.allowance,
      remaining,
      percentage,
    };
  }

  /**
   * Preflight estimate for an AI action
   */
  async estimateAction(
    organizationId: string,
    userId: string,
    actionType: keyof typeof AI_ACTION_COSTS
  ): Promise<AIActionEstimate> {
    const estimatedCost = AI_ACTION_COSTS[actionType];
    const usage = await this.getCurrentUsage(organizationId, userId);

    const wouldExceed = usage.actionsUsed + estimatedCost > usage.allowance;
    let recommendation: string | undefined;

    if (wouldExceed) {
      recommendation = `This operation requires ${estimatedCost} AI ${estimatedCost === 1 ? 'action' : 'actions'}. You have ${usage.remaining} remaining. Consider upgrading or purchasing an overage pack.`;
    } else if (usage.remaining < 5) {
      recommendation = `Low on AI actions! Only ${usage.remaining} remaining this month.`;
    }

    return {
      actionType,
      estimatedCost,
      currentUsage: usage.actionsUsed,
      allowance: usage.allowance,
      remainingActions: usage.remaining,
      wouldExceed,
      recommendation,
    };
  }

  /**
   * Check if user can perform an AI action (with soft caps for Team tier)
   */
  async canPerformAction(
    organizationId: string,
    userId: string,
    actionType: keyof typeof AI_ACTION_COSTS
  ): Promise<AIActionUsageResult> {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      return {
        allowed: false,
        reason: 'Organization not found',
        used: 0,
        limit: 0,
        percentage: 0,
      };
    }

    const tier = org.subscriptionTier || 'starter';
    const limits = SUBSCRIPTION_LIMITS[tier];
    const actionCost = AI_ACTION_COSTS[actionType];
    const usage = await this.getCurrentUsage(organizationId, userId);

    // Check if pooling is enabled (Team/Enterprise)
    if (limits.aiActionsPoolingEnabled) {
      // For pooled allowances, check soft per-user cap if configured
      const softCap = limits.softPerUserCap || Infinity;
      
      if (usage.actionsUsed + actionCost > softCap) {
        return {
          allowed: false,
          reason: `Soft per-user limit reached (${softCap} actions). Contact admin for approval.`,
          used: usage.actionsUsed,
          limit: softCap,
          percentage: Math.round((usage.actionsUsed / softCap) * 100),
          upgradeUrl: '/settings/billing',
        };
      }
    }

    // Check hard limit
    if (usage.actionsUsed + actionCost > usage.allowance) {
      return {
        allowed: false,
        reason: `Monthly AI action limit reached (${usage.allowance} actions)`,
        used: usage.actionsUsed,
        limit: usage.allowance,
        percentage: 100,
        upgradeUrl: '/settings/billing',
        manageUrl: '/settings/billing',
      };
    }

    // Warning at 90%
    const isWarning = usage.percentage >= 90;

    return {
      allowed: true,
      used: usage.actionsUsed,
      limit: usage.allowance,
      percentage: usage.percentage,
      isWarning,
      reason: isWarning ? `${usage.remaining} AI actions remaining (${usage.percentage}% used)` : undefined,
    };
  }

  /**
   * Record an AI action usage
   */
  async recordAction(
    organizationId: string,
    userId: string,
    actionType: keyof typeof AI_ACTION_COSTS,
    _metadata?: Record<string, any>
  ): Promise<void> {
    const { start, end } = this.getBillingPeriod();
    const actionCost = AI_ACTION_COSTS[actionType];

    // Get or create current period record
    const usage = await db.query.aiActionUsage.findFirst({
      where: and(
        eq(aiActionUsage.organizationId, organizationId),
        eq(aiActionUsage.userId, userId),
        gte(aiActionUsage.billingPeriodStart, start),
        lte(aiActionUsage.billingPeriodEnd, end)
      ),
    });

    if (!usage) {
      const allowance = await this.calculateAllowance(organizationId, userId);
      
      await db.insert(aiActionUsage).values({
        id: generateId(),
        organizationId,
        userId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        actionsUsed: actionCost,
        allowance,
        actionBreakdown: { [actionType]: 1 },
        lastUpdatedAt: new Date(),
      });
    } else {
      // Update existing record
      const breakdown = usage.actionBreakdown as Record<string, number> || {};
      breakdown[actionType] = (breakdown[actionType] || 0) + 1;

      await db
        .update(aiActionUsage)
        .set({
          actionsUsed: sql`${aiActionUsage.actionsUsed} + ${actionCost}`,
          actionBreakdown: breakdown,
          lastUpdatedAt: new Date(),
        })
        .where(eq(aiActionUsage.id, usage.id));
    }
  }

  /**
   * Get usage history for display
   */
  async getUsageHistory(organizationId: string, userId: string, months: number = 3) {
    const history = await db.query.aiActionUsage.findMany({
      where: and(
        eq(aiActionUsage.organizationId, organizationId),
        eq(aiActionUsage.userId, userId)
      ),
      orderBy: [desc(aiActionUsage.billingPeriodStart)],
      limit: months,
    });

    return history.map(period => ({
      periodStart: period.billingPeriodStart,
      periodEnd: period.billingPeriodEnd,
      actionsUsed: period.actionsUsed,
      allowance: period.allowance,
      percentage: Math.round((period.actionsUsed / period.allowance) * 100),
      breakdown: period.actionBreakdown as Record<string, number>,
    }));
  }
}

export const aiActionsMetering = new AIActionsMetering();

