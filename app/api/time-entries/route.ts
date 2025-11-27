import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { TimeTrackingService } from '@/lib/services/time-tracking.service'
import { z } from 'zod'

const createTimeEntrySchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  storyId: z.string().optional(),
  userId: z.string(),
  startedAt: z.string().datetime().transform((val) => new Date(val)),
  endedAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
  billingRate: z.number().positive().optional(),
})

/**
 * GET /api/time-entries
 * Get time entries with optional filters
 */
async function getTimeEntries(request: NextRequest, context: any) {
  try {
    const service = new TimeTrackingService(context.user)
    const params = request.nextUrl.searchParams

    const filters = {
      clientId: params.get('clientId') || undefined,
      projectId: params.get('projectId') || undefined,
      storyId: params.get('storyId') || undefined,
      userId: params.get('userId') || undefined,
      invoiceId: params.get('invoiceId') === 'null' ? null : params.get('invoiceId') || undefined,
      startDate: params.get('startDate') ? new Date(params.get('startDate')!) : undefined,
      endDate: params.get('endDate') ? new Date(params.get('endDate')!) : undefined,
      billable: params.get('billable') === 'true' ? true : params.get('billable') === 'false' ? false : undefined,
    }

    const entries = await service.getTimeEntries(filters)
    return NextResponse.json({ data: entries })
  } catch (error: any) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/time-entries
 * Create manual time entry
 */
async function createTimeEntry(request: NextRequest, context: any) {
  try {
    const body = await request.json()
    const validated = createTimeEntrySchema.parse(body)

    const service = new TimeTrackingService(context.user)
    const entry = await service.createTimeEntry(validated)

    return NextResponse.json({ data: entry }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating time entry:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create time entry' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getTimeEntries, { requireOrg: true })
export const POST = withAuth(createTimeEntry, { requireOrg: true })

