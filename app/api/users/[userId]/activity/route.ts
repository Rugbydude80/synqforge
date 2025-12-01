import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/users/[userId]/activity
 * Get user activity history
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const { userId } = context.params

      // Parse pagination
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const repository = new UsersRepository(context.user)
      const activities = await repository.getUserActivity(userId, { limit, offset })

      const response: APIResponse = {
        success: true,
        data: activities,
        meta: {
          limit,
          page: Math.floor(offset / limit) + 1,
          total: activities.length,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('User activity API error:', error)

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
