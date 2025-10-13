import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { projects, stories, epics } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * GET /api/dashboard/stats
 * Get organization-wide dashboard statistics
 */
async function getDashboardStats(_req: NextRequest, context: any) {
  try {
    const organizationId = context.user.organizationId

    // Get aggregated stats across all projects
    const [stats] = await db
      .select({
        totalProjects: sql<number>`COUNT(DISTINCT ${projects.id})`,
        activeProjects: sql<number>`COUNT(DISTINCT CASE WHEN ${projects.status} = 'active' THEN ${projects.id} END)`,
        totalStories: sql<number>`COUNT(DISTINCT ${stories.id})`,
        completedStories: sql<number>`COUNT(DISTINCT CASE WHEN ${stories.status} = 'done' THEN ${stories.id} END)`,
        aiGeneratedStories: sql<number>`COUNT(DISTINCT CASE WHEN ${stories.aiGenerated} = true THEN ${stories.id} END)`,
        totalEpics: sql<number>`COUNT(DISTINCT ${epics.id})`,
      })
      .from(projects)
      .leftJoin(stories, eq(stories.projectId, projects.id))
      .leftJoin(epics, eq(epics.projectId, projects.id))
      .where(eq(projects.organizationId, organizationId))

    // Calculate percentages
    const completionPercentage = stats.totalStories > 0
      ? Math.round((stats.completedStories / stats.totalStories) * 100)
      : 0

    const aiGeneratedPercentage = stats.totalStories > 0
      ? Math.round((stats.aiGeneratedStories / stats.totalStories) * 100)
      : 0

    return NextResponse.json({
      totalProjects: Number(stats.totalProjects) || 0,
      activeProjects: Number(stats.activeProjects) || 0,
      totalStories: Number(stats.totalStories) || 0,
      completedStories: Number(stats.completedStories) || 0,
      aiGeneratedStories: Number(stats.aiGeneratedStories) || 0,
      totalEpics: Number(stats.totalEpics) || 0,
      completionPercentage,
      aiGeneratedPercentage,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getDashboardStats)
