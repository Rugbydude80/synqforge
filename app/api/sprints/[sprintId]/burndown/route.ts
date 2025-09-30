import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/sprints/[sprintId]/burndown
 * Get burndown chart data for a sprint
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const sprintId = req.nextUrl.pathname.split('/')[3]

      const repository = new SprintsRepository(context.user)
      const burndown = await repository.getBurndownData(sprintId)

      const response: APIResponse = {
        success: true,
        data: burndown,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprint burndown API error:', error)

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
  },
  { allowedRoles: ['admin', 'member', 'viewer'] }
)
