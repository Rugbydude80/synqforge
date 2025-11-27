/**
 * REST API v1 - Projects Endpoints
 * GET /api/v1/projects - List projects
 * POST /api/v1/projects - Create project
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import {
  createProjectRequestSchema,
  listProjectsQuerySchema,
  type CreateProjectRequest,
  type ListProjectsQuery,
} from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/projects
 * List projects for the organization
 */
async function listProjects(req: NextRequest, context: ApiAuthContext) {
  try {
    const projectsRepo = new ProjectsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const projectsList = await projectsRepo.getProjects()

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      {
        data: projectsList,
        meta: {
          page: 1,
          total: projectsList.length,
          hasMore: false,
        },
      },
      {
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error listing projects:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list projects',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/projects
 * Create a new project
 */
async function createProject(req: NextRequest, context: ApiAuthContext) {
  try {
    if (!context.apiKey.scopes.includes('write')) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'This endpoint requires write scope',
          statusCode: 403,
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validationResult = createProjectRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid project data', {
        issues: validationResult.error.issues,
      })
    }

    const projectData = validationResult.data as CreateProjectRequest

    const projectsRepo = new ProjectsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const project = await projectsRepo.createProject({
      name: projectData.name,
      description: projectData.description,
      slug: projectData.slug,
      ownerId: context.user?.id || context.apiKey.apiKeyId,
    })

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: project },
      {
        status: 201,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error creating project:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create project',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(listProjects)
export const POST = withApiAuth(createProject, { requireWrite: true })

