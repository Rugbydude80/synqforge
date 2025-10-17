/**
 * Fair-Usage Guards - Hard enforcement of usage limits
 *
 * These guards implement HARD BLOCKS when limits are reached.
 * No soft warnings - when you hit the limit, the operation is blocked.
 */

import { db, generateId } from '@/lib/db'
import { organizations, workspaceUsage } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export interface FairUsageCheck {
  allowed: boolean
  reason?: string
  used: number
  limit: number
  percentage: number
  isWarning: boolean // True at 90%+
  upgradeUrl?: string
  manageUrl?: string
}

/**
 * Get current billing period (monthly)
 */
function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Get or create workspace usage record for current billing period
 */
export async function getOrCreateWorkspaceUsage(organizationId: string) {
  const { start, end } = getCurrentBillingPeriod()

  // Try to find existing record
  const [existing] = await db
    .select()
    .from(workspaceUsage)
    .where(
      and(
        eq(workspaceUsage.organizationId, organizationId),
        eq(workspaceUsage.billingPeriodStart, start)
      )
    )
    .limit(1)

  if (existing) {
    return existing
  }

  // Get organization limits
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  // Create new usage record for this period
  const newUsage = {
    id: generateId(),
    organizationId,
    billingPeriodStart: start,
    billingPeriodEnd: end,
    tokensUsed: 0,
    tokensLimit: org.aiTokensIncluded === 999999 ? 999999999 : org.aiTokensIncluded,
    docsIngested: 0,
    docsLimit: org.docsPerMonth === 999999 ? 999999999 : org.docsPerMonth,
    lastResetAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(workspaceUsage).values(newUsage)

  return newUsage
}

/**
 * Check if AI can be used (token-based)
 * HARD BLOCK: Returns allowed=false when tokens_remaining <= 0
 */
export async function canUseAI(
  organizationId: string,
  tokensRequired: number
): Promise<FairUsageCheck> {
  const usage = await getOrCreateWorkspaceUsage(organizationId)

  const tokensRemaining = usage.tokensLimit - usage.tokensUsed
  const unlimited = usage.tokensLimit >= 999999

  if (unlimited) {
    return {
      allowed: true,
      used: usage.tokensUsed,
      limit: -1,
      percentage: 0,
      isWarning: false,
      reason: undefined,
    }
  }

  // HARD BLOCK: No tokens left
  if (tokensRemaining <= 0) {
    return {
      allowed: false,
      used: usage.tokensUsed,
      limit: usage.tokensLimit,
      percentage: 100,
      isWarning: false,
      reason: `AI token limit reached (${usage.tokensLimit.toLocaleString()} tokens/month). Upgrade your plan or wait until next month.`,
      upgradeUrl: '/settings/billing',
      manageUrl: '/settings/billing',
    }
  }

  // Check if there are enough tokens for this operation
  if (tokensRemaining < tokensRequired) {
    return {
      allowed: false,
      used: usage.tokensUsed,
      limit: usage.tokensLimit,
      percentage: Math.round((usage.tokensUsed / usage.tokensLimit) * 100),
      isWarning: false,
      reason: `Insufficient AI tokens. Required: ${tokensRequired.toLocaleString()}, Available: ${tokensRemaining.toLocaleString()}. Upgrade your plan.`,
      upgradeUrl: '/settings/billing',
      manageUrl: '/settings/billing',
    }
  }

  const percentage = Math.round((usage.tokensUsed / usage.tokensLimit) * 100)
  const isWarning = percentage >= 90

  return {
    allowed: true,
    used: usage.tokensUsed,
    limit: usage.tokensLimit,
    percentage,
    isWarning,
    reason: isWarning
      ? `Warning: ${percentage}% of AI tokens used (${usage.tokensUsed.toLocaleString()}/${usage.tokensLimit.toLocaleString()})`
      : undefined,
  }
}

/**
 * Increment AI token usage
 * Call this after successful AI operation
 */
export async function incrementTokenUsage(
  organizationId: string,
  tokensUsed: number
): Promise<void> {
  const { start } = getCurrentBillingPeriod()

  await db
    .update(workspaceUsage)
    .set({
      tokensUsed: sql`${workspaceUsage.tokensUsed} + ${tokensUsed}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workspaceUsage.organizationId, organizationId),
        eq(workspaceUsage.billingPeriodStart, start)
      )
    )
}

/**
 * Check if document can be ingested
 * HARD BLOCK: Returns allowed=false when docs_remaining <= 0
 */
export async function canIngestDocument(
  organizationId: string
): Promise<FairUsageCheck> {
  const usage = await getOrCreateWorkspaceUsage(organizationId)

  const docsRemaining = usage.docsLimit - usage.docsIngested
  const unlimited = usage.docsLimit >= 999999

  if (unlimited) {
    return {
      allowed: true,
      used: usage.docsIngested,
      limit: -1,
      percentage: 0,
      isWarning: false,
      reason: undefined,
    }
  }

  // HARD BLOCK: No docs left
  if (docsRemaining <= 0) {
    return {
      allowed: false,
      used: usage.docsIngested,
      limit: usage.docsLimit,
      percentage: 100,
      isWarning: false,
      reason: `Document ingestion limit reached (${usage.docsLimit} docs/month). Upgrade your plan or wait until next month.`,
      upgradeUrl: '/settings/billing',
      manageUrl: '/settings/billing',
    }
  }

  const percentage = Math.round((usage.docsIngested / usage.docsLimit) * 100)
  const isWarning = percentage >= 90

  return {
    allowed: true,
    used: usage.docsIngested,
    limit: usage.docsLimit,
    percentage,
    isWarning,
    reason: isWarning
      ? `Warning: ${percentage}% of document ingestion limit used (${usage.docsIngested}/${usage.docsLimit})`
      : undefined,
  }
}

/**
 * Increment document ingestion counter
 * Call this after successful document upload
 */
export async function incrementDocIngestion(
  organizationId: string
): Promise<void> {
  const { start } = getCurrentBillingPeriod()

  await db
    .update(workspaceUsage)
    .set({
      docsIngested: sql`${workspaceUsage.docsIngested} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workspaceUsage.organizationId, organizationId),
        eq(workspaceUsage.billingPeriodStart, start)
      )
    )
}

/**
 * Check throughput limit (stories per minute)
 * HARD BLOCK: Returns allowed=false if rate limit exceeded
 */
export async function checkThroughput(
  organizationId: string,
  storiesInRequest: number
): Promise<FairUsageCheck> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  const limit = org.throughputSpm

  // Check if this request exceeds throughput limit
  if (storiesInRequest > limit) {
    return {
      allowed: false,
      used: storiesInRequest,
      limit,
      percentage: Math.round((storiesInRequest / limit) * 100),
      isWarning: false,
      reason: `Throughput limit exceeded. You can generate up to ${limit} stories per minute. Requested: ${storiesInRequest}.`,
      upgradeUrl: '/settings/billing',
    }
  }

  return {
    allowed: true,
    used: storiesInRequest,
    limit,
    percentage: Math.round((storiesInRequest / limit) * 100),
    isWarning: false,
  }
}

/**
 * Check bulk story generation limit
 * HARD BLOCK: Returns allowed=false if bulk limit exceeded
 */
export async function checkBulkLimit(
  organizationId: string,
  storiesCount: number
): Promise<FairUsageCheck> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  const limit = org.bulkStoryLimit

  if (storiesCount > limit) {
    return {
      allowed: false,
      used: storiesCount,
      limit,
      percentage: Math.round((storiesCount / limit) * 100),
      isWarning: false,
      reason: `Bulk generation limit exceeded. Maximum ${limit} stories per request. Requested: ${storiesCount}.`,
      upgradeUrl: '/settings/billing',
    }
  }

  return {
    allowed: true,
    used: storiesCount,
    limit,
    percentage: Math.round((storiesCount / limit) * 100),
    isWarning: false,
  }
}

/**
 * Check PDF page limit for uploads
 * HARD BLOCK: Returns allowed=false if page count exceeds limit
 */
export async function checkPageLimit(
  organizationId: string,
  pageCount: number
): Promise<FairUsageCheck> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  const limit = org.maxPagesPerUpload

  if (pageCount > limit) {
    return {
      allowed: false,
      used: pageCount,
      limit,
      percentage: Math.round((pageCount / limit) * 100),
      isWarning: false,
      reason: `PDF page limit exceeded. Maximum ${limit} pages per upload. This document has ${pageCount} pages.`,
      upgradeUrl: '/settings/billing',
    }
  }

  return {
    allowed: true,
    used: pageCount,
    limit,
    percentage: Math.round((pageCount / limit) * 100),
    isWarning: false,
  }
}

/**
 * Get current usage summary for dashboard
 */
export async function getUsageSummary(organizationId: string) {
  const usage = await getOrCreateWorkspaceUsage(organizationId)

  const tokensPercentage = usage.tokensLimit >= 999999
    ? 0
    : Math.round((usage.tokensUsed / usage.tokensLimit) * 100)

  const docsPercentage = usage.docsLimit >= 999999
    ? 0
    : Math.round((usage.docsIngested / usage.docsLimit) * 100)

  return {
    tokens: {
      used: usage.tokensUsed,
      limit: usage.tokensLimit >= 999999 ? -1 : usage.tokensLimit,
      remaining: usage.tokensLimit >= 999999
        ? -1
        : Math.max(0, usage.tokensLimit - usage.tokensUsed),
      percentage: tokensPercentage,
      isWarning: tokensPercentage >= 90,
      isBlocked: tokensPercentage >= 100,
    },
    docs: {
      used: usage.docsIngested,
      limit: usage.docsLimit >= 999999 ? -1 : usage.docsLimit,
      remaining: usage.docsLimit >= 999999
        ? -1
        : Math.max(0, usage.docsLimit - usage.docsIngested),
      percentage: docsPercentage,
      isWarning: docsPercentage >= 90,
      isBlocked: docsPercentage >= 100,
    },
    billingPeriod: {
      start: usage.billingPeriodStart,
      end: usage.billingPeriodEnd,
    },
  }
}
