import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { UpdateSprintSchema, APIResponse, ValidationError } from '@/lib/types'
import { z } from 'zod'

/**
 * GET /api/sprints/[sprintId]
 * Get a single sprint by ID
 */
export const GET = withAuth(async (req: NextRequest, context) => {
  try {
    const sprintId = req.nextUrl.pathname.split('/')[3]

    const repository = new SprintsRepository(context.user)
    const sprint = await repository.getSprintById(sprintId)

    const response: APIResponse = {
      success: true,
      data: sprint,
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PUT /api/sprints/[sprintId]
 * Update a sprint
 */
export const PUT = withAuth(
  async (req: NextRequest, context) => {
    try {
      const sprintId = req.nextUrl.pathname.split('/')[3]
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
      return handleError(error)
    }
  },
  { allowedRoles: ['admin', 'member'] }
)

/**
 * PATCH /api/sprints/[sprintId]
 * Partial update of a sprint (alias for PUT)
 */
export const PATCH = PUT

/**
 * DELETE /api/sprints/[sprintId]
 * Delete a sprint (only planning sprints)
 */
export const DELETE = withAuth(
  async (req: NextRequest, context) => {
    try {
      const sprintId = req.nextUrl.pathname.split('/')[3]

      const repository = new SprintsRepository(context.user)
      const result = await repository.deleteSprint(sprintId)

      const response: APIResponse = {
        success: true,
        data: result,
      }

      return NextResponse.json(response)
    } catch (error) {
      return handleError(error)
    }
  },
  { allowedRoles: ['admin', 'member'] }
)

/**
 * Error handler
 */
function handleError(error: unknown) {
  console.error('Sprint detail API error:', error)

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      } as APIResponse,
      { status: 400 }
    )
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      } as APIResponse,
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      } as APIResponse,
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    } as APIResponse,
    { status: 500 }
  )
}
