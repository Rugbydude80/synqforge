/**
 * AI Rate Limiting Service
 * Implements workspace-level rate limiting for AI actions
 * Limits: 60 AI actions/min, 6 heavy jobs/min (configurable per tier)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { SUBSCRIPTION_LIMITS } from '@/lib/constants'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiters for different tiers
const rateLimiters = {
  free: {
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai:free',
    }),
    heavy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai_heavy:free',
    }),
  },
  solo: {
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai:solo',
    }),
    heavy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai_heavy:solo',
    }),
  },
  team: {
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai:team',
    }),
    heavy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(6, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai_heavy:team',
    }),
  },
  pro: {
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(90, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai:pro',
    }),
    heavy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(9, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai_heavy:pro',
    }),
  },
  business: {
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai:business',
    }),
    heavy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(6, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai_heavy:business',
    }),
  },
  enterprise: {
    standard: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai:enterprise',
    }),
    heavy: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(12, '60 s'),
      analytics: true,
      prefix: 'ratelimit:ai_heavy:enterprise',
    }),
  },
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}

/**
 * Check rate limit for a standard AI action
 */
export async function checkAIRateLimit(
  organizationId: string,
  tier: 'free' | 'solo' | 'team' | 'pro' | 'business' | 'enterprise'
): Promise<RateLimitResult> {
  try {
    const limiter = rateLimiters[tier].standard
    const result = await limiter.limit(organizationId)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset),
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (error) {
    console.error('Error checking AI rate limit:', error)
    // Fail open - allow the request if rate limiting fails
    return {
      success: true,
      limit: 60,
      remaining: 60,
      reset: new Date(Date.now() + 60000),
    }
  }
}

/**
 * Check rate limit for a heavy AI job (Autopilot, Forecast, etc.)
 */
export async function checkHeavyJobRateLimit(
  organizationId: string,
  tier: 'free' | 'solo' | 'team' | 'pro' | 'business' | 'enterprise'
): Promise<RateLimitResult> {
  try {
    const limiter = rateLimiters[tier].heavy
    const result = await limiter.limit(organizationId)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset),
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (error) {
    console.error('Error checking heavy job rate limit:', error)
    // Fail open
    return {
      success: true,
      limit: 6,
      remaining: 6,
      reset: new Date(Date.now() + 60000),
    }
  }
}

/**
 * Get remaining quota for standard AI actions
 */
export async function getAIQuota(
  organizationId: string,
  tier: 'free' | 'solo' | 'team' | 'pro' | 'business' | 'enterprise'
): Promise<{
  standard: { limit: number; remaining: number; reset: Date }
  heavy: { limit: number; remaining: number; reset: Date }
}> {
  const limits = SUBSCRIPTION_LIMITS[tier]

  // Get current usage from rate limiters
  const standardKey = `ratelimit:ai:${tier}:${organizationId}`
  const heavyKey = `ratelimit:ai_heavy:${tier}:${organizationId}`

  try {
    const [standardData, heavyData] = await Promise.all([
      redis.get(standardKey),
      redis.get(heavyKey),
    ])

    const now = Date.now()
    const standardUsage = standardData ? (typeof standardData === 'number' ? standardData : 0) : 0
    const heavyUsage = heavyData ? (typeof heavyData === 'number' ? heavyData : 0) : 0

    return {
      standard: {
        limit: limits.aiActionsPerMinute,
        remaining: Math.max(0, limits.aiActionsPerMinute - standardUsage),
        reset: new Date(now + 60000),
      },
      heavy: {
        limit: limits.heavyJobsPerMinute,
        remaining: Math.max(0, limits.heavyJobsPerMinute - heavyUsage),
        reset: new Date(now + 60000),
      },
    }
  } catch (error) {
    console.error('Error getting AI quota:', error)
    return {
      standard: {
        limit: limits.aiActionsPerMinute,
        remaining: limits.aiActionsPerMinute,
        reset: new Date(Date.now() + 60000),
      },
      heavy: {
        limit: limits.heavyJobsPerMinute,
        remaining: limits.heavyJobsPerMinute,
        reset: new Date(Date.now() + 60000),
      },
    }
  }
}

/**
 * Reset rate limits for an organization (admin function)
 */
export async function resetRateLimits(organizationId: string): Promise<void> {
  const tiers = ['free', 'solo', 'team', 'pro', 'business', 'enterprise'] as const

  try {
    const keys = tiers.flatMap(tier => [
      `ratelimit:ai:${tier}:${organizationId}`,
      `ratelimit:ai_heavy:${tier}:${organizationId}`,
    ])

    await redis.del(...keys)
  } catch (error) {
    console.error('Error resetting rate limits:', error)
  }
}

/**
 * Check if action should be queued due to rate limit
 */
export async function shouldQueueAction(
  organizationId: string,
  tier: 'free' | 'solo' | 'team' | 'pro' | 'business' | 'enterprise',
  isHeavyJob: boolean = false
): Promise<{
  shouldQueue: boolean
  position?: number
  estimatedWait?: number
}> {
  const rateLimitCheck = isHeavyJob
    ? await checkHeavyJobRateLimit(organizationId, tier)
    : await checkAIRateLimit(organizationId, tier)

  if (rateLimitCheck.success) {
    return { shouldQueue: false }
  }

  // Calculate queue position and wait time
  const waitSeconds = rateLimitCheck.retryAfter || 60
  const queuePosition = Math.ceil(waitSeconds / 5) // Estimate based on 5 second processing time

  return {
    shouldQueue: true,
    position: queuePosition,
    estimatedWait: waitSeconds,
  }
}
