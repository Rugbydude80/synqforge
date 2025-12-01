import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse } from '@/lib/types'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

const ManageStoriesSchema = z.object({
  action: z.enum(['add', 'remove']),
  storyIds: z.array(z.string().uuid()).min(1),
})

/**
 * POST /api/sprints/[sprintId]/stories/manage
 * Add or remove stories from a sprint
 */
export const POST = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { sprintId } = context.params
      const body = await req.json()

      // Validate request
      const { action, storyIds } = ManageStoriesSchema.parse(body)

      const repository = new SprintsRepository(context.user)
      let result

      if (action === 'add') {
        result = await repository.addStoriesToSprint(sprintId, storyIds)
      } else {
        result = await repository.removeStoriesFromSprint(sprintId, storyIds)
      }

      const response: APIResponse = {
        success: true,
        data: result,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprint stories manage API error:', error)
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
  { allowedRoles: ['admin', 'member'] }
)
