import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { ClientPortalService } from '@/lib/services/client-portal.service'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['approved', 'needs_revision', 'rejected']),
  approvedByEmail: z.string().email(),
  approvedByRole: z.string().min(1),
  notes: z.string().optional(),
})

/**
 * GET /api/client-portal/[clientId]/reviews/[reviewId]
 * Get a specific review (requires valid portal token)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; reviewId: string } }
) {
  try {
    const { clientId, reviewId } = params
    
    // Validate portal token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    const portalService = new ClientPortalService('')
    const tokenValidation = await portalService.validatePortalToken(token)
    
    if (!tokenValidation.valid || tokenValidation.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.getReview(reviewId)

    // Track that the review was viewed
    await reviewService.trackViewed(reviewId)

    return NextResponse.json({
      success: true,
      data: review,
    })
  } catch (error: any) {
    console.error('Failed to fetch review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch review' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}

/**
 * PATCH /api/client-portal/[clientId]/reviews/[reviewId]
 * Update review approval status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string; reviewId: string } }
) {
  try {
    const { clientId, reviewId } = params
    const body = await request.json()
    
    // Validate portal token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    const portalService = new ClientPortalService('')
    const tokenValidation = await portalService.validatePortalToken(token)
    
    if (!tokenValidation.valid || tokenValidation.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Validate request body
    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { status, approvedByEmail, approvedByRole, notes } = validation.data

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.updateApprovalStatus(
      reviewId,
      status,
      approvedByEmail,
      approvedByRole,
      notes
    )

    return NextResponse.json({
      success: true,
      data: review,
    })
  } catch (error: any) {
    console.error('Failed to update review status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update review status' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}
