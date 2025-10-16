import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commentsRepository } from '@/lib/repositories/comments.repository'
import { z } from 'zod'

const updateCommentSchema = z.object({
  content: z.string().min(1).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateCommentSchema.parse(body)

    const updated = await commentsRepository.updateComment(
      commentId,
      session.user.id,
      validated
    )

    if (!updated) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update comment error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await commentsRepository.deleteComment(commentId, session.user.id)

    if (!deleted) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
