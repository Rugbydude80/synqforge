import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'
import type { BacklogAnalysisConfig } from '@/lib/prioritization/types'

const analyzeSchema = z.object({
  framework: z.enum(['WSJF', 'RICE', 'MoSCoW']),
  strategicFocus: z.string().max(500).optional(),
  marketSegment: z.string().max(200).optional(),
  competitivePressure: z.string().max(100).optional(),
  budgetPerQuarter: z.number().positive().optional(),
  teamVelocity: z.number().positive().optional(),
})

export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { projectId } = await params
      const body = await req.json()
      const config = analyzeSchema.parse(body) as BacklogAnalysisConfig

      const repo = new PrioritizationRepository(user)
      const jobId = await repo.createJob(projectId, config.framework)
      // Process synchronously for now; status endpoints will reflect completion
      const result = await repo.processJob(projectId, jobId, config)

      return NextResponse.json(
        {
          jobId: result.jobId,
          status: result.status,
          reportId: result.reportId,
        },
        { status: 202 }
      )
    } catch (error: any) {
      console.error('[PRIORITIZATION_ANALYZE] error', error)
      return NextResponse.json(
        { code: 'ANALYZE_FAILED', error: 'Failed to run analysis', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true, allowedRoles: ['owner', 'admin', 'member'] }
)
