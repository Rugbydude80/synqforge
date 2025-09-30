import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'

/**
 * GET /api/projects/[projectId]/stats
 * Get project statistics
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const projectId = req.nextUrl.pathname.split('/')[3]

      const repository = new ProjectsRepository(user)
      const stats = await repository.getProjectStats(projectId)

      // Calculate additional metrics
      const completionPercentage = stats.totalStories > 0
        ? Math.round((stats.completedStories / stats.totalStories) * 100)
        : 0

      const pointsCompletionPercentage = stats.totalStoryPoints > 0
        ? Math.round((Number(stats.completedStoryPoints) / Number(stats.totalStoryPoints)) * 100)
        : 0

      const averagePointsPerStory = stats.totalStories > 0
        ? Math.round((Number(stats.totalStoryPoints) / stats.totalStories) * 10) / 10
        : 0

      return successResponse({
        ...stats,
        completionPercentage,
        pointsCompletionPercentage,
        averagePointsPerStory,
      })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireProject: true }
)
