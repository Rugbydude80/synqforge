import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commentsRepository } from '@/lib/repositories/comments.repository'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { NotFoundError, ValidationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

type RouteParams = { commentId: string }

const updateCommentSchema = z.object({
  content: z.string().min(1).optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { commentId } = await context.params
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
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    if (error instanceof z.ZodError) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { commentId } = await context.params
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
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}
