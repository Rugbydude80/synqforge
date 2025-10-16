import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureGate } from '@/lib/middleware/feature-gate'
import { generateReleaseForecast } from '@/lib/services/planning-forecasting.service'

/**
 * POST /api/ai/planning/release
 * Generate release forecast
 */
async function createReleaseForecast(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { releaseId, projectId } = body

    if (!releaseId || !projectId) {
      return NextResponse.json(
        { error: 'releaseId and projectId are required' },
        { status: 400 }
      )
    }

    const forecast = await generateReleaseForecast(
      context.user.organizationId,
      projectId,
      releaseId
    )

    return NextResponse.json(forecast)
  } catch (error: any) {
    console.error('Error generating release forecast:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate release forecast' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(
  withFeatureGate('canUsePlanningForecasting', createReleaseForecast)
)
