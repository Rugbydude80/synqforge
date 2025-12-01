import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { UpdateUserSchema, APIResponse } from '@/lib/types'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
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
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
})

/**
 * PATCH /api/users/me
 * Update current user profile
 */
export const PATCH = withAuth(
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
      console.error('Current user update API error:', error)
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
  { allowedRoles: ['admin', 'member', 'viewer'] }
)
