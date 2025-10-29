/**
 * Subscription Tier Service
 * 
 * Core service for managing subscription tiers, action limits, rollover
 * calculations, and feature access control.
 * 
 * Implements the complete pricing model:
 * - Starter (£0/month - 25 AI actions)
 * - Core (£10.99/month - 400 actions + 20% rollover)
 * - Pro (£19.99/month - 800 actions + Smart Context)
 * - Team (£16.99/seat - pooled actions)
 * - Enterprise (Custom - department budgets)
 */

import { db, generateId } from '@/lib/db'
import {
  organizations,
  workspaceUsage,
  workspaceUsageHistory,
  aiGenerations,
  departmentBudgets,
  budgetReallocationLog,
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getTierConfig, type SubscriptionTier } from '@/lib/config/tiers'

// ============================================================================
// TYPES
// ============================================================================

export interface ActionLimitResult {
  allowed: boolean
  remaining: number
  reason?: string
}

export interface FeatureAccess {
  hasSmartContext: boolean
  hasDeepReasoning: boolean
  hasSemanticSearch: boolean
  canSplitToChildren: boolean
  hasAdvancedGherkin: boolean
  canAccessPremium: boolean
}

export interface UsageInfo {
  tokensUsed: number
  tokensLimit: number
  rolloverBalance: number | null
  actionsRemaining: number
  isOverLimit: boolean
}

export interface UserActionBreakdown {
  userId: string
  actionsUsed: number
}

export interface DepartmentAllocation {
  limit: number
  used: number
  remaining: number
}

// ============================================================================
// ACTION LIMIT CHECKING
// ============================================================================

/**
 * Check if organization can perform AI action
 * 
 * @param organizationId - Organization ID
 * @param estimatedTokens - Estimated tokens for the action (default: 1)
 * @returns Result indicating if action is allowed
 */
export async function checkActionLimit(
  organizationId: string,
  estimatedTokens: number = 1
): Promise<ActionLimitResult> {
  try {
    const [usage] = await db
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.organizationId, organizationId))
      .limit(1)

    if (!usage) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Organization usage record not found',
      }
    }

    const remaining = usage.tokensLimit - usage.tokensUsed
    const isOverLimit = usage.tokensUsed >= usage.tokensLimit

    if (isOverLimit || remaining < estimatedTokens) {
      // Get organization plan for upgrade suggestion
      const [org] = await db
        .select({ plan: organizations.plan })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)

      const upgradeSuggestion = 
        org?.plan === 'starter' 
          ? 'Upgrade to Core for 400 actions/month'
          : 'Upgrade your plan or wait for billing reset'

      return {
        allowed: false,
        remaining: Math.max(0, remaining),
        reason: upgradeSuggestion,
      }
    }

    return {
      allowed: true,
      remaining,
    }
  } catch (error) {
    console.error(`Error checking action limit for org ${organizationId}:`, error)
    return {
      allowed: false,
      remaining: 0,
      reason: 'Error checking action limit',
    }
  }
}

/**
 * Increment action usage for organization
 * 
 * Uses atomic SQL increment to prevent race conditions
 * 
 * @param organizationId - Organization ID
 * @param userId - User performing the action
 * @param count - Number of actions to increment (default: 1)
 * @param department - Department name for Enterprise budgets (optional)
 */
export async function incrementActionUsage(
  organizationId: string,
  userId: string,
  count: number = 1,
  department?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // Update workspace usage atomically
    await tx
      .update(workspaceUsage)
      .set({
        tokensUsed: sql`${workspaceUsage.tokensUsed} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(workspaceUsage.organizationId, organizationId))

    // Update department budget if applicable
    if (department) {
      await tx
        .update(departmentBudgets)
        .set({
          actionsUsed: sql`${departmentBudgets.actionsUsed} + ${count}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(departmentBudgets.organizationId, organizationId),
            eq(departmentBudgets.departmentName, department)
          )
        )
    }

    // Create AI generation record
    for (let i = 0; i < count; i++) {
      await tx.insert(aiGenerations).values({
        id: generateId(),
        organizationId,
        userId,
        department,
        type: 'story_generation',
        model: 'test',
        promptText: 'Test',
        responseText: null,
        tokensUsed: 1,
        status: 'completed',
        createdAt: new Date(),
      })
    }
  })
}

// ============================================================================
// ROLLOVER CALCULATIONS
// ============================================================================

/**
 * Calculate rollover for next billing period
 * 
 * Formula: min(floor(unused * rolloverPercentage), floor(baseLimit * rolloverPercentage))
 * 
 * @param organizationId - Organization ID
 * @returns Rollover amount for next period
 */
export async function calculateRollover(organizationId: string): Promise<number> {
  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(eq(workspaceUsage.organizationId, organizationId))
    .limit(1)

  if (!usage || !usage.rolloverEnabled || !usage.rolloverPercentage) {
    return 0
  }

  // Calculate base limit (current limit minus existing rollover)
  const baseLimit = usage.tokensLimit - (usage.rolloverBalance || 0)
  
  // Calculate unused actions
  const unusedActions = Math.max(0, usage.tokensLimit - usage.tokensUsed)
  
  // Calculate rollover (percentage of unused)
  const rolloverAmount = Math.floor(unusedActions * Number(usage.rolloverPercentage))
  
  // Apply cap (percentage of base limit)
  const maxRollover = Math.floor(baseLimit * Number(usage.rolloverPercentage))
  
  return Math.min(rolloverAmount, maxRollover)
}

/**
 * Handle billing period reset
 * 
 * 1. Archive current period usage
 * 2. Calculate rollover if applicable
 * 3. Reset usage counters
 * 4. Update billing period dates
 * 
 * @param organizationId - Organization ID
 */
export async function handleBillingPeriodReset(organizationId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [usage] = await tx
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.organizationId, organizationId))
      .for('update')
      .limit(1)

    if (!usage) {
      throw new Error(`Usage record not found for org ${organizationId}`)
    }

    // Archive current period
    await tx.insert(workspaceUsageHistory).values({
      id: generateId(),
      organizationId,
      billingPeriod: usage.billingPeriodStart.toISOString().substring(0, 7), // YYYY-MM
      billingPeriodStart: usage.billingPeriodStart,
      billingPeriodEnd: usage.billingPeriodEnd,
      tokensUsed: usage.tokensUsed,
      tokensLimit: usage.tokensLimit,
      docsIngested: usage.docsIngested,
      docsLimit: usage.docsLimit,
      gracePeriodActive: usage.gracePeriodActive,
      gracePeriodExpiresAt: usage.gracePeriodExpiresAt,
      lastResetAt: usage.lastResetAt,
      createdAt: usage.createdAt,
      updatedAt: usage.updatedAt,
      archivedAt: new Date(),
    })

    // Calculate rollover
    const rolloverAmount = await calculateRollover(organizationId)
    const baseLimit = usage.tokensLimit - (usage.rolloverBalance || 0)
    const newLimit = baseLimit + rolloverAmount

    // Reset for new period
    const newPeriodStart = new Date()
    const newPeriodEnd = new Date(newPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days

    await tx
      .update(workspaceUsage)
      .set({
        tokensUsed: 0,
        rolloverBalance: rolloverAmount,
        tokensLimit: newLimit,
        billingPeriodStart: newPeriodStart,
        billingPeriodEnd: newPeriodEnd,
        lastResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workspaceUsage.organizationId, organizationId))

    console.log(`✅ Billing period reset for org ${organizationId}:`, {
      oldLimit: usage.tokensLimit,
      oldUsed: usage.tokensUsed,
      rollover: rolloverAmount,
      newLimit,
    })
  })
}

// ============================================================================
// FEATURE ACCESS CONTROL
// ============================================================================

/**
 * Check feature access for organization
 * 
 * @param organizationId - Organization ID
 * @returns Object with feature flags
 */
export async function checkFeatureAccess(organizationId: string): Promise<FeatureAccess> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!org) {
    return {
      hasSmartContext: false,
      hasDeepReasoning: false,
      hasSemanticSearch: false,
      canSplitToChildren: false,
      hasAdvancedGherkin: false,
      canAccessPremium: false,
    }
  }

  const plan = org.plan as string
  const isPremiumPlan = ['core', 'pro', 'team', 'enterprise', 'admin'].includes(plan)

  return {
    hasSmartContext: ['pro', 'team', 'enterprise', 'admin'].includes(plan),
    hasDeepReasoning: ['team', 'enterprise', 'admin'].includes(plan),
    hasSemanticSearch: ['pro', 'team', 'enterprise', 'admin'].includes(plan),
    canSplitToChildren: ['core', 'pro', 'team', 'enterprise', 'admin'].includes(plan),
    hasAdvancedGherkin: ['core', 'pro', 'team', 'enterprise', 'admin'].includes(plan),
    canAccessPremium: isPremiumPlan,
  }
}

// ============================================================================
// USER BREAKDOWN (Team Plan)
// ============================================================================

/**
 * Get per-user action breakdown for Team plans
 * 
 * @param organizationId - Organization ID
 * @returns Array of user action usage
 */
export async function getUserBreakdown(organizationId: string): Promise<UserActionBreakdown[]> {
  const results = await db
    .select({
      userId: aiGenerations.userId,
      actionsUsed: sql<number>`COUNT(*)::int`,
    })
    .from(aiGenerations)
    .where(eq(aiGenerations.organizationId, organizationId))
    .groupBy(aiGenerations.userId)

  return results
}

// ============================================================================
// ENTERPRISE FEATURES
// ============================================================================

/**
 * Get department allocations for Enterprise plan
 * 
 * @param organizationId - Organization ID
 * @returns Object mapping department names to allocations
 */
export async function getDepartmentAllocations(
  organizationId: string
): Promise<Record<string, DepartmentAllocation>> {
  const budgets = await db
    .select()
    .from(departmentBudgets)
    .where(eq(departmentBudgets.organizationId, organizationId))

  const allocations: Record<string, DepartmentAllocation> = {}

  for (const budget of budgets) {
    allocations[budget.departmentName] = {
      limit: budget.actionsLimit,
      used: budget.actionsUsed,
      remaining: budget.actionsLimit - budget.actionsUsed,
    }
  }

  return allocations
}

/**
 * Reallocate budget between departments
 * 
 * @param organizationId - Organization ID
 * @param params - Reallocation parameters
 * @returns Success result
 */
export async function reallocateBudget(
  organizationId: string,
  params: {
    from: string
    to: string
    amount: number
    reason: string
    approvedBy: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { from, to, amount, reason, approvedBy } = params

  try {
    await db.transaction(async (tx) => {
      // Verify source department has enough budget
      const [sourceBudget] = await tx
        .select()
        .from(departmentBudgets)
        .where(
          and(
            eq(departmentBudgets.organizationId, organizationId),
            eq(departmentBudgets.departmentName, from)
          )
        )
        .for('update')
        .limit(1)

      if (!sourceBudget) {
        throw new Error(`Source department '${from}' not found`)
      }

      if (sourceBudget.actionsLimit - sourceBudget.actionsUsed < amount) {
        throw new Error(`Insufficient available budget in '${from}'`)
      }

      // Deduct from source
      await tx
        .update(departmentBudgets)
        .set({
          actionsLimit: sql`${departmentBudgets.actionsLimit} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(departmentBudgets.organizationId, organizationId),
            eq(departmentBudgets.departmentName, from)
          )
        )

      // Add to target
      await tx
        .update(departmentBudgets)
        .set({
          actionsLimit: sql`${departmentBudgets.actionsLimit} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(departmentBudgets.organizationId, organizationId),
            eq(departmentBudgets.departmentName, to)
          )
        )

      // Log reallocation
      await tx.insert(budgetReallocationLog).values({
        id: generateId(),
        organizationId,
        fromDepartment: from,
        toDepartment: to,
        amount,
        reason,
        approvedBy,
        metadata: {},
        createdAt: new Date(),
      })

      console.log(`✅ Budget reallocated for org ${organizationId}:`, {
        from,
        to,
        amount,
      })
    })

    return { success: true }
  } catch (error) {
    console.error(`Failed to reallocate budget:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current usage info for organization
 * 
 * @param organizationId - Organization ID
 * @returns Usage information
 */
export async function getUsageInfo(organizationId: string): Promise<UsageInfo | null> {
  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(eq(workspaceUsage.organizationId, organizationId))
    .limit(1)

  if (!usage) {
    return null
  }

  return {
    tokensUsed: usage.tokensUsed,
    tokensLimit: usage.tokensLimit,
    rolloverBalance: usage.rolloverBalance,
    actionsRemaining: Math.max(0, usage.tokensLimit - usage.tokensUsed),
    isOverLimit: usage.tokensUsed >= usage.tokensLimit,
  }
}

/**
 * Check if feature is enabled for organization's tier
 * 
 * @param organizationId - Organization ID
 * @param featureName - Name of feature to check
 * @returns True if feature is enabled
 */
export async function isFeatureEnabled(
  organizationId: string,
  featureName: string
): Promise<boolean> {
  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!org) {
    return false
  }

  const config = getTierConfig(org.plan as SubscriptionTier)
  
  // Map feature names to config keys
  const featureMap: Record<string, boolean> = {
    smartContext: ['pro', 'team', 'enterprise', 'admin'].includes(org.plan),
    deepReasoning: ['team', 'enterprise', 'admin'].includes(org.plan),
    semanticSearch: ['pro', 'team', 'enterprise', 'admin'].includes(org.plan),
    advancedGherkin: config.features.gherkinTemplates !== 'basic',
  }

  return featureMap[featureName] || false
}

/**
 * Get subscription tier for organization
 * 
 * @param organizationId - Organization ID
 * @returns Subscription tier name
 */
export async function getOrganizationTier(organizationId: string): Promise<string | null> {
  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  return org?.plan || null
}

export default {
  checkActionLimit,
  incrementActionUsage,
  calculateRollover,
  handleBillingPeriodReset,
  checkFeatureAccess,
  getUserBreakdown,
  getDepartmentAllocations,
  reallocateBudget,
  getUsageInfo,
  isFeatureEnabled,
  getOrganizationTier,
}

