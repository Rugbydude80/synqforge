/**
 * REST API v1 - Remove Story from Sprint
 * DELETE /api/v1/sprints/[sprintId]/stories/[storyId] - Remove story from sprint
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * DELETE /api/v1/sprints/[sprintId]/stories/[storyId]
 * Remove a story from a sprint
 */
async function removeStoryFromSprint(
  req: NextRequest,
  context: ApiAuthContext & { params: { sprintId: string; storyId: string } }
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

    const { sprintId, storyId } = context.params
    const userId = context.user?.id || context.apiKey.apiKeyId

    await storiesRepository.removeFromSprint(storyId, sprintId, userId)

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
    console.error('Error removing story from sprint:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to remove story from sprint',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const DELETE = withApiAuth(removeStoryFromSprint, { requireWrite: true })

