import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { UpdateUserSchema, APIResponse, ValidationError } from '@/lib/types'
import { z } from 'zod'

/**
 * GET /api/users/me
 * Get current user profile
 */
export const GET = withAuth(async (_request: NextRequest, context) => {
  try {
    const repository = new UsersRepository(context.user)
    const user = await repository.getCurrentUser()

    const response: APIResponse = {
      success: true,
      data: user,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Current user API error:', error)

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
})

/**
 * PUT /api/users/me
 * Update current user profile
 */
export const PUT = withAuth(
  async (req: NextRequest, context) => {
    try {
      const body = await req.json()

      // Validate request body
      const validatedData = UpdateUserSchema.parse(body)

      const repository = new UsersRepository(context.user)
      const user = await repository.updateCurrentUser(validatedData)

      const response: APIResponse = {
        success: true,
        data: user,
      }

      return NextResponse.json(response)
    } catch (error) {
      return handleError(error)
    }
  },
  { allowedRoles: ['admin', 'member', 'viewer'] }
)

/**
 * Error handler
 */
function handleError(error: unknown) {
  console.error('Current user update API error:', error)

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
