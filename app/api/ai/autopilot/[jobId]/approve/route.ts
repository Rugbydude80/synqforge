import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import { approveAutopilotJob } from '@/lib/services/backlog-autopilot.service'

/**
 * POST /api/ai/autopilot/[jobId]/approve
 * Approve and publish autopilot results from review queue
 */
async function approveAutopilot(
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

    const body = await req.json()
    const { approvedStoryIds } = body

    if (!approvedStoryIds || !Array.isArray(approvedStoryIds)) {
      return NextResponse.json(
        { error: 'approvedStoryIds must be an array' },
        { status: 400 }
      )
    }

    await approveAutopilotJob(jobId, approvedStoryIds)

    return NextResponse.json({
      success: true,
      message: 'Autopilot results approved and published',
    })
  } catch (error: any) {
    console.error('Error approving autopilot job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve autopilot job' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(
  withFeatureGate('canUseBacklogAutopilot', approveAutopilot)
)
