import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { UpdateSprintSchema, APIResponse } from '@/lib/types'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

/**
 * GET /api/sprints/[sprintId]
 * Get a single sprint by ID
 */
export const GET = withAuth(async (req: NextRequest, context) => {
  try {
    const { sprintId } = context.params

    const repository = new SprintsRepository(context.user)
    const sprint = await repository.getSprintById(sprintId)

    const response: APIResponse = {
      success: true,
      data: sprint,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Sprint detail API error:', error)
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
})

/**
 * PATCH /api/sprints/[sprintId]
 * Update a sprint (partial update)
 */
export const PATCH = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { sprintId } = context.params
      const body = await req.json()

      // Validate request body
      const validatedData = UpdateSprintSchema.parse(body)

      // Update sprint
      const repository = new SprintsRepository(context.user)
      const sprint = await repository.updateSprint(sprintId, validatedData)

      const response: APIResponse = {
        success: true,
        data: sprint,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprint update API error:', error)
      if (isApplicationError(error)) {
        const response = formatErrorResponse(error)
        const { statusCode, ...errorBody } = response
        return NextResponse.json(errorBody, { status: statusCode })
      }
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
  },
  { allowedRoles: ['admin', 'member'] }
)

/**
 * DELETE /api/sprints/[sprintId]
 * Delete a sprint (only planning sprints)
 */
export const DELETE = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { sprintId } = context.params

      const repository = new SprintsRepository(context.user)
      const result = await repository.deleteSprint(sprintId)

      const response: APIResponse = {
        success: true,
        data: result,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprint delete API error:', error)
      if (isApplicationError(error)) {
        const response = formatErrorResponse(error)
        const { statusCode, ...errorBody } = response
        return NextResponse.json(errorBody, { status: statusCode })
      }
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
  },
  { allowedRoles: ['admin', 'member'] }
)
