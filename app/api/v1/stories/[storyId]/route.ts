/**
 * REST API v1 - Story by ID Endpoints
 * GET /api/v1/stories/[storyId] - Get story
 * PATCH /api/v1/stories/[storyId] - Update story
 * DELETE /api/v1/stories/[storyId] - Delete story
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import { updateStoryRequestSchema, type UpdateStoryRequest } from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/stories/[storyId]
 * Get a specific story by ID
 */
async function getStory(req: NextRequest, context: ApiAuthContext & { params: { storyId: string } }) {
  try {
    const { storyId } = context.params

    const story = await storiesRepository.getById(storyId)

    // Verify organization access
    if (story.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this story')
    }

    // Get rate limit info for headers
    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: story },
      {
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error fetching story:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Story not found',
          statusCode: 404,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch story',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/stories/[storyId]
 * Update a story
 */
async function updateStory(req: NextRequest, context: ApiAuthContext & { params: { storyId: string } }) {
  try {
    // Check write scope
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

    const { storyId } = context.params
    const body = await req.json()

    // Validate input
    const validationResult = updateStoryRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid story data', {
        issues: validationResult.error.issues,
      })
    }

    const updateData = validationResult.data as UpdateStoryRequest

    // Get story to verify access
    const story = await storiesRepository.getById(storyId)
    if (story.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this story')
    }

    // Update story
    const userId = context.user?.id || context.apiKey.apiKeyId
    const updatedStory = await storiesRepository.update(storyId, updateData, userId)

    // Get rate limit info for headers
    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: updatedStory },
      {
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error updating story:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update story',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/stories/[storyId]
 * Delete a story
 */
async function deleteStory(req: NextRequest, context: ApiAuthContext & { params: { storyId: string } }) {
  try {
    // Check write scope
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

    const { storyId } = context.params

    // Get story to verify access
    const story = await storiesRepository.getById(storyId)
    if (story.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this story')
    }

    // Delete story
    const userId = context.user?.id || context.apiKey.apiKeyId
    await storiesRepository.delete(storyId, userId)

    // Get rate limit info for headers
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
    console.error('Error deleting story:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to delete story',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(getStory)
export const PATCH = withApiAuth(updateStory, { requireWrite: true })
export const DELETE = withApiAuth(deleteStory, { requireWrite: true })

