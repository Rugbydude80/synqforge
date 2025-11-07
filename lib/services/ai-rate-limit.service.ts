/**
 * AI Rate Limiting Service
 * Implements workspace-level rate limiting for AI actions
 * Limits: 60 AI actions/min, 6 heavy jobs/min (configurable per tier)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { SUBSCRIPTION_LIMITS } from '@/lib/constants'

// Check if Redis is configured
const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Initialize Redis client (only if configured)
const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Helper function to create rate limiters (handles null redis)
function createRateLimiter(prefix: string, limit: number, duration: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!redis) {
    return null
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, duration),
    analytics: true,
    prefix,
  })
}

// Rate limiters for different tiers
const rateLimiters = {
  free: {
    standard: createRateLimiter('ratelimit:ai:free', 10, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:free', 1, '60 s'),
  },
  starter: {
    standard: createRateLimiter('ratelimit:ai:starter', 5, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:free', 1, '60 s'),
  },
  solo: {
    standard: createRateLimiter('ratelimit:ai:solo', 30, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:solo', 3, '60 s'),
  },
  core: {
    standard: createRateLimiter('ratelimit:ai:core', 30, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:core', 3, '60 s'),
  },
  admin: {
    standard: createRateLimiter('ratelimit:ai:admin', 1000, '60 s'), // Effectively unlimited
    heavy: createRateLimiter('ratelimit:ai_heavy:admin', 100, '60 s'), // Effectively unlimited
  },
  team: {
    standard: createRateLimiter('ratelimit:ai:team', 60, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:team', 6, '60 s'),
  },
  pro: {
    standard: createRateLimiter('ratelimit:ai:pro', 90, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:pro', 9, '60 s'),
  },
  business: {
    standard: createRateLimiter('ratelimit:ai:business', 60, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:business', 6, '60 s'),
  },
  enterprise: {
    standard: createRateLimiter('ratelimit:ai:enterprise', 120, '60 s'),
    heavy: createRateLimiter('ratelimit:ai_heavy:enterprise', 12, '60 s'),
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
  tier: 'free' | 'starter' | 'solo' | 'core' | 'team' | 'pro' | 'business' | 'enterprise'
): Promise<RateLimitResult> {
  // If Redis is not configured, allow all requests
  const limiter = rateLimiters[tier]?.standard
  if (!limiter) {
    return {
      success: true,
      limit: 60,
      remaining: 60,
      reset: new Date(Date.now() + 60000),
    }
  }

  try {
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
  tier: 'free' | 'solo' | 'core' | 'team' | 'pro' | 'business' | 'enterprise' | 'admin' | 'starter'
): Promise<RateLimitResult> {
  // Admin tier bypass
  if (tier === 'admin') {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: new Date(Date.now() + 60000),
    }
  }
  
  // If Redis is not configured, allow all requests
  const limiter = rateLimiters[tier]?.heavy
  if (!limiter) {
    return {
      success: true,
      limit: 6,
      remaining: 6,
      reset: new Date(Date.now() + 60000),
    }
  }
  
  try {
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
  tier: 'free' | 'starter' | 'solo' | 'core' | 'team' | 'pro' | 'business' | 'enterprise' | 'admin'
): Promise<{
  standard: { limit: number; remaining: number; reset: Date }
  heavy: { limit: number; remaining: number; reset: Date }
}> {
  // Admin tier bypass
  if (tier === 'admin') {
    return {
      standard: {
        limit: Infinity,
        remaining: Infinity,
        reset: new Date(Date.now() + 60000),
      },
      heavy: {
        limit: Infinity,
        remaining: Infinity,
        reset: new Date(Date.now() + 60000),
      },
    }
  }
  
  const limits = SUBSCRIPTION_LIMITS[tier]

  // Get current usage from rate limiters
  const standardKey = `ratelimit:ai:${tier}:${organizationId}`
  const heavyKey = `ratelimit:ai_heavy:${tier}:${organizationId}`

  try {
    if (!redis) {
      // If Redis is not configured, return limits from subscription config
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
  if (!redis) {
    return // No-op if Redis is not configured
  }

  const tiers = ['free', 'starter', 'solo', 'core', 'team', 'pro', 'business', 'enterprise', 'admin'] as const

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
  tier: 'free' | 'solo' | 'core' | 'team' | 'pro' | 'business' | 'enterprise',
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
