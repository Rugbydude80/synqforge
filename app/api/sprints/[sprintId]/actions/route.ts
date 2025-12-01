import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { SprintsRepository } from '@/lib/repositories/sprints'
import { APIResponse } from '@/lib/types'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

const ActionSchema = z.object({
  action: z.enum(['start', 'complete', 'cancel']),
})

/**
 * POST /api/sprints/[sprintId]/actions
 * Perform actions on a sprint (start, complete, cancel)
 */
export const POST = withAuth(
  async (req: NextRequest, context) => {
    try {
      const { sprintId } = context.params
      const body = await req.json()

      // Validate action
      const { action } = ActionSchema.parse(body)

      const repository = new SprintsRepository(context.user)
      let sprint

      switch (action) {
        case 'start':
          sprint = await repository.startSprint(sprintId)
          break
        case 'complete':
          sprint = await repository.completeSprint(sprintId)
          break
        case 'cancel':
          sprint = await repository.cancelSprint(sprintId)
          break
      }

      const response: APIResponse = {
        success: true,
        data: sprint,
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Sprint actions API error:', error)
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
