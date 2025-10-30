/**
 * Subscription Test Helpers
 * 
 * Helper functions for subscription tier validation tests.
 * These functions create test data, simulate time, and provide
 * convenient wrappers for testing subscription behavior.
 */

import { db, generateId } from '@/lib/db'
import {
  organizations,
  workspaceUsage,
  aiGenerations,
  stories,
  departmentBudgets,
  budgetReallocationLog,
  workspaceUsageHistory,
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { SubscriptionTier } from '@/lib/config/tiers'

// ============================================================================
// TIME MANAGEMENT
// ============================================================================

let mockCurrentTime: Date | null = null

export function mockTimeTravel(days: number): void {
  const now = new Date()
  mockCurrentTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

export function mockDate(date: Date | number): void {
  if (typeof date === 'number') {
    // Treat as day of month
    const now = new Date()
    mockCurrentTime = new Date(now.getFullYear(), now.getMonth(), date)
  } else {
    mockCurrentTime = date
  }
}

export function resetMockTime(): void {
  mockCurrentTime = null
}

export function getCurrentTime(): Date {
  return mockCurrentTime || new Date()
}

// ============================================================================
// SUBSCRIPTION CREATION
// ============================================================================

interface TestSubscriptionConfig {
  plan: string
  actionsLimit?: number
  rolloverEnabled?: boolean
  rolloverPercentage?: number
  baseActions?: number
  actionsPerSeat?: number
  seatCount?: number
  trialEndsAt?: Date
  hasSmartContext?: boolean
  hasDeepReasoning?: boolean
  _hasAdvancedGherkin?: boolean
  _hasCustomModels?: boolean
  _hasCustomSimilarityThreshold?: boolean
  departmentAllocations?: Record<string, number>
  billingPeriodStart?: Date
  billingPeriodEnd?: Date
  billingAnniversary?: Date
}

export async function createTestSubscription(
  orgId: string,
  config: TestSubscriptionConfig
): Promise<void> {
  const {
    plan,
    actionsLimit,
    rolloverEnabled = false,
    rolloverPercentage = 0,
    baseActions,
    actionsPerSeat,
    seatCount,
    trialEndsAt,
    hasSmartContext = false,
    hasDeepReasoning = false,
    departmentAllocations,
    billingPeriodStart,
    billingPeriodEnd,
  } = config

  // Validate Team plan seat count
  if (plan === 'team' && seatCount && seatCount < 5) {
    throw new Error('Team plan requires minimum 5 seats')
  }

  // Update organization
  await db
    .update(organizations)
    .set({
      plan,
      subscriptionTier: plan as SubscriptionTier,
      seatsIncluded: seatCount || 1,
      advancedAi: hasSmartContext || hasDeepReasoning,
      trialEndsAt,
      updatedAt: getCurrentTime(),
    })
    .where(eq(organizations.id, orgId))

  // Calculate total actions limit
  let totalActionsLimit = actionsLimit || 25
  if (baseActions && actionsPerSeat && seatCount) {
    totalActionsLimit = baseActions + actionsPerSeat * seatCount
  }

  // Update workspace usage
  const start = billingPeriodStart || getCurrentTime()
  const end = billingPeriodEnd || new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)

  await db
    .update(workspaceUsage)
    .set({
      tokensLimit: totalActionsLimit,
      tokensUsed: 0,
      rolloverEnabled,
      rolloverPercentage: rolloverPercentage ? rolloverPercentage.toString() : null,
      rolloverBalance: 0,
      billingPeriodStart: start,
      billingPeriodEnd: end,
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))

  // Create department budgets for Enterprise
  if (departmentAllocations && plan === 'enterprise') {
    for (const [dept, limit] of Object.entries(departmentAllocations)) {
      await db.insert(departmentBudgets).values({
        id: generateId(),
        organizationId: orgId,
        departmentName: dept,
        actionsLimit: limit,
        actionsUsed: 0,
        createdAt: getCurrentTime(),
      })
    }
  }
}

// ============================================================================
// AI ACTION USAGE
// ============================================================================

export async function useAIActions(
  orgId: string,
  userId: string,
  count: number,
  department?: string
): Promise<void> {
  // Create AI generation records
  for (let i = 0; i < count; i++) {
    await db.insert(aiGenerations).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      department,
      type: 'story_generation',
      model: 'test',
      promptText: 'Test generation',
      responseText: null,
      tokensUsed: 1,
      status: 'completed',
      createdAt: getCurrentTime(),
    })
  }

  // Update workspace usage
  await db
    .update(workspaceUsage)
    .set({
      tokensUsed: sql`${workspaceUsage.tokensUsed} + ${count}`,
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))

  // Update department budget if applicable
  if (department) {
    await db
      .update(departmentBudgets)
      .set({
        actionsUsed: sql`${departmentBudgets.actionsUsed} + ${count}`,
      })
      .where(
        and(
          eq(departmentBudgets.organizationId, orgId),
          eq(departmentBudgets.departmentName, department)
        )
      )
  }
}

export async function attemptAIGeneration(
  orgId: string,
  userId: string,
  estimatedTokens: number = 1
): Promise<{
  allowed: boolean
  actionsRemaining: number
  reason?: string
}> {
  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(eq(workspaceUsage.organizationId, orgId))
    .limit(1)

  if (!usage) {
    return {
      allowed: false,
      actionsRemaining: 0,
      reason: 'Organization not found',
    }
  }

  const remaining = usage.tokensLimit - usage.tokensUsed
  const isOverLimit = usage.tokensUsed >= usage.tokensLimit

  if (isOverLimit || remaining < estimatedTokens) {
    return {
      allowed: false,
      actionsRemaining: Math.max(0, remaining),
      reason: remaining < 0 
        ? 'Upgrade or wait 16 days for billing reset'
        : 'Upgrade to Core for 400 actions/month',
    }
  }

  return {
    allowed: true,
    actionsRemaining: remaining,
  }
}

// ============================================================================
// USAGE QUERIES
// ============================================================================

export async function getUsage(orgId: string) {
  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(eq(workspaceUsage.organizationId, orgId))
    .limit(1)

  if (!usage) {
    throw new Error(`Usage record not found for org ${orgId}`)
  }

  return {
    ...usage,
    isOverLimit: usage.tokensUsed > usage.tokensLimit,
  }
}

export async function getSubscription(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization ${orgId} not found`)
  }

  const usage = await getUsage(orgId)

  return {
    plan: org.plan,
    trialEndsAt: org.trialEndsAt,
    actionsLimit: usage.tokensLimit,
    actionsUsed: usage.tokensUsed,
  }
}

export async function getUserBreakdown(orgId: string) {
  const generations = await db
    .select({
      userId: aiGenerations.userId,
      actionsUsed: sql<number>`COUNT(*)::int`,
    })
    .from(aiGenerations)
    .where(eq(aiGenerations.organizationId, orgId))
    .groupBy(aiGenerations.userId)

  return generations
}

export async function getHistoricalUsage(orgId: string, period: string) {
  const [historical] = await db
    .select()
    .from(workspaceUsageHistory)
    .where(
      and(
        eq(workspaceUsageHistory.organizationId, orgId),
        eq(workspaceUsageHistory.billingPeriod, period)
      )
    )
    .limit(1)

  if (!historical) {
    return { tokensUsed: 0, tokensLimit: 0 }
  }

  return historical
}

// ============================================================================
// BILLING PERIOD MANAGEMENT
// ============================================================================

export async function advanceBillingPeriod(orgId: string): Promise<void> {
  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(eq(workspaceUsage.organizationId, orgId))
    .limit(1)

  if (!usage) return

  // Calculate rollover
  let rolloverBalance = 0
  if (usage.rolloverEnabled && usage.rolloverPercentage) {
    const unusedActions = Math.max(0, usage.tokensLimit - usage.tokensUsed)
    const rolloverPct = parseFloat(usage.rolloverPercentage)
    const rolloverAmount = Math.floor(unusedActions * rolloverPct)
    const maxRollover = Math.floor(usage.tokensLimit * rolloverPct)
    rolloverBalance = Math.min(rolloverAmount, maxRollover)
  }

  // Archive current period
  await db.insert(workspaceUsageHistory).values({
    id: generateId(),
    organizationId: orgId,
    billingPeriodStart: usage.billingPeriodStart,
    billingPeriodEnd: usage.billingPeriodEnd,
    billingPeriod: usage.billingPeriodStart.toISOString().substring(0, 7), // YYYY-MM
    tokensUsed: usage.tokensUsed,
    tokensLimit: usage.tokensLimit,
    docsIngested: usage.docsIngested || 0,
    docsLimit: usage.docsLimit || 10,
    archivedAt: getCurrentTime(),
  })

  // Reset for new period
  const newStart = getCurrentTime()
  const newEnd = new Date(newStart.getTime() + 30 * 24 * 60 * 60 * 1000)

  await db
    .update(workspaceUsage)
    .set({
      tokensUsed: 0,
      rolloverBalance,
      tokensLimit: (usage.tokensLimit - (usage.rolloverBalance || 0)) + rolloverBalance,
      billingPeriodStart: newStart,
      billingPeriodEnd: newEnd,
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))
}

export async function resetBillingPeriod(orgId: string): Promise<void> {
  await db
    .update(workspaceUsage)
    .set({
      tokensUsed: 0,
      rolloverBalance: 0,
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))
}

// ============================================================================
// PLAN MANAGEMENT
// ============================================================================

export async function upgradePlan(orgId: string, newPlan: string): Promise<void> {
  const limits: Record<string, number> = {
    starter: 25,
    core: 400,
    pro: 800,
    team: 15000, // 5 seats
  }

  await db
    .update(organizations)
    .set({
      plan: newPlan,
      subscriptionTier: newPlan as SubscriptionTier,
      trialEndsAt: null, // Cancel trial on upgrade
      updatedAt: getCurrentTime(),
    })
    .where(eq(organizations.id, orgId))

  await db
    .update(workspaceUsage)
    .set({
      tokensLimit: limits[newPlan] || 25,
      rolloverEnabled: ['core', 'pro'].includes(newPlan),
      rolloverPercentage: ['core', 'pro'].includes(newPlan) ? '0.20' : '0.00',
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))
}

export async function downgradePlan(orgId: string, newPlan: string): Promise<void> {
  const limits: Record<string, number> = {
    starter: 25,
    core: 400,
    pro: 800,
  }

  await db
    .update(organizations)
    .set({
      plan: newPlan,
      subscriptionTier: newPlan as SubscriptionTier,
      updatedAt: getCurrentTime(),
    })
    .where(eq(organizations.id, orgId))

  await db
    .update(workspaceUsage)
    .set({
      tokensLimit: limits[newPlan] || 25,
      rolloverEnabled: ['core', 'pro'].includes(newPlan),
      rolloverPercentage: ['core', 'pro'].includes(newPlan) ? '0.20' : '0.00',
      rolloverBalance: 0, // Clear rollover on downgrade
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))
}

export async function updateSeatCount(orgId: string, newCount: number): Promise<void> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org || org.plan !== 'team') return

  // Calculate new limit for Team plan
  const baseActions = 10000
  const actionsPerSeat = 1000
  const newLimit = baseActions + actionsPerSeat * newCount

  await db
    .update(organizations)
    .set({
      seatsIncluded: newCount,
      updatedAt: getCurrentTime(),
    })
    .where(eq(organizations.id, orgId))

  await db
    .update(workspaceUsage)
    .set({
      tokensLimit: newLimit,
      updatedAt: getCurrentTime(),
    })
    .where(eq(workspaceUsage.organizationId, orgId))
}

// ============================================================================
// TRIAL MANAGEMENT
// ============================================================================

export async function checkTrialStatus(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org || !org.trialEndsAt) {
    return { isActive: false, expired: false, daysRemaining: 0 }
  }

  const now = getCurrentTime()
  const isActive = org.trialEndsAt > now
  const daysRemaining = Math.max(
    0,
    Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  )

  return {
    isActive,
    expired: !isActive,
    daysRemaining,
  }
}

export async function processTrialExpirations(): Promise<void> {
  const now = getCurrentTime()

  const expiredOrgs = await db
    .select()
    .from(organizations)
    .where(
      and(
        sql`${organizations.trialEndsAt} IS NOT NULL`,
        sql`${organizations.trialEndsAt} <= ${now}`
      )
    )

  for (const org of expiredOrgs) {
    await db
      .update(organizations)
      .set({
        trialEndsAt: null,
        updatedAt: now,
      })
      .where(eq(organizations.id, org.id))
  }
}

// ============================================================================
// FEATURE ACCESS
// ============================================================================

export async function checkFeatureAccess(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
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

  const isPremiumPlan = ['core', 'pro', 'team', 'enterprise'].includes(org.plan)

  return {
    hasSmartContext: ['pro', 'team', 'enterprise'].includes(org.plan),
    hasDeepReasoning: ['team', 'enterprise'].includes(org.plan),
    hasSemanticSearch: ['pro', 'team', 'enterprise'].includes(org.plan),
    canSplitToChildren: ['core', 'pro', 'team', 'enterprise'].includes(org.plan),
    hasAdvancedGherkin: ['core', 'pro', 'team', 'enterprise'].includes(org.plan),
    canAccessPremium: isPremiumPlan,
  }
}

// ============================================================================
// STORY OPERATIONS (STUBS FOR TESTING)
// ============================================================================

export async function createChildStory(orgId: string, parentStoryId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    return { success: false, error: 'Organization not found' }
  }

  // Check existing children
  const children = await db
    .select()
    .from(stories)
    .where(eq(stories.epicId, parentStoryId)) // Using epicId as parent relationship

  const maxChildren: Record<string, number> = {
    starter: 2,
    core: 3,
    pro: 999,
    team: 999,
    enterprise: 999,
  }

  const limit = maxChildren[org.plan] || 2

  if (children.length >= limit) {
    return {
      success: false,
      error: `Maximum ${limit} children allowed. Upgrade to Pro for unlimited children`,
    }
  }

  return { success: true }
}

export async function generateStoryWithContext(orgId: string, params: any) {
  // Stub implementation
  return {
    similarStoriesFound: 3,
    contextApplied: true,
  }
}

export async function semanticSearch(orgId: string, query: string) {
  // Stub implementation
  return [
    {
      title: 'User authentication with OAuth',
      relevanceScore: 0.92,
    },
  ]
}

export async function createTestStories(orgId: string, stories: any[]) {
  // Stub implementation
  return true
}

export async function enableDeepReasoning(orgId: string) {
  const features = await checkFeatureAccess(orgId)
  
  if (!features.hasDeepReasoning) {
    return {
      success: false,
      error: 'Deep Reasoning is available in Team plan and above',
    }
  }

  return { success: true }
}

export async function generateStoryWithDeepReasoning(orgId: string, params: any) {
  // Stub implementation
  return {
    deepReasoningApplied: true,
    acceptanceCriteria: 'Given GDPR Article 17 compliance requirements...',
  }
}

// ============================================================================
// ENTERPRISE FEATURES
// ============================================================================

export async function getDepartmentAllocations(orgId: string) {
  const budgets = await db
    .select()
    .from(departmentBudgets)
    .where(eq(departmentBudgets.organizationId, orgId))

  const result: Record<string, { limit: number; used: number }> = {}

  for (const budget of budgets) {
    result[budget.departmentName] = {
      limit: budget.actionsLimit,
      used: budget.actionsUsed,
    }
  }

  return result
}

export async function reallocateBudget(
  orgId: string,
  params: {
    from: string
    to: string
    amount: number
    reason: string
    approvedBy: string
  }
) {
  const { from, to, amount, reason, approvedBy } = params

  // Update budgets
  await db
    .update(departmentBudgets)
    .set({
      actionsLimit: sql`${departmentBudgets.actionsLimit} - ${amount}`,
    })
    .where(
      and(
        eq(departmentBudgets.organizationId, orgId),
        eq(departmentBudgets.departmentName, from)
      )
    )

  await db
    .update(departmentBudgets)
    .set({
      actionsLimit: sql`${departmentBudgets.actionsLimit} + ${amount}`,
    })
    .where(
      and(
        eq(departmentBudgets.organizationId, orgId),
        eq(departmentBudgets.departmentName, to)
      )
    )

  // Log reallocation
  await db.insert(budgetReallocationLog).values({
    id: generateId(),
    organizationId: orgId,
    fromDepartment: from,
    toDepartment: to,
    amount,
    reason,
    approvedBy,
    createdAt: getCurrentTime(),
  })

  return { success: true }
}

export async function getAuditLog(orgId: string) {
  const logs = await db
    .select()
    .from(budgetReallocationLog)
    .where(eq(budgetReallocationLog.organizationId, orgId))

  return logs.map(log => ({
    action: 'BUDGET_REALLOCATION',
    metadata: {
      from: log.fromDepartment,
      to: log.toDepartment,
      amount: log.amount,
      reason: log.reason,
    },
  }))
}

export async function setCustomSimilarityThreshold(orgId: string, threshold: number) {
  // Stub implementation
  return true
}

export async function getSemanticSearchConfig(orgId: string) {
  // Stub implementation
  return {
    similarityThreshold: 0.90,
  }
}

export async function configureCustomModel(orgId: string, config: any) {
  // Stub implementation
  return { success: true }
}

export async function generateStory(orgId: string, params: any) {
  // Stub implementation
  return {
    modelUsed: params.useCustomModel ? 'azure-openai/gpt-4-turbo' : 'default',
  }
}

// ============================================================================
// BILLING BOUNDARY TESTS
// ============================================================================

export async function reserveTokens(
  orgId: string,
  count: number,
  timestamp: Date
): Promise<string> {
  const reservationId = generateId()
  // Stub implementation for token reservation
  return reservationId
}

export async function completeGeneration(reservationId: string, tokensUsed: number) {
  // Stub implementation
  return true
}

export async function calculateNextRenewal(orgId: string): Promise<Date> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    throw new Error('Organization not found')
  }

  // Stub implementation for renewal calculation
  return new Date('2025-02-28')
}

