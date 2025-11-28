import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { TimeTrackingService } from '@/lib/services/time-tracking.service'

/**
 * POST /api/stories/[storyId]/time/start
 * Start timer for a story
 */
async function startTimer(_request: NextRequest, context: any) {
  try {
    const { storyId } = context.params
    const service = new TimeTrackingService(context.user)
    
    const entry = await service.startTimer(storyId, context.user.id)

    return NextResponse.json({ data: entry })
  } catch (error: any) {
    console.error('Error starting timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start timer' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stories/[storyId]/time/stop
 * Stop timer
 */
async function stopTimer(request: NextRequest, context: any) {
  try {
    const body = await request.json()
    const { entryId } = body

    if (!entryId) {
      return NextResponse.json(
        { error: 'entryId is required' },
        { status: 400 }
      )
    }

    const service = new TimeTrackingService(context.user)
    const entry = await service.stopTimer(entryId)

    return NextResponse.json({ data: entry })
  } catch (error: any) {
    console.error('Error stopping timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to stop timer' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stories/[storyId]/time
 * Get time entries for a story
 */
async function getStoryTimeEntries(_request: NextRequest, context: any) {
  try {
    const { storyId } = context.params
    const service = new TimeTrackingService(context.user)
    
    const entries = await service.getTimeEntries({ storyId })
    const totals = await service.getTotalHoursForStory(storyId)

    return NextResponse.json({
      data: entries,
      totals,
    })
  } catch (error: any) {
    console.error('Error fetching story time entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(async (req, ctx) => {
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'start') {
    return startTimer(req, ctx)
  } else if (action === 'stop') {
    return stopTimer(req, ctx)
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}, { requireOrg: true })

export const GET = withAuth(getStoryTimeEntries, { requireOrg: true })

