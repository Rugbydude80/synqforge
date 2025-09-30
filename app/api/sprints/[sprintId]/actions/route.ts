import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse, ValidationError } from '@/lib/types'
import { z } from 'zod'

const ActionSchema = z.object({
  action: z.enum(['start', 'complete', 'cancel']),
})

/**
 * POST /api/sprints/[sprintId]/actions
 * Perform actions on a sprint (start, complete, cancel)
 */
export const POST = withAuth(
  async (req: NextRequest, context) => {
    try {
      const sprintId = req.nextUrl.pathname.split('/')[3]
      const body = await req.json()

      // Validate action
      const { action } = ActionSchema.parse(body)

      const repository = new SprintsRepository(context.user)
      let sprint

      switch (action) {
        case 'start':
          sprint = await repository.startSprint(sprintId)
          break
        case 'complete':
          sprint = await repository.completeSprint(sprintId)
          break
        case 'cancel':
          sprint = await repository.cancelSprint(sprintId)
          break
      }

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
 * Error handler
 */
function handleError(error: unknown) {
  console.error('Sprint actions API error:', error)

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
