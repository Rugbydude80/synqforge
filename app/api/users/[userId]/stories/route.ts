import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { UsersRepository } from '@/lib/repositories/users'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/users/[userId]/stories
 * Get stories assigned to a user
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const userId = req.nextUrl.pathname.split('/')[3]

      // Parse filters
      const filters = {
        status: searchParams.get('status') || undefined,
        projectId: searchParams.get('projectId') || undefined,
      }

      // Parse pagination
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')

      const repository = new UsersRepository(context.user)
      const stories = await repository.getUserStories(userId, filters, { limit, offset })

      const response: APIResponse = {
        success: true,
        data: stories,
        meta: {
          limit,
          page: Math.floor(offset / limit) + 1,
          total: stories.length,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('User stories API error:', error)

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
