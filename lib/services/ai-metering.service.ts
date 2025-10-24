/**
 * AI Usage Metering Service
 * Handles pooled token tracking, overage billing, and usage alerts
 */

import { db, generateId } from '@/lib/db'
import {
  aiUsageMetering,
  aiUsageAlerts,
  organizations,
  aiGenerations
} from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { SUBSCRIPTION_LIMITS } from '@/lib/constants'

// Legacy overage config (for backward compatibility)
const AI_OVERAGE = {
  unitSize: 10000, // 10k tokens per unit
  pricePerUnit: 2, // $2 per 10k tokens
}

export interface UsageInfo {
  tokenPool: number
  tokensUsed: number
  tokensRemaining: number
  overageTokens: number
  overageCharges: number
  aiActionsCount: number
  heavyJobsCount: number
  usagePercentage: number
  billingPeriodStart: Date
  billingPeriodEnd: Date
  isOverage: boolean
}

export interface UsageCheckResult {
  allowed: boolean
  reason?: string
  tokensAvailable: number
  estimatedCost?: number
}

/**
 * Get current billing period dates
 */
function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

/**
 * Initialize or get AI usage metering for an organization
 */
export async function getOrCreateUsageMetering(organizationId: string): Promise<UsageInfo | null> {
  try {
    const { start, end } = getCurrentBillingPeriod()

    // Get organization tier
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return null
    }

    const tier = org.subscriptionTier || 'free'
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]
    const tokenPool = limits.monthlyAITokens

    // Check if metering record exists for current period
    let [metering] = await db
      .select()
      .from(aiUsageMetering)
      .where(
        and(
          eq(aiUsageMetering.organizationId, organizationId),
          eq(aiUsageMetering.billingPeriodStart, start)
        )
      )
      .limit(1)

    if (!metering) {
      // Create new metering record for current period
      await db.insert(aiUsageMetering).values({
        id: generateId(),
        organizationId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        tokenPool,
        tokensUsed: 0,
        tokensRemaining: tokenPool,
        overageTokens: 0,
        overageCharges: '0',
        aiActionsCount: 0,
        heavyJobsCount: 0,
        lastResetAt: new Date(),
      })

      metering = {
        id: generateId(),
        organizationId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        tokenPool,
        tokensUsed: 0,
        tokensRemaining: tokenPool,
        overageTokens: 0,
        overageCharges: '0',
        aiActionsCount: 0,
        heavyJobsCount: 0,
        lastResetAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Initialize usage alerts
      await initializeUsageAlerts(organizationId)
    }

    const usagePercentage = tokenPool > 0 ? (metering.tokensUsed / tokenPool) * 100 : 0
    const isOverage = metering.overageTokens > 0

    return {
      tokenPool: metering.tokenPool,
      tokensUsed: metering.tokensUsed,
      tokensRemaining: metering.tokensRemaining,
      overageTokens: metering.overageTokens,
      overageCharges: parseFloat(metering.overageCharges as string),
      aiActionsCount: metering.aiActionsCount,
      heavyJobsCount: metering.heavyJobsCount,
      usagePercentage,
      billingPeriodStart: metering.billingPeriodStart,
      billingPeriodEnd: metering.billingPeriodEnd,
      isOverage,
    }
  } catch (error) {
    console.error('Error getting usage metering:', error)
    return null
  }
}

/**
 * Convenience helper to fetch usage metering details.
 * Alias kept for compatibility with older call sites.
 */
export async function getUsageMetering(organizationId: string): Promise<UsageInfo | null> {
  return getOrCreateUsageMetering(organizationId)
}

/**
 * Check if organization can use tokens for an AI action
 */
export async function checkTokenAvailability(
  organizationId: string,
  estimatedTokens: number
): Promise<UsageCheckResult> {
  try {
    const usage = await getOrCreateUsageMetering(organizationId)

    if (!usage) {
      return {
        allowed: false,
        reason: 'Organization not found',
        tokensAvailable: 0,
      }
    }

    // Get organization tier to check if overage is allowed
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    const tier = org?.subscriptionTier || 'free'

    // Free tier cannot use tokens in overage
    if (tier === 'free' && usage.tokensRemaining < estimatedTokens) {
      return {
        allowed: false,
        reason: 'Token pool exhausted. Upgrade to Team or Business for more tokens.',
        tokensAvailable: usage.tokensRemaining,
      }
    }

    // Paid tiers can go into overage
    if (usage.tokensRemaining < estimatedTokens) {
      const overageTokens = estimatedTokens - usage.tokensRemaining
      const overageCost = calculateOverageCost(overageTokens)

      return {
        allowed: true,
        tokensAvailable: usage.tokensRemaining,
        estimatedCost: overageCost,
        reason: `This action will use ${overageTokens} overage tokens (£${overageCost.toFixed(2)} additional cost)`,
      }
    }

    return {
      allowed: true,
      tokensAvailable: usage.tokensRemaining,
    }
  } catch (error) {
    console.error('Error checking token availability:', error)
    return {
      allowed: false,
      reason: 'Error checking token availability',
      tokensAvailable: 0,
    }
  }
}

/**
 * Record token usage for an AI action
 */
export async function recordTokenUsage(
  organizationId: string,
  tokensUsed: number,
  actionType: string,
  isHeavyJob: boolean = false
): Promise<void> {
  try {
    const usage = await getOrCreateUsageMetering(organizationId)

    if (!usage) {
      console.error('Usage metering not found for organization:', organizationId)
      return
    }

    const { start } = getCurrentBillingPeriod()

    // Calculate new usage
    const newTokensUsed = usage.tokensUsed + tokensUsed
    let newOverageTokens = 0
    let newOverageCharges = usage.overageCharges

    if (newTokensUsed > usage.tokenPool) {
      newOverageTokens = newTokensUsed - usage.tokenPool
      newOverageCharges = parseFloat(calculateOverageCost(newOverageTokens).toFixed(2))
    }

    const newTokensRemaining = Math.max(0, usage.tokenPool - newTokensUsed)
    const newAiActionsCount = usage.aiActionsCount + 1
    const newHeavyJobsCount = isHeavyJob ? usage.heavyJobsCount + 1 : usage.heavyJobsCount

    // Update metering record
    await db
      .update(aiUsageMetering)
      .set({
        tokensUsed: newTokensUsed,
        tokensRemaining: newTokensRemaining,
        overageTokens: newOverageTokens,
        overageCharges: newOverageCharges.toString(),
        aiActionsCount: newAiActionsCount,
        heavyJobsCount: newHeavyJobsCount,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiUsageMetering.organizationId, organizationId),
          eq(aiUsageMetering.billingPeriodStart, start)
        )
      )

    // Check and trigger usage alerts
    await checkAndTriggerAlerts(organizationId, newTokensUsed, usage.tokenPool)
  } catch (error) {
    console.error('Error recording token usage:', error)
  }
}

/**
 * Calculate overage cost
 */
function calculateOverageCost(overageTokens: number): number {
  const units = Math.ceil(overageTokens / AI_OVERAGE.unitSize)
  return units * AI_OVERAGE.pricePerUnit
}

/**
 * Initialize usage alerts for an organization
 */
async function initializeUsageAlerts(organizationId: string): Promise<void> {
  const alertThresholds = [
    { type: '50_percent', threshold: 50 },
    { type: '80_percent', threshold: 80 },
    { type: '95_percent', threshold: 95 },
    { type: '100_percent', threshold: 100 },
  ]

  for (const alert of alertThresholds) {
    await db.insert(aiUsageAlerts).values({
      id: generateId(),
      organizationId,
      alertType: alert.type,
      threshold: alert.threshold,
      triggered: false,
    })
  }
}

/**
 * Check and trigger usage alerts
 */
async function checkAndTriggerAlerts(
  organizationId: string,
  tokensUsed: number,
  tokenPool: number
): Promise<void> {
  try {
    const usagePercentage = (tokensUsed / tokenPool) * 100

    // Get all alerts that should be triggered but haven't been
    const alerts = await db
      .select()
      .from(aiUsageAlerts)
      .where(
        and(
          eq(aiUsageAlerts.organizationId, organizationId),
          eq(aiUsageAlerts.triggered, false),
          lte(aiUsageAlerts.threshold, Math.floor(usagePercentage))
        )
      )

    for (const alert of alerts) {
      // Mark alert as triggered
      await db
        .update(aiUsageAlerts)
        .set({
          triggered: true,
          triggeredAt: new Date(),
        })
        .where(eq(aiUsageAlerts.id, alert.id))

      // TODO: Send notification to organization admins
      console.log(`AI Usage Alert: Organization ${organizationId} reached ${alert.threshold}% token usage`)
    }
  } catch (error) {
    console.error('Error checking usage alerts:', error)
  }
}

/**
 * Reset monthly usage (called by cron job at start of month)
 */
export async function resetMonthlyUsage(organizationId: string): Promise<void> {
  try {
    // Get organization tier
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return
    }

    const tier = org.subscriptionTier || 'free'
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]
    const tokenPool = limits.monthlyAITokens

    const { start, end } = getCurrentBillingPeriod()

    // Create new metering record for new period
    await db.insert(aiUsageMetering).values({
      id: generateId(),
      organizationId,
      billingPeriodStart: start,
      billingPeriodEnd: end,
      tokenPool,
      tokensUsed: 0,
      tokensRemaining: tokenPool,
      overageTokens: 0,
      overageCharges: '0',
      aiActionsCount: 0,
      heavyJobsCount: 0,
      lastResetAt: new Date(),
    })

    // Reset all alerts
    await db
      .update(aiUsageAlerts)
      .set({
        triggered: false,
        triggeredAt: null,
      })
      .where(eq(aiUsageAlerts.organizationId, organizationId))

    console.log(`Reset monthly usage for organization: ${organizationId}`)
  } catch (error) {
    console.error('Error resetting monthly usage:', error)
  }
}

/**
 * Get usage statistics for analytics
 */
export async function getUsageStatistics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTokensUsed: number
  totalActions: number
  totalOverageCharges: number
  averageTokensPerAction: number
}> {
  try {
    const conditions = [eq(aiGenerations.organizationId, organizationId)]

    if (startDate) {
      conditions.push(gte(aiGenerations.createdAt, startDate))
    }

    if (endDate) {
      conditions.push(lte(aiGenerations.createdAt, endDate))
    }

    const result = await db
      .select({
        totalTokens: sql<number>`SUM(${aiGenerations.tokensUsed})`,
        totalActions: sql<number>`COUNT(*)`,
      })
      .from(aiGenerations)
      .where(and(...conditions))

    const totalTokensUsed = Number(result[0]?.totalTokens || 0)
    const totalActions = Number(result[0]?.totalActions || 0)

    // Get overage charges from metering
    const meteringRecords = await db
      .select()
      .from(aiUsageMetering)
      .where(eq(aiUsageMetering.organizationId, organizationId))

    const totalOverageCharges = meteringRecords.reduce(
      (sum, record) => sum + parseFloat(record.overageCharges as string),
      0
    )

    const averageTokensPerAction = totalActions > 0 ? totalTokensUsed / totalActions : 0

    return {
      totalTokensUsed,
      totalActions,
      totalOverageCharges,
      averageTokensPerAction,
    }
  } catch (error) {
    console.error('Error getting usage statistics:', error)
    return {
      totalTokensUsed: 0,
      totalActions: 0,
      totalOverageCharges: 0,
      averageTokensPerAction: 0,
    }
  }
}
