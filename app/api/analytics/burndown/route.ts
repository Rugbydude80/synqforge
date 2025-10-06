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

    const burndownData = await sprintAnalyticsRepository.getBurndownData(sprintId)

    return NextResponse.json(burndownData)
  } catch (error) {
    console.error('Get burndown data error:', error)
    return NextResponse.json({ error: 'Failed to get burndown data' }, { status: 500 })
  }
}
