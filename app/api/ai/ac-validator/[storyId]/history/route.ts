import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import { getValidationHistory } from '@/lib/services/ac-validator.service'

/**
 * GET /api/ai/ac-validator/[storyId]/history
 * Get validation history for a story
 */
async function getHistory(req: NextRequest, context: any) {
  try {
    const { params } = context
    const storyId = params.storyId

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const history = await getValidationHistory(
      storyId,
      context.user.organizationId,
      limit
    )

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Error fetching validation history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch validation history' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(withFeatureGate('canUseACValidator', getHistory))
