import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commentsRepository } from '@/lib/repositories/comments.repository'
import { notificationsRepository } from '@/lib/repositories/notifications.repository'
import { storyCommentUrl } from '@/lib/urls'
import { z } from 'zod'

const createCommentSchema = z.object({
  storyId: z.string().min(1),
  content: z.string().min(1),
  parentCommentId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createCommentSchema.parse(body)

    // Create comment
    const comment = await commentsRepository.createComment({
      storyId: validated.storyId,
      userId: session.user.id,
      content: validated.content,
      parentCommentId: validated.parentCommentId,
      mentions: validated.mentions,
    })

    // Create notifications for mentions
    if (validated.mentions && validated.mentions.length > 0) {
      const notificationPromises = validated.mentions.map((userId) =>
        notificationsRepository.create({
          userId,
          type: 'comment_mention',
          entityType: 'comment',
          entityId: comment.id,
          message: `${session.user.name} mentioned you in a comment`,
          actionUrl: storyCommentUrl(validated.storyId, comment.id),
        })
      )
      await Promise.all(notificationPromises)
    }

    // If this is a reply, notify the parent comment author
    if (validated.parentCommentId) {
      const parentComment = await commentsRepository.getById(validated.parentCommentId)
      if (parentComment && parentComment.userId !== session.user.id) {
        await notificationsRepository.create({
          userId: parentComment.userId,
          type: 'comment_reply',
          entityType: 'comment',
          entityId: comment.id,
          message: `${session.user.name} replied to your comment`,
          actionUrl: storyCommentUrl(validated.storyId, comment.id),
        })
      }
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Create comment error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get('storyId')

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
    }

    const comments = await commentsRepository.listByStory(storyId)

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: 'Failed to get comments' }, { status: 500 })
  }
}
