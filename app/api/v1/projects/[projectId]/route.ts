/**
 * REST API v1 - Project by ID Endpoints
 * GET /api/v1/projects/[projectId] - Get project
 * PATCH /api/v1/projects/[projectId] - Update project
 * DELETE /api/v1/projects/[projectId] - Delete project
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiAuthContext } from '@/lib/middleware/api-auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { updateProjectRequestSchema, type UpdateProjectRequest } from '@/lib/validations/api'
import { checkApiKeyRateLimit } from '@/lib/middleware/api-rate-limit'
import {
  ValidationError,
  formatErrorResponse,
  isApplicationError,
} from '@/lib/errors/custom-errors'

/**
 * GET /api/v1/projects/[projectId]
 */
async function getProject(req: NextRequest, context: ApiAuthContext & { params: { projectId: string } }) {
  try {
    const { projectId } = context.params

    const projectsRepo = new ProjectsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const project = await projectsRepo.getProjectById(projectId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: project },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error fetching project:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch project',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/projects/[projectId]
 */
async function updateProject(req: NextRequest, context: ApiAuthContext & { params: { projectId: string } }) {
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

    const { projectId } = context.params
    const body = await req.json()

    const validationResult = updateProjectRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError('Invalid project data', {
        issues: validationResult.error.issues,
      })
    }

    const updateData = validationResult.data as UpdateProjectRequest

    const projectsRepo = new ProjectsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    const project = await projectsRepo.updateProject(projectId, updateData)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: project },
      { headers: rateLimitResult.headers }
    )
  } catch (error) {
    console.error('Error updating project:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update project',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/projects/[projectId]
 */
async function deleteProject(req: NextRequest, context: ApiAuthContext & { params: { projectId: string } }) {
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

    const { projectId } = context.params

    const projectsRepo = new ProjectsRepository({
      id: context.user?.id || context.apiKey.apiKeyId,
      email: context.user?.email || 'api@synqforge.com',
      name: context.user?.name || 'API User',
      organizationId: context.organization.id,
      role: context.user?.role || 'member',
      isActive: true,
    })

    await projectsRepo.deleteProject(projectId)

    const rateLimitResult = await checkApiKeyRateLimit(
      context.apiKey,
      context.organization.subscriptionTier
    )

    return NextResponse.json(
      { data: { success: true } },
      {
        status: 200,
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error deleting project:', error)

    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to delete project',
        statusCode: 500,
      },
      { status: 500 }
    )
  }
}

export const GET = withApiAuth(getProject)
export const PATCH = withApiAuth(updateProject, { requireWrite: true })
export const DELETE = withApiAuth(deleteProject, { requireWrite: true })

