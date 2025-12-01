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
      const { sprintId } = context.params

      // Get sprint stories
      const repository = new SprintsRepository(context.user)
      const stories = await repository.getSprintStories(sprintId)

      // Group by status for Kanban board
      const grouped = groupStoriesByStatus(stories)

      const response: APIResponse = {
        success: true,
        data: grouped,
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
