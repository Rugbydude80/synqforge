import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sprintAnalyticsRepository } from '@/lib/repositories/sprint-analytics.repository'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sprintId = searchParams.get('sprintId')

    if (!sprintId) {
      return NextResponse.json({ error: 'sprintId is required' }, { status: 400 })
    }

    const health = await sprintAnalyticsRepository.getSprintHealth(sprintId)

    return NextResponse.json(health)
  } catch (error) {
    console.error('Get sprint health error:', error)
    return NextResponse.json({ error: 'Failed to get sprint health' }, { status: 500 })
  }
}
