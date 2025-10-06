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
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '6')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const velocityTrend = await sprintAnalyticsRepository.getVelocityTrend(projectId, limit)
    const averageVelocity = await sprintAnalyticsRepository.getAverageVelocity(projectId, 3)

    return NextResponse.json({
      velocityTrend,
      averageVelocity,
    })
  } catch (error) {
    console.error('Get velocity data error:', error)
    return NextResponse.json({ error: 'Failed to get velocity data' }, { status: 500 })
  }
}
