import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { ClientPortalService } from '@/lib/services/client-portal.service'
import { z } from 'zod'

const feedbackSchema = z.object({
  type: z.enum(['concern', 'question', 'suggestion', 'blocker']),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
})

/**
 * POST /api/client-portal/[clientId]/reviews/[reviewId]/feedback
 * Add feedback item to a review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; reviewId: string }> }
) {
  try {
    const { clientId, reviewId } = await params
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
    const validation = feedbackSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.addFeedbackItem(reviewId, validation.data)

    return NextResponse.json({
      success: true,
      data: review,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to add feedback:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add feedback' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}
