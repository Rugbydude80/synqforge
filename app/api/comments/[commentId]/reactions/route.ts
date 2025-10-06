import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commentsRepository } from '@/lib/repositories/comments.repository'
import { z } from 'zod'

const addReactionSchema = z.object({
  emoji: z.string().min(1).max(20),
})

export async function POST(
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
    const validated = addReactionSchema.parse(body)

    const reaction = await commentsRepository.addReaction({
      commentId,
      userId: session.user.id,
      emoji: validated.emoji,
    })

    return NextResponse.json(reaction)
  } catch (error) {
    console.error('Add reaction error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emoji = searchParams.get('emoji')

    if (!emoji) {
      return NextResponse.json({ error: 'emoji is required' }, { status: 400 })
    }

    await commentsRepository.removeReaction(commentId, session.user.id, emoji)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove reaction error:', error)
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reactions = await commentsRepository.getReactions(commentId)

    return NextResponse.json(reactions)
  } catch (error) {
    console.error('Get reactions error:', error)
    return NextResponse.json({ error: 'Failed to get reactions' }, { status: 500 })
  }
}
