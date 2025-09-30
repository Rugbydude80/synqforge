import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import { CreateEpicSchema } from '@/lib/types'
import { successResponse, errorResponse, parseRequestBody, getQueryParams } from '@/lib/utils/api-helpers'

/**
 * GET /api/projects/[projectId]/epics
 * List all epics for a project
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]
      const { searchParams } = new URL(req.url)
      
      const filters = {
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
      }

      const repository = new EpicsRepository(user)
      const epics = await repository.getEpics(projectId, filters)

      return successResponse(epics, { total: epics.length })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true }
)

/**
 * POST /api/projects/[projectId]/epics
 * Create a new epic
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]
      const data = await parseRequestBody(req, CreateEpicSchema)

      const repository = new EpicsRepository(user)
      const epic = await repository.createEpic({
        ...data,
        projectId, // Ensure projectId matches the URL parameter
      })

      return successResponse(epic, { status: 201 })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member'] }
)
