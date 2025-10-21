import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { epicProgressService } from '@/lib/services/epic-progress.service'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/epics/[epicId]/progress
 * Get epic progress and statistics with enhanced aggregate data
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]

      // Use enhanced progress service for detailed summary
      const summary = await epicProgressService.getEpicProgressSummary(epicId, user.organizationId)

      return successResponse(summary)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)
