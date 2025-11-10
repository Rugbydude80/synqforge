/**
 * API endpoint to fetch user's AI context level data
 * Returns tier, usage stats, and configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiContextActionsService } from '@/lib/services/ai-context-actions.service';

async function getUserContextData(req: NextRequest, context: AuthContext) {
  try {
    // Get usage stats
    const usageStats = await aiContextActionsService.getUsageStats(
      context.user.organizationId,
      context.user.id
    );

    // Get tier info
    const tierCheck = await aiContextActionsService.checkTierAccess(
      context.user.organizationId,
      'standard' as any // Just to get current tier
    );

    return NextResponse.json({
      success: true,
      data: {
        userTier: tierCheck.currentTier,
        actionsUsed: usageStats.actionsUsed,
        actionsRemaining: usageStats.actionsRemaining,
        monthlyLimit: usageStats.monthlyLimit,
        breakdown: usageStats.breakdown,
        billingPeriodStart: usageStats.billingPeriodStart,
        billingPeriodEnd: usageStats.billingPeriodEnd,
        nearLimit: usageStats.nearLimit,
        percentageUsed: usageStats.percentageUsed,
      },
    });
  } catch (error) {
    console.error('Error fetching user context data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user data',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUserContextData);

