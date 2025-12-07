import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { projectId, jobId } = await params
      const repo = new PrioritizationRepository(user)
      const job = await repo.getJob(projectId, jobId)
      return NextResponse.json({ data: job })
    } catch (error: any) {
      console.error('[PRIORITIZATION_JOB_STATUS] error', error)
      return NextResponse.json(
        { code: 'JOB_STATUS_FAILED', error: 'Failed to load job status', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true }
)
