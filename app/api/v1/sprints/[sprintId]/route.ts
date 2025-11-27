/**
 * REST API v1 - Sprint by ID Endpoints
 * GET /api/v1/sprints/[sprintId] - Get sprint
 * PATCH /api/v1/sprints/[sprintId] - Update sprint
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { updateSprintRequestSchema, type UpdateSprintRequest } from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  AuthorizationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/sprints/[sprintId]
 */
async function getSprint(req: NextRequest, context: ApiAuthContext & { params: { sprintId: string } }) {
  try {
    const { sprintId } = context.params

    const sprintsRepo = new SprintsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const sprint = await sprintsRepo.getSprintById(sprintId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: sprint },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error fetching sprint:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch sprint',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/sprints/[sprintId]
 */
async function updateSprint(req: NextRequest, context: ApiAuthContext & { params: { sprintId: string } }) {
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

    const { sprintId } = context.params
    const body = await req.json()

    const validationResult = updateSprintRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid sprint data', {
        issues: validationResult.error.issues,
      })
    }

    const updateData = validationResult.data as UpdateSprintRequest

    const sprintsRepo = new SprintsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const sprint = await sprintsRepo.updateSprint(sprintId, {
      name: updateData.name,
      description: updateData.description,
      status: updateData.status,
      goal: updateData.goal,
      startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
    })

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: sprint },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error updating sprint:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update sprint',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(getSprint)
export const PATCH = withApiAuth(updateSprint, { requireWrite: true })

