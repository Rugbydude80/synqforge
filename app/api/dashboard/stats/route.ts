import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { projects, stories, epics } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * GET /api/dashboard/stats
 * Get organization-wide dashboard statistics
 * Uses separate subqueries for accurate counts
 */
async function getDashboardStats(_request: NextRequest, context: any) {
  try {
    const organizationId = context.user.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Organization ID is required' },
        { status: 401 }
      )
    }

    // Use separate queries for accurate counts (LEFT JOINs can cause duplicate counting issues)
    const [stats] = await db
      .select({
        // Project counts
        totalProjects: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
        )`,
        activeProjects: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'active'
        )`,
        planningProjects: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'planning'
        )`,
        onHoldProjects: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'on_hold'
        )`,
        completedProjects: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'completed'
        )`,
        archivedProjects: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'archived'
        )`,
        // Story counts (across all projects in org)
        totalStories: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${stories}
          INNER JOIN ${projects} ON ${stories.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
        )`,
        completedStories: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${stories}
          INNER JOIN ${projects} ON ${stories.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${stories.status} = 'done'
        )`,
        aiGeneratedStories: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${stories}
          INNER JOIN ${projects} ON ${stories.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${stories.aiGenerated} = true
        )`,
        // Epic counts (across all projects in org)
        totalEpics: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${epics}
          INNER JOIN ${projects} ON ${epics.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
        )`,
      })
      .from(projects)
      .where(eq(projects.organizationId, organizationId))
      .limit(1)

    // Handle case where no projects exist (stats will be undefined)
    if (!stats) {
      return NextResponse.json({
        totalProjects: 0,
        activeProjects: 0,
        planningProjects: 0,
        onHoldProjects: 0,
        completedProjects: 0,
        archivedProjects: 0,
        totalStories: 0,
        completedStories: 0,
        aiGeneratedStories: 0,
        totalEpics: 0,
        completionPercentage: 0,
        aiGeneratedPercentage: 0,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }

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
      planningProjects: Number(stats.planningProjects) || 0,
      onHoldProjects: Number(stats.onHoldProjects) || 0,
      completedProjects: Number(stats.completedProjects) || 0,
      archivedProjects: Number(stats.archivedProjects) || 0,
      totalStories: Number(stats.totalStories) || 0,
      completedStories: Number(stats.completedStories) || 0,
      aiGeneratedStories: Number(stats.aiGeneratedStories) || 0,
      totalEpics: Number(stats.totalEpics) || 0,
      completionPercentage,
      aiGeneratedPercentage,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics', message: errorMessage },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getDashboardStats)
