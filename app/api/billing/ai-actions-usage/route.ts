import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { UserTier, ContextLevel } from '@/lib/types/context.types';

/**
 * GET /api/billing/ai-actions-usage
 * Returns AI actions usage breakdown by context level
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
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

    // TODO: Replace with actual database queries
    // For now, return mock data based on user tier
    
    // Mock data - in production, this would query:
    // 1. Organization's subscription tier
    // 2. AI actions usage this month from database
    // 3. Breakdown by context level from action logs
    // 4. Rollover actions from previous month (if applicable)
    
    const mockData = {
      actionsUsed: 245,
      monthlyLimit: 800,
      userTier: UserTier.PRO,
      breakdown: {
        minimal: 45,
        standard: 150,
        comprehensive: 50,
        comprehensiveThinking: 0,
      },
      resetDate: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString(),
      rolloverActions: 80,
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Error fetching AI actions usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}

