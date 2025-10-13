import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { db } from '@/lib/db'
import { activities, users, projects } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/activities
 * Get recent activities for the organization
 */
async function getActivities(req: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const organizationId = context.user.organizationId

    const recentActivities = await db
      .select({
        id: activities.id,
        action: activities.action,
        resourceType: activities.resourceType,
        resourceId: activities.resourceId,
        metadata: activities.metadata,
        oldValues: activities.oldValues,
        newValues: activities.newValues,
        createdAt: activities.createdAt,
        // User info
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        // Project info
        projectId: projects.id,
        projectName: projects.name,
        projectSlug: projects.slug,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .where(eq(activities.organizationId, organizationId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)

    return NextResponse.json({
      data: recentActivities,
      total: recentActivities.length,
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getActivities)
