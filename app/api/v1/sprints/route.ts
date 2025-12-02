/**
 * REST API v1 - Sprints Endpoints
 * GET /api/v1/sprints - List sprints
 * POST /api/v1/sprints - Create sprint
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import {
  createSprintRequestSchema,
  type CreateSprintRequest,
} from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/v1/sprints
 */
async function listSprints(req: NextRequest, context: ApiAuthContext) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'projectId query parameter is required',
          statusCode: 400,
        },
        { status: 400 }
      )
    }

    // Verify project access
    const [project] = await db
      .select({ id: projects.id, organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project', projectId)
    }

    if (project.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this project')
    }

    const sprintsRepo = new SprintsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const sprintsList = await sprintsRepo.getSprints(projectId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: sprintsList,
        meta: {
          page: 1,
          total: sprintsList.length,
          hasMore: false,
        },
      },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error listing sprints:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list sprints',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/sprints
 */
async function createSprint(req: NextRequest, context: ApiAuthContext) {
  try {
    if (!context.apiKey.scopes.includes('write')) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'This endpoint requires write scope',
          statusCode: 403,
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validationResult = createSprintRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid sprint data', {
        issues: validationResult.error.issues,
      })
    }

    const sprintData = validationResult.data as CreateSprintRequest

    // Verify project access
    const [project] = await db
      .select({ id: projects.id, organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, sprintData.projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project', sprintData.projectId)
    }

    if (project.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this project')
    }

    const sprintsRepo = new SprintsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const sprint = await sprintsRepo.createSprint({
      projectId: sprintData.projectId,
      name: sprintData.name,
      goal: sprintData.goal,
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
    })

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: sprint },
      {
        status: 201,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error creating sprint:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create sprint',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(listSprints)
export const POST = withApiAuth(createSprint, { requireWrite: true })

