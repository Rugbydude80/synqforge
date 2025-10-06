import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationsRepository } from '@/lib/repositories/notifications.repository'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await notificationsRepository.getUnreadCount(session.user.id)

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Get unread count error:', error)
    return NextResponse.json({ error: 'Failed to get unread count' }, { status: 500 })
  }
}
