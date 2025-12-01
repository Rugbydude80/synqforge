import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { TimeTrackingService } from '@/lib/services/time-tracking.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

/**
 * POST /api/stories/[storyId]/time/start
 * Start timer for a story
 */
async function startTimer(_request: NextRequest, context: AuthContext & { params: { storyId: string } }) {
  try {
    const { storyId } = context.params
    const service = new TimeTrackingService(context.user)
    
    const entry = await service.startTimer(storyId, context.user.id)

    return NextResponse.json({ data: entry })
  } catch (error) {
    console.error('Error starting timer:', error)
    
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

/**
 * POST /api/stories/[storyId]/time/stop
 * Stop timer
 */
async function stopTimer(request: NextRequest, context: AuthContext) {
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
  } catch (error) {
    console.error('Error stopping timer:', error)
    
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

/**
 * GET /api/stories/[storyId]/time
 * Get time entries for a story
 */
async function getStoryTimeEntries(_request: NextRequest, context: AuthContext & { params: { storyId: string } }) {
  try {
    const { storyId } = context.params
    const service = new TimeTrackingService(context.user)
    
    const entries = await service.getTimeEntries({ storyId })
    const totals = await service.getTotalHoursForStory(storyId)

    return NextResponse.json({
      data: entries,
      totals,
    })
  } catch (error) {
    console.error('Error fetching story time entries:', error)
    
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

