import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'
import type { BacklogAnalysisConfig } from '@/lib/prioritization/types'
import { createRateLimiter, checkRateLimit } from '@/lib/rate-limit'

const PRIORITIZATION_ENABLED = process.env.PRIORITIZATION_API_ENABLED !== 'false'
const RATE_LIMIT_PER_MIN = parseInt(process.env.PRIORITIZATION_RATE_LIMIT_PER_MIN || '30', 10)
const limiter = createRateLimiter('ratelimit:prioritization', RATE_LIMIT_PER_MIN, '1 m')

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
      if (!PRIORITIZATION_ENABLED) {
        return NextResponse.json({ code: 'FEATURE_DISABLED', error: 'Prioritization API disabled' }, { status: 403 })
      }

      const rl = await checkRateLimit(`prioritization:user:${user.id}`, limiter)
      if (!rl.success) {
        return NextResponse.json(
          { code: 'RATE_LIMIT', error: 'Too many requests, try again soon' },
          { status: 429 }
        )
      }

      const { projectId } = await params
      const body = await req.json()
      const config = analyzeSchema.parse(body) as BacklogAnalysisConfig

      const repo = new PrioritizationRepository(user)
      const jobId = await repo.createJob(projectId, config.framework, config as any)

      return NextResponse.json(
        {
          jobId,
          status: 'pending',
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
