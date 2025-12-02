/**
 * REST API v1 - Stories Endpoints
 * GET /api/v1/stories - List stories
 * POST /api/v1/stories - Create story
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import {
  createStoryRequestSchema,
  listStoriesQuerySchema,
  type CreateStoryRequest,
  type ListStoriesQuery,
} from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/stories
 * List stories with filtering and pagination
 */
async function listStories(req: NextRequest, context: ApiAuthContext) {
  try {
    const { searchParams } = new URL(req.url)

    // Parse query parameters
    const queryParams: Record<string, any> = {}
    for (const [key, value] of searchParams.entries()) {
      if (key === 'limit' || key === 'offset') {
        queryParams[key] = parseInt(value, 10)
      } else if (key === 'status' || key === 'priority') {
        // Handle comma-separated values or single value
        if (value.includes(',')) {
          queryParams[key] = value.split(',').map((v) => v.trim())
        } else {
          queryParams[key] = value
        }
      } else if (key === 'tags') {
        queryParams[key] = value.split(',').map((v) => v.trim())
      } else {
        queryParams[key] = value
      }
    }

    // Validate query parameters
    const validationResult = listStoriesQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', {
        issues: validationResult.error.issues,
      })
    }

    const filters = validationResult.data as ListStoriesQuery

    // Verify project access if projectId is provided
    if (filters.projectId) {
      const [project] = await db
        .select({ id: projects.id, organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, filters.projectId))
        .limit(1)

      if (!project) {
        throw new NotFoundError('Project', filters.projectId)
      }

      if (project.organizationId !== context.organization.id) {
        throw new AuthorizationError('Access denied to this project')
      }
    }

    // Build filter object with organization security
    const storyFilters: any = {
      organizationId: context.organization.id,
    }

    if (filters.projectId) storyFilters.projectId = filters.projectId
    if (filters.epicId !== undefined) storyFilters.epicId = filters.epicId
    if (filters.assigneeId !== undefined) storyFilters.assigneeId = filters.assigneeId
    if (filters.status) storyFilters.status = filters.status
    if (filters.priority) storyFilters.priority = filters.priority
    if (filters.tags) storyFilters.tags = filters.tags

    // Get stories
    // Map orderBy field to repository-supported values
    let orderBy: 'createdAt' | 'updatedAt' | 'priority' | 'storyPoints' = 'createdAt'
    if (filters.orderBy && ['createdAt', 'updatedAt', 'priority', 'storyPoints'].includes(filters.orderBy)) {
      orderBy = filters.orderBy as any
    }
    
    const result = await storiesRepository.list(storyFilters, {
      limit: filters.limit,
      offset: filters.offset,
      orderBy,
      orderDirection: filters.orderDirection,
    })

    // Get rate limit info for headers
    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: result.stories,
        meta: {
          page: Math.floor(filters.offset / filters.limit) + 1,
          total: result.total,
          hasMore: result.total > filters.offset + filters.limit,
        },
      },
      {
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error listing stories:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list stories',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/stories
 * Create a new story
 */
async function createStory(req: NextRequest, context: ApiAuthContext) {
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

    const body = await req.json()

    // Validate input
    const validationResult = createStoryRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid story data', {
        issues: validationResult.error.issues,
      })
    }

    const storyData = validationResult.data as CreateStoryRequest

    // Verify project exists and belongs to organization
    const [project] = await db
      .select({ id: projects.id, organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, storyData.projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project', storyData.projectId)
    }

    if (project.organizationId !== context.organization.id) {
      throw new AuthorizationError('Access denied to this project')
    }

    // Create the story
    const userId = context.user?.id || context.apiKey.apiKeyId
    const story = await storiesRepository.create(
      {
        projectId: storyData.projectId,
        epicId: storyData.epicId || undefined,
        title: storyData.title,
        description: storyData.description,
        acceptanceCriteria: storyData.acceptanceCriteria,
        storyPoints: storyData.storyPoints,
        priority: storyData.priority,
        storyType: storyData.storyType,
        assigneeId: storyData.assigneeId || undefined,
        status: storyData.status,
        tags: storyData.tags,
      },
      userId
    )

    // Get rate limit info for headers
    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: story },
      {
        status: 201,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error creating story:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create story',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(listStories)
export const POST = withApiAuth(createStory, { requireWrite: true })

