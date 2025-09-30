import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * POST /api/projects/[projectId]/archive
 * Archive a project
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]

      const repository = new ProjectsRepository(user)
      const project = await repository.archiveProject(projectId)

      return successResponse(project)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member'] }
)
