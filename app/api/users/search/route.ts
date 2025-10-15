import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/users/search
 * Search users by name or email
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const query = searchParams.get('q') || searchParams.get('query') || ''

      const repository = new UsersRepository(context.user)

      // Search users (empty query returns all users in organization)
      const users = await repository.searchUsers(query)

      const response: APIResponse = {
        success: true,
        data: users,
        meta: {
          total: users.length,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('User search API error:', error)

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
