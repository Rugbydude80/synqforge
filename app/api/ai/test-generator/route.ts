import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import {
  generateTestArtefact,
  generateMultipleArtefacts,
  getStoryArtefacts,
  getGenerationStats,
  type ArtefactType,
} from '@/lib/services/test-artefact-generator.service'

/**
 * POST /api/ai/test-generator
 * Generate test artefacts from story acceptance criteria
 */
async function generateArtefacts(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { storyId, artefactType, artefactTypes, options } = body

    if (!storyId) {
      return NextResponse.json(
        { error: 'storyId is required' },
        { status: 400 }
      )
    }

    if (!artefactType && (!artefactTypes || !Array.isArray(artefactTypes))) {
      return NextResponse.json(
        { error: 'Either artefactType or artefactTypes array is required' },
        { status: 400 }
      )
    }

    if (artefactType) {
      // Single artefact generation
      const validTypes: ArtefactType[] = ['gherkin', 'postman', 'playwright', 'cypress']
      if (!validTypes.includes(artefactType)) {
        return NextResponse.json(
          { error: `Invalid artefact type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }

      const result = await generateTestArtefact({
        storyId,
        organizationId: context.user.organizationId,
        artefactType,
        options: options || {},
      })

      return NextResponse.json(result)
    } else {
      // Batch artefact generation
      const results = await generateMultipleArtefacts(
        storyId,
        context.user.organizationId,
        artefactTypes,
        options || {}
      )

      return NextResponse.json({ results })
    }
  } catch (error: any) {
    console.error('Error generating test artefacts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate test artefacts' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/test-generator?storyId=xxx&artefactType=xxx&stats=true
 * Get test artefacts for a story or statistics
 */
async function getArtefacts(req: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get('storyId')
    const artefactType = searchParams.get('artefactType') as ArtefactType | null
    const showStats = searchParams.get('stats') === 'true'

    if (showStats) {
      const stats = await getGenerationStats(context.user.organizationId)
      return NextResponse.json(stats)
    }

    if (!storyId) {
      return NextResponse.json(
        { error: 'storyId is required' },
        { status: 400 }
      )
    }

    const artefacts = await getStoryArtefacts(
      storyId,
      context.user.organizationId,
      artefactType || undefined
    )

    return NextResponse.json({ artefacts })
  } catch (error: any) {
    console.error('Error fetching test artefacts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch test artefacts' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(
  withFeatureGate('canUseTestGeneration', generateArtefacts)
)

export const GET = withAuth(
  withFeatureGate('canUseTestGeneration', getArtefacts)
)
