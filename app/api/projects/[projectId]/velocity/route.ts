import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { velocityService } from '@/lib/services/velocity.service'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/projects/[projectId]/velocity
 * Get project velocity history and forecasts
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const projectId = req.nextUrl.pathname.split('/')[3]

      // Optional query parameters
      const lastNSprints = parseInt(searchParams.get('sprints') || '3')
      const forecastSprints = parseInt(searchParams.get('forecast') || '3')
      const mode = searchParams.get('mode') || 'summary' // 'summary' or 'history'

      if (mode === 'history') {
        // Get comprehensive velocity history
        const history = await velocityService.getProjectVelocityHistory(projectId, context.user.organizationId)

        const response: APIResponse = {
          success: true,
          data: history,
        }

        return NextResponse.json(response)
      } else {
        // Get rolling average and forecast
        const rollingAvg = await velocityService.getRollingVelocity(projectId, context.user.organizationId, lastNSprints)
        const forecast = await velocityService.forecastVelocity(
          projectId,
          context.user.organizationId,
          forecastSprints,
          lastNSprints as 3 | 5
        )

        const response: APIResponse = {
          success: true,
          data: {
            rollingAverage: rollingAvg,
            basis: `last_${lastNSprints}_sprints`,
            forecast,
          },
        }

        return NextResponse.json(response)
      }
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
