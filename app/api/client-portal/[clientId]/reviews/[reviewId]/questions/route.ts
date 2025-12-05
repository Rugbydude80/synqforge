import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { ClientPortalService } from '@/lib/services/client-portal.service'
import { z } from 'zod'

const questionSchema = z.object({
  question: z.string().min(1),
})

/**
 * POST /api/client-portal/[clientId]/reviews/[reviewId]/questions
 * Add a clarifying question to a review
 */
export async function POST(
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
    const validation = questionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.addClarifyingQuestion(
      reviewId,
      validation.data.question
    )

    return NextResponse.json({
      success: true,
      data: review,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to add question:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add question' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}
