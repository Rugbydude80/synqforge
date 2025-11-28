import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { TimeTrackingService } from '@/lib/services/time-tracking.service'
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
 * PUT /api/time-entries/[entryId]
 * Update time entry
 */
async function updateTimeEntry(request: NextRequest, context: any) {
  try {
    const { entryId } = context.params
    const body = await request.json()
    const validated = updateTimeEntrySchema.parse(body)

    const service = new TimeTrackingService(context.user)
    const entry = await service.updateTimeEntry(entryId, validated)

    return NextResponse.json({ data: entry })
  } catch (error: any) {
    console.error('Error updating time entry:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'Time entry not found') {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update time entry' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/time-entries/[entryId]
 * Delete time entry
 */
async function deleteTimeEntry(_request: NextRequest, context: any) {
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
  } catch (error: any) {
    console.error('Error deleting time entry:', error)
    
    if (error.message === 'Time entry not found') {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete time entry' },
      { status: 500 }
    )
  }
}

export const PUT = withAuth(updateTimeEntry, { requireOrg: true })
export const DELETE = withAuth(deleteTimeEntry, { requireOrg: true })

