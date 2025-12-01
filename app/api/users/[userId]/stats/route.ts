import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/users/[userId]/stats
 * Get user statistics and performance metrics
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { userId } = context.params

      const repository = new UsersRepository(context.user)
      const stats = await repository.getUserStats(userId)

      const response: APIResponse = {
        success: true,
        data: stats,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('User stats API error:', error)

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
  },
  { allowedRoles: ['admin', 'member', 'viewer'] }
)
