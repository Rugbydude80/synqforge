import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { StoriesRepository } from '@/lib/repositories/stories.repository'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { NotFoundError, AuthorizationError } from '@/lib/errors/custom-errors'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/projects/[projectId]/stories
 * List all stories for a specific project
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const projectId = params.projectId

    // Verify project exists and user has access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify user belongs to the same organization as the project
    if (project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied to this project' },
        { status: 403 }
      )
    }

    // Get stories
    const repository = new StoriesRepository()
    const result = await repository.list(
      {
        projectId,
        organizationId: user.organizationId
      },
      {
        limit: 1000, // Get all stories for the project
        orderBy: 'createdAt',
        orderDirection: 'desc'
      }
    )

    return NextResponse.json({
      data: result.stories,
      total: result.total
    })
  } catch (error) {
    console.error('Error fetching project stories:', error)
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}
