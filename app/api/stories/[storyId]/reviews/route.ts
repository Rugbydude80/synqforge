import { NextRequest, NextResponse } from 'next/server'
import { ClientStoryReviewService } from '@/lib/services/client-story-review.service'
import { auth } from '@/lib/auth'

/**
 * GET /api/stories/[storyId]/reviews
 * Get all reviews for a story (team member endpoint)
 */
export async function GET(
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

    const reviewService = new ClientStoryReviewService()
    const reviews = await reviewService.getStoryReviews(storyId)

    return NextResponse.json({
      success: true,
      data: reviews,
    })
  } catch (error: any) {
    console.error('Failed to fetch story reviews:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
