/**
 * Billing Period Reset Cron Job
 * 
 * Runs daily at midnight UTC to:
 * 1. Find organizations with expired billing periods
 * 2. Calculate rollover (Core/Pro plans only)
 * 3. Archive current period to history
 * 4. Reset usage counters
 * 
 * Configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reset-billing-periods",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 * 
 * Security: Verifies CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations, workspaceUsage } from '@/lib/db/schema'
import { sql, lte } from 'drizzle-orm'
import { handleBillingPeriodReset } from '@/lib/services/subscription-tier.service'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max execution time

export async function GET(req: NextRequest) {
  try {
    // 1. Verify cron secret (security)
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET) {
      console.error('[cron] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    if (authHeader !== expectedAuth) {
      console.warn('[cron] Unauthorized cron attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[cron] Starting billing period reset job...')

    // 2. Find organizations with expired billing periods
    const now = new Date()
    const expiredUsageRecords = await db
      .select({
        organizationId: workspaceUsage.organizationId,
        billingPeriodEnd: workspaceUsage.billingPeriodEnd,
      })
      .from(workspaceUsage)
      .where(lte(workspaceUsage.billingPeriodEnd, now))

    console.log(`[cron] Found ${expiredUsageRecords.length} organizations with expired billing periods`)

    if (expiredUsageRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No organizations require billing period reset',
        processed: 0,
        successCount: 0,
        errorCount: 0,
        timestamp: now.toISOString(),
      })
    }

    // 3. Process each organization
    let successCount = 0
    let errorCount = 0
    const errors: Array<{ organizationId: string; error: string }> = []

    for (const record of expiredUsageRecords) {
      try {
        await handleBillingPeriodReset(record.organizationId)
        successCount++
        
        console.log(`[cron] ✅ Reset billing period for org: ${record.organizationId}`)
      } catch (error) {
        errorCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        console.error(`[cron] ❌ Failed to reset org ${record.organizationId}:`, error)
        
        errors.push({
          organizationId: record.organizationId,
          error: errorMessage,
        })
      }
    }

    // 4. Return summary
    const summary = {
      success: true,
      processed: expiredUsageRecords.length,
      successCount,
      errorCount,
      timestamp: now.toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log('[cron] Billing period reset job completed:', summary)

    // 5. If there were errors, return 207 Multi-Status
    if (errorCount > 0) {
      return NextResponse.json(summary, { status: 207 })
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('[cron] Fatal error in billing period reset:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering by admins
export async function POST(req: NextRequest) {
  return GET(req)
}

