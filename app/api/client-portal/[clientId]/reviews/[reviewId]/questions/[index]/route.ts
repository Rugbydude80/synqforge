import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { z } from 'zod'

const answerSchema = z.object({
  answer: z.string().min(1),
})

/**
 * PATCH /api/client-portal/[clientId]/reviews/[reviewId]/questions/[index]
 * Answer a clarifying question (team member endpoint)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string; reviewId: string; index: string } }
) {
  try {
    const { reviewId, index } = params
    const body = await request.json()
    
    // Note: This endpoint should be protected by regular auth, not portal token
    // since it's for team members to answer questions, not clients to ask them
    
    // TODO: Add proper authentication middleware
    
    // Validate request body
    const validation = answerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const questionIndex = parseInt(index, 10)
    if (isNaN(questionIndex) || questionIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid question index' },
        { status: 400 }
      )
    }

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.answerClarifyingQuestion(
      reviewId,
      questionIndex,
      validation.data.answer
    )

    return NextResponse.json({
      success: true,
      data: review,
    })
  } catch (error: any) {
    console.error('Failed to answer question:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to answer question' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}
