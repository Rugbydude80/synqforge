/**
 * REST API v1 - Epic by ID Endpoints
 * GET /api/v1/epics/[epicId] - Get epic
 * PATCH /api/v1/epics/[epicId] - Update epic
 * DELETE /api/v1/epics/[epicId] - Delete epic
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { updateEpicRequestSchema, type UpdateEpicRequest } from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  AuthorizationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/epics/[epicId]
 */
async function getEpic(req: NextRequest, context: ApiAuthContext & { params: { epicId: string } }) {
  try {
    const { epicId } = context.params

    const epicsRepo = new EpicsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const epic = await epicsRepo.getEpicById(epicId)

    if (epic.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this epic')
    }

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: epic },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error fetching epic:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch epic',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/epics/[epicId]
 */
async function updateEpic(req: NextRequest, context: ApiAuthContext & { params: { epicId: string } }) {
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

    const { epicId } = context.params
    const body = await req.json()

    const validationResult = updateEpicRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid epic data', {
        issues: validationResult.error.issues,
      })
    }

    const updateData = validationResult.data as UpdateEpicRequest

    const epicsRepo = new EpicsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const epic = await epicsRepo.updateEpic(epicId, {
      title: updateData.title,
      description: updateData.description,
      goals: updateData.goals,
      status: updateData.status,
      priority: updateData.priority,
      assignedTo: updateData.assigneeId,
      startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
      targetDate: updateData.targetDate ? new Date(updateData.targetDate) : undefined,
    })

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: epic },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error updating epic:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update epic',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/epics/[epicId]
 */
async function deleteEpic(req: NextRequest, context: ApiAuthContext & { params: { epicId: string } }) {
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

    const { epicId } = context.params

    const epicsRepo = new EpicsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    await epicsRepo.deleteEpic(epicId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: { success: true } },
      {
        status: 200,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error deleting epic:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to delete epic',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(getEpic)
export const PATCH = withApiAuth(updateEpic, { requireWrite: true })
export const DELETE = withApiAuth(deleteEpic, { requireWrite: true })

