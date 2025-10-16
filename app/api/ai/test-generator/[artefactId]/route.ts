import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import {
  getArtefactById,
  deleteArtefact,
} from '@/lib/services/test-artefact-generator.service'

/**
 * GET /api/ai/test-generator/[artefactId]
 * Get a specific test artefact by ID
 */
async function getArtefact(req: NextRequest, context: any) {
  try {
    const { params } = context
    const artefactId = params.artefactId

    if (!artefactId) {
      return NextResponse.json(
        { error: 'Artefact ID is required' },
        { status: 400 }
      )
    }

    const artefact = await getArtefactById(
      artefactId,
      context.user.organizationId
    )

    if (!artefact) {
      return NextResponse.json(
        { error: 'Artefact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(artefact)
  } catch (error: any) {
    console.error('Error fetching artefact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch artefact' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/test-generator/[artefactId]
 * Delete a test artefact
 */
async function deleteArtefactHandler(req: NextRequest, context: any) {
  try {
    const { params } = context
    const artefactId = params.artefactId

    if (!artefactId) {
      return NextResponse.json(
        { error: 'Artefact ID is required' },
        { status: 400 }
      )
    }

    await deleteArtefact(artefactId, context.user.organizationId)

    return NextResponse.json({
      success: true,
      message: 'Artefact deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting artefact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete artefact' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(
  withFeatureGate('canUseTestGeneration', getArtefact)
)

export const DELETE = withAuth(
  withFeatureGate('canUseTestGeneration', deleteArtefactHandler)
)
