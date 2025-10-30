import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { projects, stories, epics } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

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

    const statsResult = await db.execute<{
      totalProjects: number
      activeProjects: number
      planningProjects: number
      onHoldProjects: number
      completedProjects: number
      archivedProjects: number
      totalStories: number
      completedStories: number
      aiGeneratedStories: number
      totalEpics: number
    }>(sql`
      SELECT 
        (
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
        ) as "totalProjects",
        (
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'active'
        ) as "activeProjects",
        (
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'planning'
        ) as "planningProjects",
        (
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'on_hold'
        ) as "onHoldProjects",
        (
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'completed'
        ) as "completedProjects",
        (
          SELECT COUNT(*)::int 
          FROM ${projects} 
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${projects.status} = 'archived'
        ) as "archivedProjects",
        (
          SELECT COUNT(*)::int 
          FROM ${stories}
          INNER JOIN ${projects} ON ${stories.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
        ) as "totalStories",
        (
          SELECT COUNT(*)::int 
          FROM ${stories}
          INNER JOIN ${projects} ON ${stories.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${stories.status} = 'done'
        ) as "completedStories",
        (
          SELECT COUNT(*)::int 
          FROM ${stories}
          INNER JOIN ${projects} ON ${stories.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
          AND ${stories.aiGenerated} = true
        ) as "aiGeneratedStories",
        (
          SELECT COUNT(*)::int 
          FROM ${epics}
          INNER JOIN ${projects} ON ${epics.projectId} = ${projects.id}
          WHERE ${projects.organizationId} = ${organizationId}
        ) as "totalEpics"
    `)

    const stats = (statsResult[0] as any) || {
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
