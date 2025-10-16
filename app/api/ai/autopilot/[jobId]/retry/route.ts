import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import { retryAutopilotJob } from '@/lib/services/backlog-autopilot.service'

/**
 * POST /api/ai/autopilot/[jobId]/retry
 * Retry a failed autopilot job
 */
async function retryAutopilot(
  req: NextRequest,
  context: any
) {
  try {
    const { params } = context
    const jobId = params.jobId

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const result = await retryAutopilotJob(jobId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error retrying autopilot job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retry autopilot job' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(
  withFeatureGate('canUseBacklogAutopilot', retryAutopilot)
)
