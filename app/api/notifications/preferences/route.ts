import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationsRepository } from '@/lib/repositories/notifications.repository'
import { z } from 'zod'

const preferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  notifyOnMention: z.boolean().optional(),
  notifyOnAssignment: z.boolean().optional(),
  notifyOnSprintChanges: z.boolean().optional(),
  digestFrequency: z.enum(['real_time', 'daily', 'weekly']).optional(),
})

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await notificationsRepository.getPreferences(session.user.id)

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = preferencesSchema.parse(body)

    const updated = await notificationsRepository.updatePreferences(session.user.id, validated)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update preferences error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
