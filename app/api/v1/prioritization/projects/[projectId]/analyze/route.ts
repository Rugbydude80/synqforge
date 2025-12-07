import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'
import type { BacklogAnalysisConfig } from '@/lib/prioritization/types'

const analyzeSchema = z.object({
  framework: z.enum(['WSJF', 'RICE', 'MoSCoW']),
  strategicFocus: z.string().optional(),
  marketSegment: z.string().optional(),
  competitivePressure: z.string().optional(),
  budgetPerQuarter: z.number().optional(),
  teamVelocity: z.number().optional(),
})

export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { projectId } = await params
      const body = await req.json()
      const config = analyzeSchema.parse(body) as BacklogAnalysisConfig

      const repo = new PrioritizationRepository(user)
      const result = await repo.runAnalysis(projectId, config)

      return NextResponse.json(
        {
          reportId: result.reportId,
          framework: config.framework,
          rankedStories: result.rankedStories,
          strategicAlignment: result.strategicAlignment,
          priorityConflicts: result.priorityConflicts,
          capacityAnalysis: result.capacityAnalysis,
          confidenceLevels: result.confidenceLevels,
          executiveSummary: result.executiveSummary,
        },
        { status: 202 }
      )
    } catch (error: any) {
      console.error('[PRIORITIZATION_ANALYZE] error', error)
      return NextResponse.json(
        { error: 'Failed to run analysis', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true, allowedRoles: ['owner', 'admin', 'member'] }
)
