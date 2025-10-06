import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { aiGenerations } from '@/lib/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

async function getAIUsage(req: NextRequest, context: AuthContext) {
  try {
    // Get query parameters
    const organizationId = req.nextUrl.searchParams.get('organizationId');
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query conditions
    const conditions = [
      gte(aiGenerations.createdAt, startDate),
    ];

    if (organizationId) {
      conditions.push(eq(aiGenerations.organizationId, organizationId));
    } else {
      conditions.push(eq(aiGenerations.userId, context.user.id));
    }

    // Get usage statistics
    const usageStats = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        totalTokens: sql<number>`sum(${aiGenerations.tokensUsed})`,
        totalCost: sql<number>`sum(${aiGenerations.costUsd})`,
      })
      .from(aiGenerations)
      .where(and(...conditions));

    // Get usage by model
    const usageByModel = await db
      .select({
        model: aiGenerations.model,
        requests: sql<number>`count(*)`,
        tokens: sql<number>`sum(${aiGenerations.tokensUsed})`,
      })
      .from(aiGenerations)
      .where(and(...conditions))
      .groupBy(aiGenerations.model);

    // Get daily usage for chart data
    const dailyUsage = await db
      .select({
        date: sql<string>`DATE(${aiGenerations.createdAt})`,
        requests: sql<number>`count(*)`,
        tokens: sql<number>`sum(${aiGenerations.tokensUsed})`,
      })
      .from(aiGenerations)
      .where(and(...conditions))
      .groupBy(sql`DATE(${aiGenerations.createdAt})`)
      .orderBy(sql`DATE(${aiGenerations.createdAt})`);

    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      summary: usageStats[0] || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
      },
      byModel: usageByModel,
      daily: dailyUsage,
    });

  } catch (error) {
    console.error('Get AI usage error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get AI usage',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAIUsage);
