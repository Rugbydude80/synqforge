import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { CreateProjectSchema } from '@/lib/types'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/organizations/[orgId]/projects
 * List all projects for the organization
 */
export const GET = withAuth(
  async (_request: NextRequest, { user }) => {
    try {
      const repository = new ProjectsRepository(user)
      const projects = await repository.getProjects()

      return successResponse(projects, { total: projects.length })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)

/**
 * POST /api/organizations/[orgId]/projects
 * Create a new project
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json()
      const data = CreateProjectSchema.parse(body)

      const repository = new ProjectsRepository(user)
      const project = await repository.createProject(data)

      return successResponse(project, { status: 201 })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)
