import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/projects/[projectId]/velocity
 * Get project velocity (average from past sprints)
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const projectId = req.nextUrl.pathname.split('/')[3]

      // Optional: number of sprints to analyze (default 3)
      const lastNSprints = parseInt(searchParams.get('sprints') || '3')

      const repository = new SprintsRepository(context.user)
      const velocity = await repository.getProjectVelocity(projectId, lastNSprints)

      const response: APIResponse = {
        success: true,
        data: velocity,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Project velocity API error:', error)

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
