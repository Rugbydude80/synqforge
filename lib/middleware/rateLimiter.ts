/**
 * Rate Limiting Middleware for Story Refinement
 * Enforces tier-based rate limits for refinement operations
 */

import { db } from '@/lib/db';
import { storyRefinements } from '@/lib/db/schema';
import { eq, gte, sql } from 'drizzle-orm';
import { SubscriptionTier } from '@/lib/featureGates';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { maxRequests: 0, windowMs: 3600000 }, // No access
  starter: { maxRequests: 0, windowMs: 3600000 }, // No access
  basic: { maxRequests: 0, windowMs: 3600000 }, // No access
  core: { maxRequests: 0, windowMs: 3600000 }, // No access
  pro: { maxRequests: 10, windowMs: 3600000 }, // 10 per hour
  team: { maxRequests: 25, windowMs: 3600000 }, // 25 per hour
  enterprise: { maxRequests: 100, windowMs: 3600000 }, // 100 per hour
  admin: { maxRequests: 1000, windowMs: 3600000 }, // Very high limit for admin
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if user has exceeded rate limit for refinements
 */
export async function checkRateLimit(
  userId: string,
  tier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier.toLowerCase()] || RATE_LIMITS.free;

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Count refinements in current window using SQL
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(storyRefinements)
    .where(
      sql`${storyRefinements.userId} = ${userId} AND ${storyRefinements.createdAt} >= ${windowStart}`
    );

  const count = Number(result[0]?.count || 0);

  const allowed = count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);
  const resetAt = new Date(now.getTime() + config.windowMs);

  return { allowed, remaining, resetAt };
}

