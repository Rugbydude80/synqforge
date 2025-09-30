import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/sprints/[sprintId]/stories
 * Get all stories in a sprint (for Kanban board)
 * Supports filtering by status for Kanban columns
 */
export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = req.nextUrl
      const sprintId = req.nextUrl.pathname.split('/')[3]

      // Parse filters for Kanban columns
      const filters = {
        status: searchParams.get('status') || undefined,
      }

      // Get sprint stories
      const repository = new SprintsRepository(context.user)
      const stories = await repository.getSprintStories(sprintId, filters)

      // Group by status for Kanban board if no filter
      const grouped = filters.status ? null : groupStoriesByStatus(stories)

      const response: APIResponse = {
        success: true,
        data: filters.status ? stories : grouped,
        meta: {
          total: stories.length,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprint stories API error:', error)

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

/**
 * Group stories by status for Kanban board display
 */
function groupStoriesByStatus(stories: any[]) {
  const statuses = ['backlog', 'ready', 'in_progress', 'review', 'done']
  
  const grouped = statuses.reduce((acc, status) => {
    acc[status] = stories.filter(s => s.status === status)
    return acc
  }, {} as Record<string, any[]>)

  return {
    columns: statuses.map(status => ({
      id: status,
      title: formatStatusTitle(status),
      stories: grouped[status] || [],
      count: (grouped[status] || []).length
    })),
    totalStories: stories.length
  }
}

/**
 * Format status for display
 */
function formatStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    backlog: 'Backlog',
    ready: 'Ready',
    in_progress: 'In Progress',
    review: 'In Review',
    done: 'Done'
  }
  return titles[status] || status
}
