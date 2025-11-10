/**
 * AI Context Actions Service
 * Handles AI action tracking and deduction based on context levels
 */

import { db } from '@/lib/db';
import { aiActionUsage, organizations, users } from '@/lib/db/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { generateId } from '@/lib/utils';
import { ContextLevel, UserTier, CONTEXT_CONFIGS, TIER_CONTEXT_ACCESS, TIER_MONTHLY_LIMITS } from '@/lib/types/context.types';
import { ContextAccessService } from './context-access.service';

interface ActionCheckResult {
  allowed: boolean;
  reason?: string;
  actionsUsed: number;
  actionsRemaining: number;
  monthlyLimit: number;
  nearLimit: boolean;
  actionCost: number;
}

interface ActionDeductionResult {
  success: boolean;
  actionsUsed: number;
  actionsRemaining: number;
  breakdown: Record<string, number>;
}

interface UsageStats {
  actionsUsed: number;
  actionsRemaining: number;
  monthlyLimit: number;
  breakdown: Record<string, number>;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  nearLimit: boolean;
  percentageUsed: number;
}

export class AIContextActionsService {
  /**
   * Get current billing period (1st of month to last day of month)
   */
  private getBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Get user's tier from organization
   */
  private async getUserTier(organizationId: string): Promise<UserTier> {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Map subscription tier to UserTier enum
    const tierMap: Record<string, UserTier> = {
      'starter': UserTier.STARTER,
      'core': UserTier.CORE,
      'pro': UserTier.PRO,
      'team': UserTier.TEAM,
      'enterprise': UserTier.ENTERPRISE,
    };

    return tierMap[org.subscriptionTier || 'starter'] || UserTier.STARTER;
  }

  /**
   * Get monthly action limit for user's tier
   */
  private async getMonthlyLimit(organizationId: string): Promise<number> {
    const tier = await this.getUserTier(organizationId);
    return ContextAccessService.getMonthlyLimit(tier);
  }

  /**
   * Get or create usage record for current billing period
   */
  private async getOrCreateUsage(organizationId: string, userId: string) {
    const { start, end } = this.getBillingPeriod();
    const monthlyLimit = await this.getMonthlyLimit(organizationId);

    // Try to find existing record
    let usage = await db.query.aiActionUsage.findFirst({
      where: and(
        eq(aiActionUsage.organizationId, organizationId),
        eq(aiActionUsage.userId, userId),
        eq(aiActionUsage.billingPeriodStart, start)
      ),
    });

    // Create if doesn't exist
    if (!usage) {
      const newUsage = {
        id: generateId(),
        organizationId,
        userId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        actionsUsed: 0,
        allowance: monthlyLimit,
        actionBreakdown: {},
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
      };

      await db.insert(aiActionUsage).values(newUsage);
      
      usage = await db.query.aiActionUsage.findFirst({
        where: and(
          eq(aiActionUsage.organizationId, organizationId),
          eq(aiActionUsage.userId, userId),
          eq(aiActionUsage.billingPeriodStart, start)
        ),
      });
    }

    return usage;
  }

  /**
   * Check if user can perform action with specified context level
   */
  async canPerformAction(
    organizationId: string,
    userId: string,
    contextLevel: ContextLevel
  ): Promise<ActionCheckResult> {
    try {
      // Get user's tier
      const tier = await this.getUserTier(organizationId);

      // Check if tier has access to this context level
      const hasAccess = ContextAccessService.canAccessContextLevel(tier, contextLevel);
      if (!hasAccess) {
        const upgradeMessage = ContextAccessService.getUpgradeMessage(tier, contextLevel);
        return {
          allowed: false,
          reason: upgradeMessage,
          actionsUsed: 0,
          actionsRemaining: 0,
          monthlyLimit: 0,
          nearLimit: false,
          actionCost: ContextAccessService.getActionsRequired(contextLevel),
        };
      }

      // Get current usage
      const usage = await this.getOrCreateUsage(organizationId, userId);
      if (!usage) {
        throw new Error('Failed to get usage record');
      }

      const monthlyLimit = usage.allowance;
      const actionsUsed = usage.actionsUsed;
      const actionsRemaining = monthlyLimit - actionsUsed;
      const actionCost = ContextAccessService.getActionsRequired(contextLevel);

      // Check if enough actions remaining
      if (actionsRemaining < actionCost) {
        return {
          allowed: false,
          reason: `Insufficient AI actions. Need ${actionCost}, have ${actionsRemaining} remaining. Your quota resets on the 1st of next month.`,
          actionsUsed,
          actionsRemaining,
          monthlyLimit,
          nearLimit: true,
          actionCost,
        };
      }

      // Check if near limit (90% threshold)
      const nearLimit = actionsUsed / monthlyLimit >= 0.9;

      return {
        allowed: true,
        reason: nearLimit ? `⚠️ You're running low on AI actions. ${actionsRemaining} remaining this month.` : undefined,
        actionsUsed,
        actionsRemaining,
        monthlyLimit,
        nearLimit,
        actionCost,
      };
    } catch (error) {
      console.error('Error checking action availability:', error);
      return {
        allowed: false,
        reason: 'Error checking AI action availability',
        actionsUsed: 0,
        actionsRemaining: 0,
        monthlyLimit: 0,
        nearLimit: false,
        actionCost: 0,
      };
    }
  }

  /**
   * Deduct AI actions for a generation
   */
  async deductActions(
    organizationId: string,
    userId: string,
    contextLevel: ContextLevel,
    metadata?: Record<string, any>
  ): Promise<ActionDeductionResult> {
    try {
      const usage = await this.getOrCreateUsage(organizationId, userId);
      if (!usage) {
        throw new Error('Failed to get usage record');
      }

      const actionCost = ContextAccessService.getActionsRequired(contextLevel);
      
      // Update breakdown
      const breakdown = (usage.actionBreakdown as Record<string, number>) || {};
      breakdown[contextLevel] = (breakdown[contextLevel] || 0) + 1;

      // Atomic update
      await db
        .update(aiActionUsage)
        .set({
          actionsUsed: sql`${aiActionUsage.actionsUsed} + ${actionCost}`,
          actionBreakdown: breakdown,
          lastUpdatedAt: new Date(),
        })
        .where(eq(aiActionUsage.id, usage.id));

      // Get updated usage
      const updatedUsage = await db.query.aiActionUsage.findFirst({
        where: eq(aiActionUsage.id, usage.id),
      });

      if (!updatedUsage) {
        throw new Error('Failed to get updated usage');
      }

      const actionsRemaining = updatedUsage.allowance - updatedUsage.actionsUsed;

      console.log(`✅ Deducted ${actionCost} AI actions for ${contextLevel} (${updatedUsage.actionsUsed}/${updatedUsage.allowance} used)`);

      return {
        success: true,
        actionsUsed: updatedUsage.actionsUsed,
        actionsRemaining,
        breakdown: updatedUsage.actionBreakdown as Record<string, number>,
      };
    } catch (error) {
      console.error('Error deducting actions:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for user
   */
  async getUsageStats(organizationId: string, userId: string): Promise<UsageStats> {
    const usage = await this.getOrCreateUsage(organizationId, userId);
    if (!usage) {
      throw new Error('Failed to get usage record');
    }

    const { start, end } = this.getBillingPeriod();
    const actionsRemaining = usage.allowance - usage.actionsUsed;
    const percentageUsed = (usage.actionsUsed / usage.allowance) * 100;
    const nearLimit = percentageUsed >= 90;

    return {
      actionsUsed: usage.actionsUsed,
      actionsRemaining,
      monthlyLimit: usage.allowance,
      breakdown: (usage.actionBreakdown as Record<string, number>) || {},
      billingPeriodStart: start,
      billingPeriodEnd: end,
      nearLimit,
      percentageUsed,
    };
  }

  /**
   * Get usage stats for organization (all users)
   */
  async getOrganizationUsageStats(organizationId: string): Promise<{
    totalActionsUsed: number;
    totalActionsRemaining: number;
    monthlyLimit: number;
    userCount: number;
    breakdown: Record<string, number>;
    topUsers: Array<{ userId: string; userName: string; actionsUsed: number }>;
  }> {
    const { start } = this.getBillingPeriod();
    const monthlyLimit = await this.getMonthlyLimit(organizationId);

    // Get all usage records for this org in current period
    const usageRecords = await db.query.aiActionUsage.findMany({
      where: and(
        eq(aiActionUsage.organizationId, organizationId),
        eq(aiActionUsage.billingPeriodStart, start)
      ),
    });

    const totalActionsUsed = usageRecords.reduce((sum, record) => sum + record.actionsUsed, 0);
    const userCount = usageRecords.length;

    // Aggregate breakdown
    const breakdown: Record<string, number> = {};
    usageRecords.forEach(record => {
      const recordBreakdown = (record.actionBreakdown as Record<string, number>) || {};
      Object.entries(recordBreakdown).forEach(([level, count]) => {
        breakdown[level] = (breakdown[level] || 0) + count;
      });
    });

    // Get top users
    const topUsersData = await Promise.all(
      usageRecords
        .sort((a, b) => b.actionsUsed - a.actionsUsed)
        .slice(0, 5)
        .map(async (record) => {
          const user = await db.query.users.findFirst({
            where: eq(users.id, record.userId),
          });
          return {
            userId: record.userId,
            userName: user?.name || user?.email || 'Unknown',
            actionsUsed: record.actionsUsed,
          };
        })
    );

    return {
      totalActionsUsed,
      totalActionsRemaining: monthlyLimit - totalActionsUsed,
      monthlyLimit,
      userCount,
      breakdown,
      topUsers: topUsersData,
    };
  }

  /**
   * Check if user's tier allows specific context level
   */
  async checkTierAccess(
    organizationId: string,
    contextLevel: ContextLevel
  ): Promise<{
    hasAccess: boolean;
    currentTier: UserTier;
    requiredTier?: UserTier;
    upgradeMessage?: string;
  }> {
    const tier = await this.getUserTier(organizationId);
    const hasAccess = ContextAccessService.canAccessContextLevel(tier, contextLevel);

    if (!hasAccess) {
      const upgradeMessage = ContextAccessService.getUpgradeMessage(tier, contextLevel);
      
      // Determine required tier
      let requiredTier: UserTier | undefined;
      if (contextLevel === ContextLevel.STANDARD) {
        requiredTier = UserTier.CORE;
      } else if (contextLevel === ContextLevel.COMPREHENSIVE) {
        requiredTier = UserTier.PRO;
      } else if (contextLevel === ContextLevel.COMPREHENSIVE_THINKING) {
        requiredTier = UserTier.TEAM;
      }

      return {
        hasAccess: false,
        currentTier: tier,
        requiredTier,
        upgradeMessage,
      };
    }

    return {
      hasAccess: true,
      currentTier: tier,
    };
  }
}

// Export singleton instance
export const aiContextActionsService = new AIContextActionsService();

