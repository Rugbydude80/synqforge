import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { UpdateEpicSchema } from '@/lib/types'
import { errorResponse } from '@/lib/utils/api-helpers'

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

      return NextResponse.json(epic)
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
      const body = await req.json()
      const updates = UpdateEpicSchema.parse(body)

      const repository = new EpicsRepository(user)
      const epic = await repository.updateEpic(epicId, updates)

      return NextResponse.json(epic)
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
      const body = await req.json()
      const updates = UpdateEpicSchema.parse(body)

      const repository = new EpicsRepository(user)
      const epic = await repository.updateEpic(epicId, updates)

      return NextResponse.json(epic)
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
      await repository.deleteEpic(epicId)

      return NextResponse.json({ success: true })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)
