/**
 * API Rate Limiting Middleware
 * Rate limits API requests by API key ID with tier-based limits
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiKeyRateLimiter, checkRateLimit } from '@/lib/rate-limit'
import type { ApiKeyContext } from '@/lib/services/api-key.service'

/**
 * Check rate limit for an API key
 * Returns rate limit result with headers
 */
export async function checkApiKeyRateLimit(
  apiKeyContext: ApiKeyContext,
  organizationTier: string
): Promise<{
  allowed: boolean
  limit: number
  remaining: number
  reset: number
  headers: Record<string, string>
}> {
  // Determine rate limit based on tier or custom limit
  let limitPerHour: number
  if (apiKeyContext.rateLimitPerHour !== null) {
    // Custom limit (Enterprise)
    limitPerHour = apiKeyContext.rateLimitPerHour
  } else {
    // Tier-based limits
    switch (organizationTier) {
      case 'pro':
        limitPerHour = parseInt(process.env.API_RATE_LIMIT_PRO || '1000', 10)
        break
      case 'team':
        limitPerHour = parseInt(process.env.API_RATE_LIMIT_TEAM || '5000', 10)
        break
      case 'enterprise':
      case 'admin':
        // Unlimited for Enterprise (no rate limiting)
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          reset: Date.now() + 3600000,
          headers: {
            'X-RateLimit-Limit': 'unlimited',
            'X-RateLimit-Remaining': 'unlimited',
            'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
          },
        }
      default:
        limitPerHour = 1000
    }
  }

  // Create rate limiter for this limit
  const limiter = createApiKeyRateLimiter(limitPerHour)

  // Rate limit by API key ID
  const result = await checkRateLimit(`api-key:${apiKeyContext.apiKeyId}`, limiter)

  // Calculate reset time (next hour)
  const resetTime = new Date(result.reset)
  const resetSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000)

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': resetTime.toISOString(),
      ...(result.success ? {} : { 'Retry-After': resetSeconds.toString() }),
    },
  }
}

/**
 * Middleware to check rate limit and return 429 if exceeded
 */
export async function enforceApiRateLimit(
  apiKeyContext: ApiKeyContext,
  organizationTier: string
): Promise<NextResponse | null> {
  const rateLimitResult = await checkApiKeyRateLimit(apiKeyContext, organizationTier)

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Limit: ${rateLimitResult.limit} requests per hour. Try again after ${new Date(rateLimitResult.reset).toISOString()}`,
        statusCode: 429,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: new Date(rateLimitResult.reset).toISOString(),
      },
      {
        status: 429,
        headers: rateLimitResult.headers,
      }
    )
  }

  return null
}

