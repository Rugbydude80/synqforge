/**
 * Rate Limiting Middleware for Story Refinement
 * Enforces tier-based rate limits for refinement operations
 */

import { db } from '@/lib/db';
import { storyRefinements, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isSuperAdmin } from '@/lib/auth/super-admin';

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
  // 🔓 SUPER ADMIN BYPASS
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user && isSuperAdmin(user.email)) {
    console.log(`🔓 Super Admin detected (${user.email}) - bypassing rate limits`);
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: new Date(Date.now() + 3600000), // 1 hour from now
    };
  }

  const config = RATE_LIMITS[tier.toLowerCase()] || RATE_LIMITS.free;

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Count refinements in current window
  const allRefinements = await db
    .select()
    .from(storyRefinements)
    .where(eq(storyRefinements.userId, userId));

  // Filter to those in the current window (client-side filtering for simplicity)
  const count = allRefinements.filter(
    (r) => r.createdAt && new Date(r.createdAt) >= windowStart
  ).length;

  const allowed = count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);
  const resetAt = new Date(now.getTime() + config.windowMs);

  return { allowed, remaining, resetAt };
}

