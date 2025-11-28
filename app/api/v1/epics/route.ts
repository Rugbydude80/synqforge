/**
 * REST API v1 - Epics Endpoints
 * GET /api/v1/epics - List epics
 * POST /api/v1/epics - Create epic
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import {
  createEpicRequestSchema,
  type CreateEpicRequest,
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
 * GET /api/v1/epics
 */
async function listEpics(req: NextRequest, context: ApiAuthContext) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    const epicsRepo = new EpicsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    // getEpics handles project access verification internally
    const epicsList = await epicsRepo.getEpics(projectId || undefined)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: epicsList,
        meta: {
          page: 1,
          total: epicsList.length,
          hasMore: false,
        },
      },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error listing epics:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list epics',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/epics
 */
async function createEpic(req: NextRequest, context: ApiAuthContext) {
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
    const validationResult = createEpicRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid epic data', {
        issues: validationResult.error.issues,
      })
    }

    const epicData = validationResult.data as CreateEpicRequest

    // Verify project access
    const [project] = await db
      .select({ id: projects.id, organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, epicData.projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project', epicData.projectId)
    }

    if (project.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this project')
    }

    const epicsRepo = new EpicsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const epic = await epicsRepo.createEpic({
      projectId: epicData.projectId,
      title: epicData.title,
      description: epicData.description,
      goals: epicData.goals,
      priority: epicData.priority,
      assignedTo: epicData.assigneeId ?? undefined,
      startDate: epicData.startDate ? new Date(epicData.startDate) : undefined,
      targetDate: epicData.targetDate ? new Date(epicData.targetDate) : undefined,
    })

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: epic },
      {
        status: 201,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error creating epic:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create epic',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(listEpics)
export const POST = withApiAuth(createEpic, { requireWrite: true })

