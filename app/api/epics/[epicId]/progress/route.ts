import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/epics/[epicId]/progress
 * Get epic progress and statistics
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]

      const repository = new EpicsRepository(user)
      const progress = await repository.getEpicProgress(epicId)

      return successResponse(progress)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)
