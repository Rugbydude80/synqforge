import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { TimeTrackingService } from '@/lib/services/time-tracking.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

const updateTimeEntrySchema = z.object({
  startedAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  endedAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
  billingRate: z.number().positive().optional(),
})

/**
 * PATCH /api/time-entries/[entryId]
 * Update time entry
 */
async function updateTimeEntry(request: NextRequest, context: AuthContext & { params: { entryId: string } }) {
  try {
    const { entryId } = context.params
    const body = await request.json()
    const validated = updateTimeEntrySchema.parse(body)

    const service = new TimeTrackingService(context.user)
    const entry = await service.updateTimeEntry(entryId, validated)

    return NextResponse.json({ data: entry })
  } catch (error) {
    console.error('Error updating time entry:', error)
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    if (error instanceof z.ZodError) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

/**
 * DELETE /api/time-entries/[entryId]
 * Delete time entry
 */
async function deleteTimeEntry(_request: NextRequest, context: AuthContext & { params: { entryId: string } }) {
  try {
    const { entryId } = context.params
    const service = new TimeTrackingService(context.user)
    
    // Get entry first to check existence
    const entry = await service['timeEntriesRepo'].getTimeEntryById(entryId)
    if (!entry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    await service['timeEntriesRepo'].deleteTimeEntry(entryId)
    return NextResponse.json({ message: 'Time entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

export const PATCH = withAuth(updateTimeEntry, { requireOrg: true })
export const DELETE = withAuth(deleteTimeEntry, { requireOrg: true })

