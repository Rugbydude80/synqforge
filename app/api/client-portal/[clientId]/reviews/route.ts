import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { ClientPortalService } from '@/lib/services/client-portal.service'
import { z } from 'zod'

const submitReviewSchema = z.object({
  storyId: z.string().min(1),
  submittedBy: z.string().min(1),
})

/**
 * GET /api/client-portal/[clientId]/reviews
 * Get all reviews for a client (requires valid portal token)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    
    // Validate portal token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    // Validate token and get organization context
    const portalService = new ClientPortalService('') // Organization ID not needed for token validation
    const tokenValidation = await portalService.validatePortalToken(token)
    
    if (!tokenValidation.valid || tokenValidation.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get organization ID from client
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    const reviewService = new ClientStoryReviewService()
    const reviews = await reviewService.getClientReviews(clientId, organizationId)

    return NextResponse.json({
      success: true,
      data: reviews,
    })
  } catch (error: any) {
    console.error('Failed to fetch client reviews:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/client-portal/[clientId]/reviews
 * Submit a story for client review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const body = await request.json()
    
    // Validate request body
    const validation = submitReviewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { storyId, submittedBy } = validation.data
    const organizationId = body.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.submitStoryForReview(
      storyId,
      clientId,
      organizationId,
      submittedBy
    )

    return NextResponse.json({
      success: true,
      data: review,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to submit story for review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit story for review' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}
