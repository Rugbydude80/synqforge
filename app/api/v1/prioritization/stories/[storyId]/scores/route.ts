import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'

const scoreSchema = z.object({
  framework: z.enum(['WSJF', 'RICE', 'MoSCoW']),
  businessValue: z.number().optional(),
  timeCriticality: z.number().optional(),
  riskReduction: z.number().optional(),
  jobSize: z.number().optional(),
  wsjfScore: z.number().optional(),
  reach: z.number().optional(),
  impact: z.number().optional(),
  confidence: z.number().optional(),
  effort: z.number().optional(),
  riceScore: z.number().optional(),
  moscowCategory: z.enum(['Must', 'Should', 'Could', 'Wont']).optional(),
  reasoning: z.string().optional(),
})

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { storyId } = await params
      const repo = new PrioritizationRepository(user)
      const scores = await repo.getStoryScores(storyId)
      return NextResponse.json({ storyId, scores })
    } catch (error: any) {
      console.error('[PRIORITIZATION_STORY_SCORES] error', error)
      return NextResponse.json(
        { error: 'Failed to load scores', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireOrg: true }
)

export const PUT = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { storyId } = await params
      const body = await req.json()
      const parsed = scoreSchema.parse(body)

      const repo = new PrioritizationRepository(user)
      await repo.upsertStoryScore(storyId, parsed.framework, parsed)

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('[PRIORITIZATION_STORY_SCORES_PUT] error', error)
      return NextResponse.json(
        { error: 'Failed to save score', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireOrg: true, allowedRoles: ['owner', 'admin', 'member'] }
)
