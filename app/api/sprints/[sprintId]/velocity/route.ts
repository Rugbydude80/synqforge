/**
 * Sprint Velocity API Routes
 * GET /api/sprints/[sprintId]/velocity
 *
 * Get comprehensive velocity data for a sprint including rolling averages and forecasts
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { velocityService } from '@/lib/services/velocity.service'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/sprints/[sprintId]/velocity
 * Get comprehensive sprint velocity summary
 */
export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { sprintId } = params

      // Get comprehensive velocity summary
      const summary = await velocityService.getSprintVelocitySummary(sprintId, user.organizationId)

      return successResponse(summary)
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return errorResponse(new Error('Sprint not found'), 404)
      }
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)
