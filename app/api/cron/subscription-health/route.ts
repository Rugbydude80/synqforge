/**
 * Subscription Health Cron Job
 * 
 * Runs periodic maintenance and monitoring tasks:
 * - Expire old token reservations
 * - Enforce grace periods
 * - Run monitoring checks
 * - Send alert notifications
 * 
 * Schedule: Every hour
 * Vercel Cron: 0 * * * * (every hour at :00)
 */

import { NextRequest, NextResponse } from 'next/server'
import { expireOldReservations } from '@/lib/services/token-reservation.service'
import { enforceGracePeriods } from '@/lib/services/subscription.service'
import { runMonitoring, sendAlertNotifications } from '@/lib/monitoring/subscription-monitors'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  
  if (!cronSecret) {
    console.warn('⚠️  CRON_SECRET not set - cron endpoint is unprotected!')
    return true // Allow in development
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  console.log('🔄 Starting subscription health cron job...')
  
  // Verify authorization
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const startTime = Date.now()
  const results = {
    reservationsExpired: 0,
    gracePeriodsEnforced: { expired: 0, remindersSent: 0 },
    monitoringAlerts: 0,
    notificationsSent: false,
    duration: 0,
    errors: [] as string[],
  }
  
  try {
    // 1. Expire old token reservations
    console.log('⏰ Expiring old reservations...')
    try {
      results.reservationsExpired = await expireOldReservations()
    } catch (error) {
      const errorMsg = `Failed to expire reservations: ${error}`
      console.error(errorMsg)
      results.errors.push(errorMsg)
    }
    
    // 2. Enforce grace periods
    console.log('🔔 Enforcing grace periods...')
    try {
      results.gracePeriodsEnforced = await enforceGracePeriods()
    } catch (error) {
      const errorMsg = `Failed to enforce grace periods: ${error}`
      console.error(errorMsg)
      results.errors.push(errorMsg)
    }
    
    // 3. Run monitoring checks (only on the hour)
    const currentHour = new Date().getHours()
    if (currentHour % 6 === 0) { // Run every 6 hours
      console.log('🔍 Running monitoring checks...')
      try {
        const report = await runMonitoring()
        results.monitoringAlerts = report.alerts.length
        
        // Send notifications if critical/error alerts found
        if (report.summary.critical > 0 || report.summary.error > 0) {
          await sendAlertNotifications(report)
          results.notificationsSent = true
        }
      } catch (error) {
        const errorMsg = `Failed to run monitoring: ${error}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }
    
    results.duration = Date.now() - startTime
    
    console.log('✅ Subscription health cron job completed:', results)
    
    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('❌ Subscription health cron job failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export const POST = GET

