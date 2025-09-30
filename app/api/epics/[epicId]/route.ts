import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { UpdateEpicSchema } from '@/lib/types'
import { successResponse, errorResponse, parseRequestBody } from '@/lib/utils/api-helpers'

/**
 * GET /api/epics/[epicId]
 * Get epic details
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]

      const repository = new EpicsRepository(user)
      const epic = await repository.getEpicById(epicId)

      return successResponse(epic)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)

/**
 * PUT /api/epics/[epicId]
 * Update epic (full update)
 */
export const PUT = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]
      const updates = await parseRequestBody(req, UpdateEpicSchema)

      const repository = new EpicsRepository(user)
      const epic = await repository.updateEpic(epicId, updates)

      return successResponse(epic)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)

/**
 * PATCH /api/epics/[epicId]
 * Update epic (partial update)
 */
export const PATCH = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]
      const updates = await parseRequestBody(req, UpdateEpicSchema)

      const repository = new EpicsRepository(user)
      const epic = await repository.updateEpic(epicId, updates)

      return successResponse(epic)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)

/**
 * DELETE /api/epics/[epicId]
 * Delete epic (only if empty)
 */
export const DELETE = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const epicId = req.nextUrl.pathname.split('/')[3]

      const repository = new EpicsRepository(user)
      const result = await repository.deleteEpic(epicId)

      return successResponse(result)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)
