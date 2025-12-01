import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import {
  CreateSprintSchema,
  APIResponse,
} from '@/lib/types'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

/**
 * GET /api/projects/[projectId]/sprints
 * Get all sprints for a project
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { projectId } = context.params

      // Get sprints
      const repository = new SprintsRepository(context.user)
      const sprints = await repository.getSprints(projectId)

      const response: APIResponse = {
        success: true,
        data: sprints,
        meta: {
          total: sprints.length,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprints list API error:', error)
      if (isApplicationError(error)) {
        const response = formatErrorResponse(error)
        const { statusCode, ...errorBody } = response
        return NextResponse.json(errorBody, { status: statusCode })
      }
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const response = formatErrorResponse(error)
        const { statusCode, ...errorBody } = response
        return NextResponse.json(errorBody, { status: statusCode })
      }
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
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
      const { projectId } = context.params
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
      console.error('Sprint create API error:', error)
      if (isApplicationError(error)) {
        const response = formatErrorResponse(error)
        const { statusCode, ...errorBody } = response
        return NextResponse.json(errorBody, { status: statusCode })
      }
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const response = formatErrorResponse(error)
        const { statusCode, ...errorBody } = response
        return NextResponse.json(errorBody, { status: statusCode })
      }
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
  },
  { requireProject: true, allowedRoles: ['admin', 'member'] }
)
