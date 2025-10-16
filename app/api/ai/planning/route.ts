import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import {
  generateSprintForecast,
  getSprintForecast,
  calculateHistoricalVelocity,
} from '@/lib/services/planning-forecasting.service'

/**
 * POST /api/ai/planning
 * Generate sprint forecast with AI recommendations
 */
async function createForecast(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { sprintId, projectId, capacityOverride } = body

    if (!sprintId || !projectId) {
      return NextResponse.json(
        { error: 'sprintId and projectId are required' },
        { status: 400 }
      )
    }

    const forecast = await generateSprintForecast(
      context.user.organizationId,
      projectId,
      sprintId,
      capacityOverride
    )

    return NextResponse.json(forecast)
  } catch (error: any) {
    console.error('Error generating forecast:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate sprint forecast' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/planning?forecastId=xxx&velocity=true&projectId=xxx
 * Get forecast by ID or calculate velocity
 */
async function getForecastData(req: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(req.url)
    const forecastId = searchParams.get('forecastId')
    const showVelocity = searchParams.get('velocity') === 'true'
    const projectId = searchParams.get('projectId')

    if (forecastId) {
      const forecast = await getSprintForecast(
        forecastId,
        context.user.organizationId
      )

      if (!forecast) {
        return NextResponse.json(
          { error: 'Forecast not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(forecast)
    }

    if (showVelocity && projectId) {
      const lookbackSprints = parseInt(searchParams.get('lookback') || '3', 10)
      const velocityData = await calculateHistoricalVelocity(
        context.user.organizationId,
        projectId,
        lookbackSprints
      )

      return NextResponse.json(velocityData)
    }

    return NextResponse.json(
      { error: 'Either forecastId or velocity=true with projectId is required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error fetching forecast data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch forecast data' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(
  withFeatureGate('canUsePlanningForecasting', createForecast)
)

export const GET = withAuth(
  withFeatureGate('canUsePlanningForecasting', getForecastData)
)
