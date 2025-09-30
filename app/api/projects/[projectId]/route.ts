import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { UpdateProjectSchema } from '@/lib/types'
import { successResponse, errorResponse, parseRequestBody } from '@/lib/utils/api-helpers'

/**
 * GET /api/projects/[projectId]
 * Get project details
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]

      const repository = new ProjectsRepository(user)
      const project = await repository.getProjectById(projectId)

      return successResponse(project)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true }
)

/**
 * PUT /api/projects/[projectId]
 * Update project (full update)
 */
export const PUT = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]
      const updates = await parseRequestBody(req, UpdateProjectSchema)

      const repository = new ProjectsRepository(user)
      const project = await repository.updateProject(projectId, updates)

      return successResponse(project)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member'] }
)

/**
 * PATCH /api/projects/[projectId]
 * Update project (partial update)
 */
export const PATCH = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]
      const updates = await parseRequestBody(req, UpdateProjectSchema)

      const repository = new ProjectsRepository(user)
      const project = await repository.updateProject(projectId, updates)

      return successResponse(project)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member'] }
)

/**
 * DELETE /api/projects/[projectId]
 * Delete project (only if empty)
 */
export const DELETE = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]

      const repository = new ProjectsRepository(user)
      const result = await repository.deleteProject(projectId)

      return successResponse(result)
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true, requireAdmin: true }
)
