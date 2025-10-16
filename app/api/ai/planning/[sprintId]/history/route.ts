import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import { getSprintForecastHistory } from '@/lib/services/planning-forecasting.service'

/**
 * GET /api/ai/planning/[sprintId]/history
 * Get forecast history for a sprint
 */
async function getForecastHistory(req: NextRequest, context: any) {
  try {
    const { params } = context
    const sprintId = params.sprintId

    if (!sprintId) {
      return NextResponse.json(
        { error: 'Sprint ID is required' },
        { status: 400 }
      )
    }

    const history = await getSprintForecastHistory(
      sprintId,
      context.user.organizationId
    )

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Error fetching forecast history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch forecast history' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(
  withFeatureGate('canUsePlanningForecasting', getForecastHistory)
)
