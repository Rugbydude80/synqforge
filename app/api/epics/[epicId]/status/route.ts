/**
 * POST /api/epics/[epicId]/status
 * Update epic status with validation
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { epicProgressService, type EpicStatus } from '@/lib/services/epic-progress.service'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'
import { z } from 'zod'

const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'planned', 'in_progress', 'completed', 'archived']),
  force: z.boolean().optional().default(false),
})

/**
 * POST /api/epics/[epicId]/status
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]
      const body = await req.json()

      // Validate input
      const validation = UpdateStatusSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(new Error('Invalid request body'), 400)
      }

      const { status, force } = validation.data

      // Update epic status
      const updatedEpic = await epicProgressService.updateEpicStatus(
        epicId,
        user.organizationId,
        status as EpicStatus,
        force
      )

      return successResponse({
        epic: updatedEpic,
        message: `Epic status updated to '${status}'`,
      })
    } catch (error: any) {
      if (error.message.includes('Invalid status transition')) {
        return errorResponse(error, 400)
      }
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)

/**
 * GET /api/epics/[epicId]/status
 * Get valid next statuses for this epic
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]

      // Get current epic
      const epic = await epicProgressService.getEpicProgress(epicId, user.organizationId)

      // Get valid next statuses
      const validNextStatuses = epicProgressService.getValidNextStatuses(epic.status as EpicStatus)

      return successResponse({
        currentStatus: epic.status,
        validNextStatuses,
      })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)
