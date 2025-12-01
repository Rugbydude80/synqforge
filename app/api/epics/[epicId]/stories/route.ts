import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/epics/[epicId]/stories
 * Get stories for an epic
 */
export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { epicId } = params

      const repository = new EpicsRepository(user)
      const stories = await repository.getEpicStories(epicId)

      return successResponse(stories, { total: stories.length })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)
