import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { UpdateProjectSchema } from '@/lib/types'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/organizations/[orgId]/projects/[projectId]
 * Get a single project by ID
 */
export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { projectId } = params
      const repository = new ProjectsRepository(user)
      const project = await repository.getProjectById(projectId)

      return successResponse(project)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, requireProject: true }
)

/**
 * PATCH /api/organizations/[orgId]/projects/[projectId]
 * Update an existing project
 */
export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { projectId } = params
      const body = await req.json()
      const data = UpdateProjectSchema.parse(body)

      const repository = new ProjectsRepository(user)
      const project = await repository.updateProject(projectId, data)

      return successResponse(project)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, requireProject: true, allowedRoles: ['admin', 'member'] }
)

/**
 * DELETE /api/organizations/[orgId]/projects/[projectId]
 * Delete a project (soft delete)
 */
export const DELETE = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { projectId } = params
      const repository = new ProjectsRepository(user)
      await repository.deleteProject(projectId)

      return successResponse({ message: 'Project deleted successfully' })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, requireProject: true, requireAdmin: true }
)
