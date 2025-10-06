import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationsRepository } from '@/lib/repositories/notifications.repository'
import { z } from 'zod'

const markReadSchema = z.object({
  notificationId: z.string().optional(),
  markAll: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = markReadSchema.parse(body)

    if (validated.markAll) {
      await notificationsRepository.markAllAsRead(session.user.id)
      return NextResponse.json({ success: true })
    }

    if (validated.notificationId) {
      const updated = await notificationsRepository.markAsRead(
        validated.notificationId,
        session.user.id
      )
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Either notificationId or markAll must be provided' }, { status: 400 })
  } catch (error) {
    console.error('Mark notification as read error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}
