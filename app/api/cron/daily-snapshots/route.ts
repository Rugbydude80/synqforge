import { NextRequest, NextResponse } from 'next/server'
import { generateDailySprintSnapshots } from '@/lib/jobs/daily-sprint-snapshots'

/**
 * Daily Sprint Snapshots Cron Endpoint
 *
 * Triggered by Vercel Cron or manual POST request
 *
 * Security: Verify cron secret in production
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel automatically sets this header)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Log cron job execution for monitoring
  console.error('[CRON] Daily snapshots endpoint called at', new Date().toISOString())

  try {
    const result = await generateDailySprintSnapshots()

    return NextResponse.json(result)
  } catch (error) {
    console.error('[CRON] Error in daily snapshots endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
