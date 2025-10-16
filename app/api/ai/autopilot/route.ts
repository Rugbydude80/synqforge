import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import {
  createAutopilotJob,
  getAutopilotJob,
  listAutopilotJobs,
  retryAutopilotJob,
} from '@/lib/services/backlog-autopilot.service'

/**
 * POST /api/ai/autopilot
 * Create a new Backlog Autopilot job
 */
async function createAutopilot(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { projectId, documentContent, documentName, mimeType, requireReview } = body

    if (!projectId || !documentContent || !documentName) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, documentContent, documentName' },
        { status: 400 }
      )
    }

    const result = await createAutopilotJob({
      organizationId: context.user.organizationId,
      projectId,
      userId: context.user.id,
      documentContent,
      documentName,
      mimeType: mimeType || 'text/plain',
      requireReview: requireReview || false,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error creating autopilot job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create autopilot job' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/autopilot?organizationId=xxx&jobId=xxx
 * Get autopilot job status or list jobs
 */
async function getAutopilots(req: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Get specific job
      const job = await getAutopilotJob(jobId)

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(job)
    } else {
      // List jobs for organization
      const jobs = await listAutopilotJobs(context.user.organizationId, 20)
      return NextResponse.json({ jobs })
    }
  } catch (error: any) {
    console.error('Error fetching autopilot jobs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch autopilot jobs' },
      { status: 500 }
    )
  }
}

// Apply auth and feature gate middlewares
export const POST = withAuth(
  withFeatureGate('canUseBacklogAutopilot', createAutopilot)
)

export const GET = withAuth(
  withFeatureGate('canUseBacklogAutopilot', getAutopilots)
)
