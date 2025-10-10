/**
 * Rate Limiting Service
 *
 * Uses Upstash Redis for distributed rate limiting across Vercel edge functions
 *
 * Setup Instructions:
 * 1. Create free account at https://console.upstash.com
 * 2. Create a new Redis database
 * 3. Copy REST API URL and Token
 * 4. Add to .env:
 *    UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=your-token
 * 5. Add same variables to Vercel environment variables
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if rate limiting is configured
const isRateLimitEnabled = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Initialize Redis client (only if configured)
const redis = isRateLimitEnabled
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

function createRateLimiter(prefix: string, limit: number, duration: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  return redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, duration),
        analytics: true,
        prefix,
      })
    : null
}

/**
 * Rate limiter for password reset requests
 *
 * Limits:
 * - 3 requests per email per hour (prevents spamming specific users)
 * - Uses sliding window algorithm for accurate rate limiting
 *
 * In production, you can also add IP-based rate limiting
 */
export const passwordResetRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:password-reset',
    })
  : null

/**
 * Rate limiter for password reset token validation
 *
 * Limits:
 * - 5 attempts per token per 15 minutes (prevents brute force on tokens)
 * - More lenient than forgot-password because user has the token
 */
export const resetTokenRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:reset-token',
    })
  : null

export const signupRateLimit = createRateLimiter(
  'ratelimit:auth-signup',
  5,
  '10 m'
)

export const aiGenerationRateLimit = createRateLimiter(
  'ratelimit:ai-generate',
  10,
  '1 m'
)

/**
 * Helper function to check rate limit and return appropriate response
 *
 * @param identifier - Unique identifier (email, IP, or token)
 * @param limiter - Rate limit instance to use
 * @returns Object with success status and remaining attempts
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    console.warn('[RATE LIMIT] Not configured - allowing request')
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 3600000,
    }
  }

  try {
    const result = await limiter.limit(identifier)

    if (!result.success) {
      console.warn(`[RATE LIMIT] Blocked: ${identifier}`, {
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
      })
    }

    return result
  } catch (error) {
    console.error('[RATE LIMIT] Error checking rate limit:', error)
    // On error, allow the request (fail open)
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    }
  }
}

/**
 * Get human-readable time until rate limit resets
 */
export function getResetTimeMessage(reset: number): string {
  const now = Date.now()
  const diff = reset - now

  if (diff <= 0) return 'now'

  const minutes = Math.ceil(diff / 60000)

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * Log rate limit status for monitoring
 */
export function logRateLimitStatus() {
  if (isRateLimitEnabled) {
    console.log('[RATE LIMIT] ✅ Enabled with Upstash Redis')
  } else {
    console.warn('[RATE LIMIT] ⚠️  Not configured - Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
  }
}
