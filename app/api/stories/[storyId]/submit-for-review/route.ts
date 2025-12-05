import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const submitSchema = z.object({
  clientId: z.string().min(1),
})

/**
 * POST /api/stories/[storyId]/submit-for-review
 * Submit a story for client review (team member endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { storyId } = await params
    const body = await request.json()
    
    // Validate request body
    const validation = submitSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { clientId } = validation.data

    const reviewService = new ClientStoryReviewService()
    const review = await reviewService.submitStoryForReview(
      storyId,
      clientId,
      session.user.organizationId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Story submitted for client review',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to submit story for review:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit story for review' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    )
  }
}
