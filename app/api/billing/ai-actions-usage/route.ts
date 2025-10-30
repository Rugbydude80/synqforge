import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { UserTier, TIER_MONTHLY_LIMITS } from '@/lib/types/context.types';
import { db } from '@/lib/db';
import { organizations, users, aiActionUsage, aiActionRollover } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * Map organization plan name to UserTier enum
 */
function mapPlanToUserTier(plan: string | null): UserTier {
  if (!plan) return UserTier.STARTER;
  
  const planLower = plan.toLowerCase();
  if (planLower === 'free' || planLower === 'starter') return UserTier.STARTER;
  if (planLower === 'solo' || planLower === 'core') return UserTier.CORE;
  if (planLower === 'pro') return UserTier.PRO;
  if (planLower === 'team') return UserTier.TEAM;
  if (planLower === 'enterprise') return UserTier.ENTERPRISE;
  
  return UserTier.STARTER; // Default fallback
}

/**
 * Get current billing period start and end dates
 */
function getBillingPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * GET /api/billing/ai-actions-usage
 * Returns AI actions usage breakdown by context level
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required' },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user || user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized: User does not belong to organization' },
        { status: 403 }
      );
    }

    // Get organization details
    const [organization] = await db
      .select({
        plan: organizations.plan,
        subscriptionStatus: organizations.subscriptionStatus,
        subscriptionRenewalAt: organizations.subscriptionRenewalAt,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Map plan to UserTier
    const userTier = mapPlanToUserTier(organization.plan);
    const monthlyLimit = TIER_MONTHLY_LIMITS[userTier];

    // Get current billing period
    const { start, end } = getBillingPeriod();

    // Get current period usage for this user
    const [userUsage] = await db
      .select({
        actionsUsed: aiActionUsage.actionsUsed,
        allowance: aiActionUsage.allowance,
        actionBreakdown: aiActionUsage.actionBreakdown,
      })
      .from(aiActionUsage)
      .where(
        and(
          eq(aiActionUsage.organizationId, organizationId),
          eq(aiActionUsage.userId, user.id),
          gte(aiActionUsage.billingPeriodStart, start),
          lte(aiActionUsage.billingPeriodEnd, end)
        )
      )
      .limit(1);

    // Get rollover actions for this period
    const [rollover] = await db
      .select({
        rolloverAmount: aiActionRollover.rolloverAmount,
      })
      .from(aiActionRollover)
      .where(
        and(
          eq(aiActionRollover.organizationId, organizationId),
          eq(aiActionRollover.userId, user.id),
          eq(aiActionRollover.appliedToPeriodStart, start)
        )
      )
      .limit(1);

    // Parse action breakdown
    const breakdown = (userUsage?.actionBreakdown as Record<string, number>) || {};
    
    // Map breakdown to context levels (this is a simplified mapping)
    // In a real implementation, you'd track which context level was used for each action
    const breakdownByLevel = {
      minimal: breakdown['minimal'] || breakdown['MINIMAL'] || 0,
      standard: breakdown['standard'] || breakdown['STANDARD'] || 0,
      comprehensive: breakdown['comprehensive'] || breakdown['COMPREHENSIVE'] || 0,
      comprehensiveThinking: breakdown['comprehensive-thinking'] || breakdown['COMPREHENSIVE_THINKING'] || 0,
    };

    // Calculate reset date (next billing period start)
    const resetDate = new Date(end);
    resetDate.setDate(end.getDate() + 1);
    resetDate.setHours(0, 0, 0, 0);

    // Use subscription renewal date if available, otherwise use next month
    const displayResetDate = organization.subscriptionRenewalAt 
      ? new Date(organization.subscriptionRenewalAt)
      : resetDate;

    return NextResponse.json({
      actionsUsed: userUsage?.actionsUsed || 0,
      monthlyLimit: userUsage?.allowance || monthlyLimit,
      userTier,
      breakdown: breakdownByLevel,
      resetDate: displayResetDate.toISOString(),
      rolloverActions: rollover?.rolloverAmount || 0,
    });
  } catch (error) {
    console.error('Error fetching AI actions usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}

