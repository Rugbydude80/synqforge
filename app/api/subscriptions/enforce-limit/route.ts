/**
 * Subscription Action Limit Enforcement Endpoint
 * Checks if organization can perform AI actions based on current tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { workspaceUsage, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentBillingPeriod } from '@/lib/billing/fair-usage-guards';

interface ActionLimitResponse {
  allowed: boolean;
  actionsRemaining: number;
  actionsUsed: number;
  actionsLimit: number;
  rolloverBalance?: number;
  percentUsed: number;
  reason?: string;
  suggestedPlan?: string;
  upgradeUrl?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { organizationId } = await req.json();
    
    // Verify user belongs to organization
    if (organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden - you do not belong to this organization' },
        { status: 403 }
      );
    }

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
    const { start } = getCurrentBillingPeriod();

    // Get usage for current period
    const [usage] = await db
      .select()
      .from(workspaceUsage)
      .where(eq(workspaceUsage.organizationId, organizationId))
      .limit(1);

    if (!usage) {
      // No usage record yet - allow with starter defaults
      return NextResponse.json({
        allowed: true,
        actionsRemaining: 25,
        actionsUsed: 0,
        actionsLimit: 25,
        percentUsed: 0,
        reason: 'New organization - using Starter tier defaults',
      } as ActionLimitResponse);
    }

    // Calculate availability
    const totalLimit = usage.tokensLimit;
    const actionsUsed = usage.tokensUsed;
    const actionsRemaining = Math.max(0, totalLimit - actionsUsed);
    const percentUsed = Math.round((actionsUsed / totalLimit) * 100);
    const allowed = actionsRemaining > 0;

    // Determine suggested upgrade if over limit
    let suggestedPlan: string | undefined;
    if (!allowed) {
      const tier = org.subscriptionTier || 'starter';
      if (tier === 'starter') suggestedPlan = 'Core (400 actions/month)';
      else if (tier === 'core') suggestedPlan = 'Pro (800 actions/month)';
      else if (tier === 'pro') suggestedPlan = 'Team (10,000+ actions/month)';
    }

    const response: ActionLimitResponse = {
      allowed,
      actionsRemaining,
      actionsUsed,
      actionsLimit: totalLimit,
      percentUsed,
      reason: allowed 
        ? undefined 
        : `Monthly action limit reached (${actionsUsed}/${totalLimit} used)`,
      suggestedPlan,
      upgradeUrl: allowed ? undefined : '/pricing',
    };

    return NextResponse.json(response, {
      status: allowed ? 200 : 402, // 402 Payment Required
    });
  } catch (error) {
    console.error('Error checking action limit:', error);
    return NextResponse.json(
      { error: 'Failed to check action limit' },
      { status: 500 }
    );
  }
}
