/**
 * AI Usage Tracking & Enforcement
 * Implements soft/hard caps, rate limiting, and abuse prevention
 */

import { db } from '@/lib/db'
import { aiUsageMetering, organizations } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { MONTHLY_TOKEN_LIMITS } from './prompts'
import type { SubscriptionTier } from '@/lib/utils/subscription'
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

/**
 * Check if organization can make AI request
 */
export async function checkUsageAllowance(
  organizationId: string,
  tier: SubscriptionTier,
  estimatedTokens: number = 1000
): Promise<UsageCheck> {
  const limits = MONTHLY_TOKEN_LIMITS[tier]
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  // Get current month's usage
  const [usage] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiUsageMetering.tokensUsed}), 0)`,
    })
    .from(aiUsageMetering)
    .where(
      and(
        eq(aiUsageMetering.organizationId, organizationId),
        gte(aiUsageMetering.timestamp, currentMonth)
      )
    )

  const currentUsage = Number(usage?.total || 0)
  const usagePercentage = (currentUsage / limits.hard) * 100

  // Hard cap - block all requests
  if (currentUsage >= limits.hard) {
    return {
      allowed: false,
      reason: `Hard limit reached (${limits.hard.toLocaleString()} tokens/month). Upgrade plan or wait for monthly reset.`,
      currentUsage,
      limit: limits.hard,
      usagePercentage,
      throttled: true,
    }
  }

  // Soft cap - allow but throttle
  if (currentUsage >= limits.soft) {
    const remainingTokens = limits.hard - currentUsage
    const throttledMaxOutput = Math.min(500, Math.floor(remainingTokens / 2))

    return {
      allowed: true,
      reason: `Soft limit exceeded. Throttling output to ${throttledMaxOutput} tokens.`,
      currentUsage,
      limit: limits.soft,
      usagePercentage,
      throttled: true,
      suggestedMaxOutputTokens: throttledMaxOutput,
    }
  }

  // Normal operation
  return {
    allowed: true,
    currentUsage,
    limit: limits.soft,
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
  await db.insert(aiUsageMetering).values({
    id: crypto.randomUUID(),
    organizationId,
    userId,
    generationType: generationType as any,
    model: metrics.model,
    tokensUsed: metrics.totalTokens,
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    latencyMs: metrics.latencyMs,
    cacheHit: metrics.cacheHit,
    promptHash: metrics.promptSha256,
    metadata: metadata || {},
    timestamp: new Date(),
  })
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
  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes)

  const [result] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(aiUsageMetering)
    .where(
      and(
        eq(aiUsageMetering.organizationId, organizationId),
        eq(aiUsageMetering.promptHash, promptHash),
        gte(aiUsageMetering.timestamp, windowStart)
      )
    )

  const count = Number(result?.count || 0)

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
      totalCalls: sql<number>`COUNT(*)`,
      avgLatency: sql<number>`COALESCE(AVG(${aiUsageMetering.latencyMs}), 0)`,
      cacheHitRate: sql<number>`COALESCE(AVG(CASE WHEN ${aiUsageMetering.cacheHit} THEN 100.0 ELSE 0.0 END), 0)`,
    })
    .from(aiUsageMetering)
    .where(
      and(
        eq(aiUsageMetering.organizationId, organizationId),
        gte(aiUsageMetering.timestamp, currentMonth)
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

  return {
    tier,
    currentUsage: Number(usage?.totalTokens || 0),
    softLimit: limits.soft,
    hardLimit: limits.hard,
    totalCalls: Number(usage?.totalCalls || 0),
    avgLatency: Math.round(Number(usage?.avgLatency || 0)),
    cacheHitRate: Math.round(Number(usage?.cacheHitRate || 0)),
    usagePercentage: ((Number(usage?.totalTokens || 0) / limits.hard) * 100).toFixed(1),
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
