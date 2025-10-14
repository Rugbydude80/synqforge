import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { getMonthlyUsage, getOrganizationLimits, getTokenBalance } from '@/lib/services/ai-usage.service';

async function getCurrentUsage(_req: NextRequest, context: AuthContext) {
  try {
    const [usage, limits, purchasedTokens] = await Promise.all([
      getMonthlyUsage(context.user.organizationId),
      getOrganizationLimits(context.user.organizationId),
      getTokenBalance(context.user.organizationId),
    ]);

    // Calculate billing month reset date
    const now = new Date();
    const billingResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return NextResponse.json({
      success: true,
      usage: {
        ...usage,
        purchasedTokensAvailable: purchasedTokens,
      },
      limits: {
        monthlyTokens: limits.monthlyAITokens,
        monthlyGenerations: limits.monthlyAIGenerations,
        maxStoriesPerGeneration: limits.maxStoriesPerGeneration,
        maxProjects: limits.maxProjects,
        maxUsers: limits.maxUsers,
        tier: limits.displayName,
      },
      billingResetDate,
      canPurchaseTokens: true, // Always allow token purchases
    });
  } catch (error) {
    console.error('Get current usage error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get usage data',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCurrentUsage);
