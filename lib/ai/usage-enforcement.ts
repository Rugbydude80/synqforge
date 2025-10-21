/**
 * AI Usage Tracking & Enforcement
 * Implements soft/hard caps, rate limiting, and abuse prevention
 */

import { db } from '@/lib/db'
import { aiUsageMetering, organizations } from '@/lib/db/schema'
import { eq, gte, sql, and } from 'drizzle-orm'
import { MONTHLY_TOKEN_LIMITS } from './prompts'
import type { SubscriptionTier } from '@/lib/utils/subscription'
import { getOrCreateUsageMetering, recordTokenUsage } from '@/lib/services/ai-metering.service'
import crypto from 'crypto'

interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
  latencyMs: number
  cacheHit: boolean
  promptSha256: string
}

interface UsageCheck {
  allowed: boolean
  reason?: string
  currentUsage: number
  limit: number
  usagePercentage: number
  throttled: boolean
  suggestedMaxOutputTokens?: number
}

const DEFAULT_PROMPT_HISTORY_WINDOW_MS = 60 * 60 * 1000
const promptHistory = new Map<string, number[]>()

/**
 * Check if organization can make AI request
 */
export async function checkUsageAllowance(
  organizationId: string,
  tier: SubscriptionTier,
  estimatedTokens: number = 1000
): Promise<UsageCheck> {
  const limits = MONTHLY_TOKEN_LIMITS[tier]
  const usage = await getOrCreateUsageMetering(organizationId)

  if (!usage) {
    return {
      allowed: false,
      reason: 'Organization not found',
      currentUsage: 0,
      limit: limits.hard,
      usagePercentage: 0,
      throttled: true,
    }
  }

  const hardLimit = limits.hard
  const softLimit = limits.soft
  const currentUsage = usage.tokensUsed
  const projectedUsage = currentUsage + estimatedTokens
  const usagePercentage = hardLimit > 0 ? Math.min(100, (currentUsage / hardLimit) * 100) : 0

  if (projectedUsage >= hardLimit) {
    return {
      allowed: false,
      reason: `Hard limit reached (${hardLimit.toLocaleString()} tokens/month). Upgrade plan or wait for monthly reset.`,
      currentUsage,
      limit: hardLimit,
      usagePercentage,
      throttled: true,
      suggestedMaxOutputTokens: 0,
    }
  }

  if (currentUsage >= softLimit) {
    const remaining = Math.max(hardLimit - currentUsage, 0)
    const throttledMax = Math.max(100, Math.min(500, remaining))

    return {
      allowed: true,
      reason: `Soft limit exceeded. Throttling output to ${throttledMax} tokens.`,
      currentUsage,
      limit: softLimit,
      usagePercentage,
      throttled: true,
      suggestedMaxOutputTokens: throttledMax,
    }
  }

  return {
    allowed: true,
    currentUsage,
    limit: softLimit,
    usagePercentage,
    throttled: false,
  }
}

/**
 * Record AI usage
 */
export async function recordUsage(
  organizationId: string,
  userId: string,
  generationType: string,
  metrics: UsageMetrics,
  metadata?: Record<string, any>
): Promise<void> {
  await recordTokenUsage(organizationId, metrics.totalTokens, generationType, metadata?.isHeavyJob === true)

  if (metrics.promptSha256) {
    const key = `${organizationId}:${metrics.promptSha256}`
    const entries = promptHistory.get(key) ?? []
    const now = Date.now()
    const cutoff = now - DEFAULT_PROMPT_HISTORY_WINDOW_MS
    const updatedEntries = [...entries.filter((ts) => ts >= cutoff), now]
    promptHistory.set(key, updatedEntries)
  }
}

/**
 * Calculate prompt hash for deduplication
 */
export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex')
}

/**
 * Check for duplicate prompts (abuse detection)
 */
export async function checkDuplicatePrompts(
  organizationId: string,
  promptHash: string,
  windowMinutes: number = 10
): Promise<{ isDuplicate: boolean; count: number }> {
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000
  const key = `${organizationId}:${promptHash}`
  const entries = promptHistory.get(key) ?? []
  const recentEntries = entries.filter((timestamp) => now - timestamp <= windowMs)
  promptHistory.set(key, recentEntries)
  const count = recentEntries.length

  return {
    isDuplicate: count > 3, // More than 3 identical requests in window
    count,
  }
}

/**
 * Get usage summary for organization
 */
export async function getUsageSummary(organizationId: string) {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const [usage] = await db
    .select({
      totalTokens: sql<number>`COALESCE(SUM(${aiUsageMetering.tokensUsed}), 0)`,
      totalActions: sql<number>`COALESCE(SUM(${aiUsageMetering.aiActionsCount}), 0)`,
    })
    .from(aiUsageMetering)
    .where(
      and(
        eq(aiUsageMetering.organizationId, organizationId),
        gte(aiUsageMetering.billingPeriodStart, currentMonth)
      )
    )

  // Get organization tier
  const [org] = await db
    .select({
      plan: organizations.plan,
      subscriptionTier: organizations.subscriptionTier,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  const tier = (org?.plan || org?.subscriptionTier || 'free') as SubscriptionTier
  const limits = MONTHLY_TOKEN_LIMITS[tier]
  const currentUsage = Number(usage?.totalTokens || 0)
  const totalCalls = Number(usage?.totalActions || 0)
  const usageRatio = limits.hard > 0 ? (currentUsage / limits.hard) * 100 : 0

  return {
    tier,
    currentUsage,
    softLimit: limits.soft,
    hardLimit: limits.hard,
    totalCalls,
    avgLatency: 0,
    cacheHitRate: 0,
    usagePercentage: usageRatio.toFixed(1),
  }
}

/**
 * Check rate limits (RPM/TPM per user)
 */
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  userId: string,
  tier: SubscriptionTier
): Promise<{ allowed: boolean; reason?: string; resetIn?: number }> {
  const limits = {
    free: { rpm: 5, tpm: 10000 },
    solo: { rpm: 10, tpm: 50000 },
    team: { rpm: 30, tpm: 200000 },
    pro: { rpm: 60, tpm: 500000 },
    business: { rpm: 60, tpm: 500000 },
    enterprise: { rpm: 120, tpm: 1000000 },
  }

  const limit = limits[tier]
  const key = `ratelimit:${userId}`
  const now = Date.now()

  const current = rateLimitCache.get(key)

  if (!current || current.resetAt <= now) {
    // Reset window
    rateLimitCache.set(key, {
      count: 1,
      resetAt: now + 60000, // 1 minute
    })
    return { allowed: true }
  }

  if (current.count >= limit.rpm) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${limit.rpm} requests per minute`,
      resetIn: Math.ceil((current.resetAt - now) / 1000),
    }
  }

  current.count++
  return { allowed: true }
}

/**
 * Clean up old rate limit entries (run periodically)
 */
export function cleanupRateLimitCache(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitCache.entries()) {
    if (value.resetAt <= now) {
      rateLimitCache.delete(key)
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitCache, 5 * 60 * 1000)
