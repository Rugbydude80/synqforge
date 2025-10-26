import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { commentsRepository } from '@/lib/repositories/comments.repository'
import { notificationsRepository } from '@/lib/repositories/notifications.repository'
import { storyCommentUrl } from '@/lib/urls'
import { assertStoryAccessible } from '@/lib/permissions/story-access'
import { z } from 'zod'

const createCommentSchema = z.object({
  storyId: z.string().min(1),
  content: z.string().min(1),
  parentCommentId: z.string().nullable().optional(),
  mentions: z.array(z.string()).optional(),
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const validated = createCommentSchema.parse(body)

    await assertStoryAccessible(validated.storyId, user.organizationId)

    // Create comment
    const comment = await commentsRepository.createComment({
      storyId: validated.storyId,
      userId: user.id,
      content: validated.content,
      parentCommentId: validated.parentCommentId,
      mentions: validated.mentions,
    })

    const actorName = user.name || 'A teammate'

    // Create notifications for mentions
    if (validated.mentions && validated.mentions.length > 0) {
      const notificationPromises = validated.mentions.map((userId) =>
        notificationsRepository.create({
          userId,
          type: 'comment_mention',
          entityType: 'comment',
          entityId: comment.id,
          message: `${actorName} mentioned you in a comment`,
          actionUrl: storyCommentUrl(validated.storyId, comment.id),
        })
      )
      await Promise.all(notificationPromises)
    }

    // If this is a reply, notify the parent comment author
    if (validated.parentCommentId) {
      const parentComment = await commentsRepository.getById(validated.parentCommentId)
      if (parentComment && parentComment.userId !== user.id) {
        await notificationsRepository.create({
          userId: parentComment.userId,
          type: 'comment_reply',
          entityType: 'comment',
          entityId: comment.id,
          message: `${actorName} replied to your comment`,
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
    if (error instanceof Error && error.message.includes('Story not found')) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
})

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get('storyId')

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
    }

    await assertStoryAccessible(storyId, user.organizationId)

    const comments = await commentsRepository.listByStory(storyId)

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Get comments error:', error)
    if (error instanceof Error && error.message.includes('Story not found')) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to get comments' }, { status: 500 })
  }
})
