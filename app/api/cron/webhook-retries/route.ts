/**
 * Cron Job: Retry Failed Webhooks
 * Runs periodically to retry failed webhook deliveries
 * Configure in Vercel Cron or external scheduler
 */

import { NextRequest, NextResponse } from 'next/server'
import { retryFailedWebhooks } from '@/lib/services/webhook.service'

/**
 * POST /api/cron/webhook-retries
 * Retry failed webhook deliveries
 */
export async function POST(req: NextRequest) {
  // Verify cron secret (if configured)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const retried = await retryFailedWebhooks()

    return NextResponse.json({
      success: true,
      retried,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error retrying webhooks:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for manual triggering
export async function GET(req: NextRequest) {
  return POST(req)
}

