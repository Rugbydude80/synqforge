/**
 * Subscription Usage Display Endpoint
 * Returns current usage statistics for user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { workspaceUsage, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentBillingPeriod } from '@/lib/billing/fair-usage-guards';

interface UsageResponse {
  actionsUsed: number;
  actionsLimit: number;
  actionsRemaining: number;
  percentUsed: number;
  tier: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  isWarning: boolean; // 90%+ usage
  rolloverAvailable?: number;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const organizationId = session.user.organizationId;

    // Get organization details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get current billing period
    const { start, end } = getCurrentBillingPeriod();

    // Get usage for current period
    const [usage] = await db
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.organizationId, organizationId))
      .limit(1);

    if (!usage) {
      // No usage yet - return defaults for starter tier
      return NextResponse.json({
        actionsUsed: 0,
        actionsLimit: 25,
        actionsRemaining: 25,
        percentUsed: 0,
        tier: 'starter',
        billingPeriodStart: start.toISOString(),
        billingPeriodEnd: end.toISOString(),
        isWarning: false,
      } as UsageResponse);
    }

    const actionsUsed = usage.tokensUsed;
    const actionsLimit = usage.tokensLimit;
    const actionsRemaining = Math.max(0, actionsLimit - actionsUsed);
    const percentUsed = Math.round((actionsUsed / actionsLimit) * 100);
    const isWarning = percentUsed >= 90;

    const response: UsageResponse = {
      actionsUsed,
      actionsLimit,
      actionsRemaining,
      percentUsed,
      tier: org.subscriptionTier || 'starter',
      billingPeriodStart: usage.billingPeriodStart.toISOString(),
      billingPeriodEnd: usage.billingPeriodEnd.toISOString(),
      isWarning,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
