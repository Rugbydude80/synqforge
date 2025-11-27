/**
 * REST API v1 - Sprint Stories Endpoints
 * POST /api/v1/sprints/[sprintId]/stories - Add story to sprint
 * DELETE /api/v1/sprints/[sprintId]/stories/[storyId] - Remove story from sprint
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import { addStoryToSprintRequestSchema, type AddStoryToSprintRequest } from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * POST /api/v1/sprints/[sprintId]/stories
 * Add a story to a sprint
 */
async function addStoryToSprint(
  req: NextRequest,
  context: ApiAuthContext & { params: { sprintId: string } }
) {
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

    const validationResult = addStoryToSprintRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid request data', {
        issues: validationResult.error.issues,
      })
    }

    const { storyId } = validationResult.data as AddStoryToSprintRequest
    const userId = context.user?.id || context.apiKey.apiKeyId

    await storiesRepository.assignToSprint(storyId, sprintId, userId)

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
    console.error('Error adding story to sprint:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to add story to sprint',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const POST = withApiAuth(addStoryToSprint, { requireWrite: true })

