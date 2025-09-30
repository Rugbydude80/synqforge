import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/projects/[projectId]/sprints/active
 * Get the currently active sprint for a project
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]

      const repository = new SprintsRepository(context.user)
      const sprint = await repository.getActiveSprint(projectId)

      if (!sprint) {
        return NextResponse.json(
          {
            success: true,
            data: null,
            message: 'No active sprint found',
          } as APIResponse,
          { status: 200 }
        )
      }

      const response: APIResponse = {
        success: true,
        data: sprint,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Active sprint API error:', error)

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
  { requireProject: true, allowedRoles: ['admin', 'member', 'viewer'] }
)
