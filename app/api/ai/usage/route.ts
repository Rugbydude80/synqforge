import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { aiUsage } from '@/lib/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const organizationId = req.nextUrl.searchParams.get('organizationId');
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query conditions
    const conditions = [
      gte(aiUsage.createdAt, startDate),
    ];

    if (organizationId) {
      conditions.push(eq(aiUsage.organizationId, organizationId));
    } else {
      conditions.push(eq(aiUsage.userId, session.user.id));
    }

    // Get usage statistics
    const usageStats = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        totalTokens: sql<number>`sum(${aiUsage.totalTokens})`,
        totalPromptTokens: sql<number>`sum(${aiUsage.promptTokens})`,
        totalCompletionTokens: sql<number>`sum(${aiUsage.completionTokens})`,
      })
      .from(aiUsage)
      .where(and(...conditions));

    // Get usage by model
    const usageByModel = await db
      .select({
        model: aiUsage.model,
        requests: sql<number>`count(*)`,
        tokens: sql<number>`sum(${aiUsage.totalTokens})`,
      })
      .from(aiUsage)
      .where(and(...conditions))
      .groupBy(aiUsage.model);

    // Get daily usage for chart data
    const dailyUsage = await db
      .select({
        date: sql<string>`DATE(${aiUsage.createdAt})`,
        requests: sql<number>`count(*)`,
        tokens: sql<number>`sum(${aiUsage.totalTokens})`,
      })
      .from(aiUsage)
      .where(and(...conditions))
      .groupBy(sql`DATE(${aiUsage.createdAt})`)
      .orderBy(sql`DATE(${aiUsage.createdAt})`);

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
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
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
