import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import {
  validateStoryAC,
  validateMultipleStories,
  getValidationStats,
} from '@/lib/services/ac-validator.service'

/**
 * POST /api/ai/ac-validator
 * Validate acceptance criteria for one or multiple stories
 */
async function validateAC(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { storyId, storyIds, autoFix } = body

    if (!storyId && (!storyIds || !Array.isArray(storyIds))) {
      return NextResponse.json(
        { error: 'Either storyId or storyIds array is required' },
        { status: 400 }
      )
    }

    if (storyId) {
      // Single story validation
      const result = await validateStoryAC(
        storyId,
        context.user.organizationId,
        autoFix || false
      )

      return NextResponse.json(result)
    } else {
      // Batch validation
      const results = await validateMultipleStories(
        storyIds,
        context.user.organizationId,
        autoFix || false
      )

      return NextResponse.json({ results })
    }
  } catch (error: any) {
    console.error('Error validating AC:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate acceptance criteria' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/ac-validator?stats=true&projectId=xxx
 * Get validation statistics
 */
async function getValidationData(req: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(req.url)
    const showStats = searchParams.get('stats') === 'true'
    const projectId = searchParams.get('projectId')

    if (showStats) {
      const stats = await getValidationStats(
        context.user.organizationId,
        projectId || undefined
      )

      return NextResponse.json(stats)
    }

    return NextResponse.json({ message: 'Use ?stats=true to get statistics' })
  } catch (error: any) {
    console.error('Error fetching validation data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch validation data' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(withFeatureGate('canUseACValidator', validateAC))
export const GET = withAuth(withFeatureGate('canUseACValidator', getValidationData))
