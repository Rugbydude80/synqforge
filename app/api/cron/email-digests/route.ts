import { NextRequest, NextResponse } from 'next/server'
import { sendDailyDigests, sendWeeklyDigests } from '@/lib/jobs/send-email-digests'

/**
 * Vercel Cron endpoint for email digests
 *
 * Security: Only accessible via Vercel Cron or with CRON_SECRET
 *
 * Schedules:
 * - Daily: 8am UTC (midnight PST, 3am EST, 8am GMT)
 * - Weekly: Mondays 8am UTC
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

export async function GET(request: NextRequest) {
  return handleDigestJob(request)
}

export async function POST(request: NextRequest) {
  return handleDigestJob(request)
}

async function handleDigestJob(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[DIGEST] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check which digest type to run
    const { searchParams } = new URL(request.url)
    const frequency = searchParams.get('frequency') || 'daily'

    if (frequency !== 'daily' && frequency !== 'weekly') {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be "daily" or "weekly"' },
        { status: 400 }
      )
    }

    // Run appropriate digest job
    let result
    if (frequency === 'daily') {
      result = await sendDailyDigests()
    } else {
      result = await sendWeeklyDigests()
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        frequency,
        processedCount: result.processedCount,
        timestamp: new Date().toISOString(),
      })
    } else {
      throw result.error
    }
  } catch (error) {
    console.error('[DIGEST] Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Digest job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
