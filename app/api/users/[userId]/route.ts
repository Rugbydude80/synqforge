import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/users/[userId]
 * Get user profile by ID
 */
export const GET = withAuth(async (req: NextRequest, context) => {
  try {
    const userId = req.nextUrl.pathname.split('/')[3]

    const repository = new UsersRepository(context.user)
    const user = await repository.getUserById(userId)

    const response: APIResponse = {
      success: true,
      data: user,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('User detail API error:', error)

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
