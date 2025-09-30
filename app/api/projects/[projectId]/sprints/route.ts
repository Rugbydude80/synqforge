import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import {
  CreateSprintSchema,
  ValidationError,
  APIResponse,
} from '@/lib/types'
import { z } from 'zod'

/**
 * GET /api/projects/[projectId]/sprints
 * Get all sprints for a project
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const projectId = req.nextUrl.pathname.split('/')[3]

      // Parse filters
      const filters = {
        status: searchParams.get('status') || undefined,
      }

      // Get sprints
      const repository = new SprintsRepository(context.user)
      const sprints = await repository.getSprints(projectId, filters)

      const response: APIResponse = {
        success: true,
        data: sprints,
        meta: {
          total: sprints.length,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      return handleError(error)
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member', 'viewer'] }
)

/**
 * POST /api/projects/[projectId]/sprints
 * Create a new sprint
 */
export const POST = withAuth(
  async (req: NextRequest, context) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]
      const body = await req.json()

      // Add projectId to body
      const dataWithProject = { ...body, projectId }

      // Validate request body
      const validatedData = CreateSprintSchema.parse(dataWithProject)

      // Create sprint
      const repository = new SprintsRepository(context.user)
      const sprint = await repository.createSprint(validatedData)

      const response: APIResponse = {
        success: true,
        data: sprint,
      }

      return NextResponse.json(response, { status: 201 })
    } catch (error) {
      return handleError(error)
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member'] }
)

/**
 * Error handler
 */
function handleError(error: unknown) {
  console.error('Sprints API error:', error)

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      } as APIResponse,
      { status: 400 }
    )
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      } as APIResponse,
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      } as APIResponse,
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    } as APIResponse,
    { status: 500 }
  )
}
