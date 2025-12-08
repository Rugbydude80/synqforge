import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'
import { z } from 'zod'

const processSchema = z.object({
  jobId: z.string().optional(),
  framework: z.enum(['WSJF', 'RICE', 'MoSCoW']).optional(),
})

export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { projectId } = await params
      const body = await req.json().catch(() => ({}))
      const parsed = processSchema.parse(body)
      const repo = new PrioritizationRepository(user)

      if (parsed.jobId) {
        const job = await repo.getJob(projectId, parsed.jobId)
        const config = { framework: job.framework } as any
        const result = await repo.processJob(projectId, job.id, config)
        return NextResponse.json({ data: result })
      }

      const pending = await repo.getPendingJob(projectId, parsed.framework)
      if (!pending) {
        return NextResponse.json({ message: 'No pending jobs' })
      }
      const config = { framework: pending.framework } as any
      const result = await repo.processJob(projectId, pending.id, config)
      return NextResponse.json({ data: result })
    } catch (error: any) {
      console.error('[PRIORITIZATION_PROCESS_JOBS] error', error)
      return NextResponse.json(
        { code: 'JOB_PROCESS_FAILED', error: 'Failed to process job', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true, allowedRoles: ['owner', 'admin', 'member'] }
)
