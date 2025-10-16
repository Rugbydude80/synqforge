import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import {
  generateRICEScore,
  generateWSJFScore,
  suggestEffortEstimate,
  getScoringHistory,
} from '@/lib/services/effort-impact-scoring.service'

/**
 * POST /api/ai/scoring
 * Generate RICE, WSJF, or effort estimates
 */
async function generateScore(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { storyId, method, context: scoringContext } = body

    if (!storyId || !method) {
      return NextResponse.json(
        { error: 'storyId and method are required' },
        { status: 400 }
      )
    }

    let result
    switch (method) {
      case 'rice':
        result = await generateRICEScore(storyId, context.user.organizationId, scoringContext)
        break
      case 'wsjf':
        result = await generateWSJFScore(storyId, context.user.organizationId, scoringContext)
        break
      case 'effort':
        result = await suggestEffortEstimate(storyId, context.user.organizationId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid method. Must be rice, wsjf, or effort' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error generating score:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate score' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/scoring?storyId=xxx
 * Get scoring history for a story
 */
async function getHistory(req: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get('storyId')

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
    }

    const history = await getScoringHistory(storyId, context.user.organizationId)
    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Error fetching scoring history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scoring history' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(withFeatureGate('canUseEffortScoring', generateScore))
export const GET = withAuth(withFeatureGate('canUseEffortScoring', getHistory))
