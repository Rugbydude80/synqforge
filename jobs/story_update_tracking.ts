/**
 * Story Update Tracking Background Job
 *
 * Responsibilities:
 * 1. Aggregate daily/monthly update stats per user and organization
 * 2. Flag users approaching or exceeding update limits
 * 3. Send downgrade warnings when limits are consistently exceeded
 * 4. Sync usage counts to Stripe for metered billing (future)
 * 5. Clean up old audit records (optional retention policy)
 */

import { db } from '@/lib/db';
import { storyUpdates, users, organizations } from '@/lib/db/schema';
import { eq, gte, lte, count, and, sql } from 'drizzle-orm';

interface UpdateStats {
  userId: string;
  organizationId: string;
  totalUpdates: number;
  tier: string;
  limit: number;
  percentUsed: number;
  isOverLimit: boolean;
}

/**
 * Main job entry point - run daily via cron
 */
export async function runStoryUpdateTrackingJob() {
  console.log('[Story Update Tracking] Starting job...');

  try {
    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Aggregate user stats
    const userStats = await aggregateUserStats(startOfMonth, endOfMonth);
    console.log(`[Story Update Tracking] Processed ${userStats.length} users`);

    // Aggregate organization stats
    const orgStats = await aggregateOrganizationStats(startOfMonth, endOfMonth);
    console.log(`[Story Update Tracking] Processed ${orgStats.length} organizations`);

    // Flag users over limit
    const flaggedUsers = userStats.filter((s) => s.isOverLimit);
    if (flaggedUsers.length > 0) {
      console.log(`[Story Update Tracking] Flagged ${flaggedUsers.length} users over limit`);
      await sendLimitWarnings(flaggedUsers);
    }

    // Check for users approaching limit (90% threshold)
    const warningUsers = userStats.filter((s) => s.percentUsed >= 90 && !s.isOverLimit);
    if (warningUsers.length > 0) {
      console.log(`[Story Update Tracking] Sending warnings to ${warningUsers.length} users`);
      await sendApproachingLimitWarnings(warningUsers);
    }

    // Optional: Sync to Stripe for metered billing
    // await syncToStripe(userStats);

    // Optional: Clean up old audit records (keep 1 year by default)
    // await cleanupOldAuditRecords();

    console.log('[Story Update Tracking] Job completed successfully');
    return {
      success: true,
      userStats: userStats.length,
      orgStats: orgStats.length,
      flaggedUsers: flaggedUsers.length,
      warningUsers: warningUsers.length,
    };
  } catch (error) {
    console.error('[Story Update Tracking] Job failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Aggregate update stats per user for current month
 */
async function aggregateUserStats(
  startDate: Date,
  endDate: Date
): Promise<UpdateStats[]> {
  // Get all users with their organization tier
  const allUsers = await db
    .select({
      userId: users.id,
      organizationId: users.organizationId,
      tier: organizations.subscriptionTier,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id));

  const stats: UpdateStats[] = [];

  for (const user of allUsers) {
    // Count updates for this user this month
    const updateCount = await db
      .select({ count: count() })
      .from(storyUpdates)
      .where(
        and(
          eq(storyUpdates.userId, user.userId),
          gte(storyUpdates.updatedAt, startDate),
          lte(storyUpdates.updatedAt, endDate)
        )
      );

    const totalUpdates = updateCount[0]?.count || 0;
    const limit = getTierUpdateLimit(user.tier || 'free');
    const percentUsed = limit === Infinity ? 0 : Math.round((totalUpdates / limit) * 100);
    const isOverLimit = limit !== Infinity && totalUpdates >= limit;

    stats.push({
      userId: user.userId,
      organizationId: user.organizationId,
      totalUpdates,
      tier: user.tier || 'free',
      limit,
      percentUsed,
      isOverLimit,
    });
  }

  return stats;
}

/**
 * Aggregate update stats per organization (for Team/Enterprise tiers)
 */
async function aggregateOrganizationStats(
  startDate: Date,
  endDate: Date
): Promise<UpdateStats[]> {
  // Get all team/enterprise organizations
  const teamOrgs = await db
    .select({
      organizationId: organizations.id,
      tier: organizations.subscriptionTier,
    })
    .from(organizations)
    .where(
      sql`${organizations.subscriptionTier} IN ('team', 'business', 'enterprise')`
    );

  const stats: UpdateStats[] = [];

  for (const org of teamOrgs) {
    // Count updates for this org this month
    const updateCount = await db
      .select({ count: count() })
      .from(storyUpdates)
      .where(
        and(
          eq(storyUpdates.organizationId, org.organizationId),
          gte(storyUpdates.updatedAt, startDate),
          lte(storyUpdates.updatedAt, endDate)
        )
      );

    const totalUpdates = updateCount[0]?.count || 0;
    const limit = Infinity; // Team/Enterprise have unlimited

    stats.push({
      userId: '', // Org-level stat
      organizationId: org.organizationId,
      totalUpdates,
      tier: org.tier || 'team',
      limit,
      percentUsed: 0,
      isOverLimit: false,
    });
  }

  return stats;
}

/**
 * Send warnings to users who exceeded their limit
 */
async function sendLimitWarnings(users: UpdateStats[]) {
  // TODO: Implement email notification
  console.log('[Story Update Tracking] Would send limit warnings to:', users.length, 'users');

  // Example: Send to notification service
  for (const user of users) {
    console.log(`User ${user.userId} exceeded limit: ${user.totalUpdates}/${user.limit}`);
    // await notificationService.send({
    //   userId: user.userId,
    //   type: 'update_limit_exceeded',
    //   data: {
    //     used: user.totalUpdates,
    //     limit: user.limit,
    //     tier: user.tier,
    //   },
    // });
  }
}

/**
 * Send warnings to users approaching their limit (90%+)
 */
async function sendApproachingLimitWarnings(users: UpdateStats[]) {
  // TODO: Implement email notification
  console.log('[Story Update Tracking] Would send approaching limit warnings to:', users.length, 'users');

  for (const user of users) {
    const remaining = user.limit - user.totalUpdates;
    console.log(`User ${user.userId} at ${user.percentUsed}% (${remaining} remaining)`);
    // await notificationService.send({
    //   userId: user.userId,
    //   type: 'update_limit_approaching',
    //   data: {
    //     used: user.totalUpdates,
    //     limit: user.limit,
    //     remaining,
    //     percentUsed: user.percentUsed,
    //   },
    // });
  }
}

/**
 * Sync usage to Stripe for metered billing (future feature)
 */
async function syncToStripe(userStats: UpdateStats[]) {
  console.log('[Story Update Tracking] Syncing to Stripe (placeholder)');

  // TODO: Implement Stripe usage records API
  // for (const user of userStats) {
  //   if (user.tier !== 'free') {
  //     await stripe.subscriptionItems.createUsageRecord(
  //       user.stripeSubscriptionItemId,
  //       {
  //         quantity: user.totalUpdates,
  //         timestamp: Math.floor(Date.now() / 1000),
  //         action: 'set',
  //       }
  //     );
  //   }
  // }
}

/**
 * Clean up old audit records beyond retention policy
 */
async function cleanupOldAuditRecords() {
  const retentionDays = 365; // Keep 1 year by default
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`[Story Update Tracking] Cleaning up audit records older than ${cutoffDate.toISOString()}`);

  const result = await db
    .delete(storyUpdates)
    .where(lte(storyUpdates.updatedAt, cutoffDate));

  console.log(`[Story Update Tracking] Deleted old audit records`);
}

/**
 * Get update limit for a tier
 */
function getTierUpdateLimit(tier: string): number {
  switch (tier) {
    case 'free':
    case 'starter':
      return 5;
    case 'solo':
    case 'pro_solo':
    case 'pro_collaborative':
    case 'pro':
      return 1000;
    case 'team':
    case 'business':
    case 'enterprise':
      return Infinity;
    default:
      return 0;
  }
}

/**
 * Manual trigger for testing (call from API or CLI)
 */
export async function triggerStoryUpdateTracking() {
  console.log('[Story Update Tracking] Manual trigger initiated');
  return await runStoryUpdateTrackingJob();
}

// Export for cron job registration
export const config = {
  schedule: '0 0 * * *', // Run daily at midnight
  timezone: 'UTC',
};
