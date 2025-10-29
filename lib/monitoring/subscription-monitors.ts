/**
 * Subscription Monitoring & Alerting System
 * 
 * Detects anomalies and issues with subscriptions and usage.
 * Generates alerts that can be sent via email/Slack.
 * 
 * Monitors:
 * - Zero usage anomalies (active subscription, no usage)
 * - Negative balances (usage exceeds limit significantly)
 * - Stale subscriptions (no Stripe sync in days)
 * - Orphaned usage records (no valid organization)
 * - Expired grace periods
 * - Reservation leaks
 */

import { db, generateId } from '@/lib/db'
import {
  organizations,
  workspaceUsage,
  subscriptionAlerts,
  tokenReservations,
  stripeWebhookLogs,
} from '@/lib/db/schema'
import { eq, and, lt, gt, gte, isNull, sql } from 'drizzle-orm'

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | 'zero_usage'
  | 'negative_balance'
  | 'stale_subscription'
  | 'orphaned_usage'
  | 'expired_grace_period'
  | 'reservation_leak'
  | 'webhook_failures'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface Alert {
  type: AlertType
  severity: AlertSeverity
  organizationId?: string
  message: string
  metadata: Record<string, any>
}

export interface MonitoringReport {
  timestamp: Date
  alerts: Alert[]
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect organizations with active subscriptions but zero usage for 30+ days
 * 
 * This could indicate:
 * - Inactive customers (opportunity to downgrade)
 * - Tracking bugs
 * - Abandoned accounts
 */
export async function detectZeroUsageAnomalies(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  try {
    // Get active subscriptions with zero usage in current period
    const results = await db
      .select({
        org: organizations,
        usage: workspaceUsage,
      })
      .from(organizations)
      .leftJoin(
        workspaceUsage,
        eq(workspaceUsage.organizationId, organizations.id)
      )
      .where(
        and(
          eq(organizations.subscriptionStatus, 'active'),
          // Not free tier
          sql`${organizations.plan} != 'free'`,
          // Zero tokens used
          eq(workspaceUsage.tokensUsed, 0),
          // Usage record created more than 30 days ago
          lt(workspaceUsage.createdAt, thirtyDaysAgo)
        )
      )
    
    for (const row of results) {
      if (!row.org || !row.usage) continue
      
      alerts.push({
        type: 'zero_usage',
        severity: 'warning',
        organizationId: row.org.id,
        message: `Organization "${row.org.name}" has zero AI usage for 30+ days despite active subscription`,
        metadata: {
          organizationName: row.org.name,
          plan: row.org.plan,
          subscriptionStatus: row.org.subscriptionStatus,
          usageRecordAge: Math.floor(
            (Date.now() - row.usage.createdAt!.getTime()) / (24 * 60 * 60 * 1000)
          ),
        },
      })
    }
    
    if (alerts.length > 0) {
      console.log(`⚠️  Found ${alerts.length} zero usage anomalies`)
    }
  } catch (error) {
    console.error('Error detecting zero usage anomalies:', error)
  }
  
  return alerts
}

/**
 * Detect negative balances (usage exceeds limit by >10%)
 * 
 * This indicates a potential bug in limit enforcement
 */
export async function detectNegativeBalance(): Promise<Alert[]> {
  const alerts: Alert[] = []
  
  try {
    const results = await db
      .select()
      .from(workspaceUsage)
      .where(
        sql`${workspaceUsage.tokensUsed} > ${workspaceUsage.tokensLimit} * 1.1`
      )
    
    for (const usage of results) {
      const overage = usage.tokensUsed - usage.tokensLimit
      const overagePercent = ((overage / usage.tokensLimit) * 100).toFixed(1)
      
      // Get organization name
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, usage.organizationId))
        .limit(1)
      
      alerts.push({
        type: 'negative_balance',
        severity: 'critical',
        organizationId: usage.organizationId,
        message: `Organization "${org?.name || usage.organizationId}" has exceeded token limit by ${overagePercent}%`,
        metadata: {
          organizationName: org?.name,
          tokensUsed: usage.tokensUsed,
          tokensLimit: usage.tokensLimit,
          overage,
          overagePercent: parseFloat(overagePercent),
        },
      })
    }
    
    if (alerts.length > 0) {
      console.log(`🚨 CRITICAL: Found ${alerts.length} negative balance issues`)
    }
  } catch (error) {
    console.error('Error detecting negative balances:', error)
  }
  
  return alerts
}

/**
 * Detect stale subscriptions (no Stripe webhook in 7+ days)
 * 
 * This could indicate:
 * - Webhook delivery issues
 * - Stripe integration problems
 * - Manual subscription changes in Stripe dashboard
 */
export async function detectStaleSubscriptions(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  try {
    const results = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.subscriptionStatus, 'active'),
          // Has Stripe customer ID (paying customer)
          sql`${organizations.stripeCustomerId} IS NOT NULL`,
          // Last sync was more than 7 days ago OR never synced
          sql`(${organizations.lastStripeSync} < ${sevenDaysAgo} OR ${organizations.lastStripeSync} IS NULL)`
        )
      )
    
    for (const org of results) {
      const daysSinceSync = org.lastStripeSync
        ? Math.floor((Date.now() - org.lastStripeSync.getTime()) / (24 * 60 * 60 * 1000))
        : 999
      
      alerts.push({
        type: 'stale_subscription',
        severity: daysSinceSync > 14 ? 'error' : 'warning',
        organizationId: org.id,
        message: `Organization "${org.name}" has not synced with Stripe in ${daysSinceSync} days`,
        metadata: {
          organizationName: org.name,
          stripeCustomerId: org.stripeCustomerId,
          daysSinceSync,
          lastSyncAt: org.lastStripeSync?.toISOString(),
        },
      })
    }
    
    if (alerts.length > 0) {
      console.log(`⚠️  Found ${alerts.length} stale subscriptions`)
    }
  } catch (error) {
    console.error('Error detecting stale subscriptions:', error)
  }
  
  return alerts
}

/**
 * Detect orphaned usage records (no valid organization)
 * 
 * This indicates database inconsistency
 */
export async function detectOrphanedUsageRecords(): Promise<Alert[]> {
  const alerts: Alert[] = []
  
  try {
    const results = await db
      .select()
      .from(workspaceUsage)
      .leftJoin(organizations, eq(workspaceUsage.organizationId, organizations.id))
      .where(isNull(organizations.id))
    
    for (const row of results) {
      if (!row.workspace_usage) continue
      
      alerts.push({
        type: 'orphaned_usage',
        severity: 'error',
        organizationId: row.workspace_usage.organizationId,
        message: `Orphaned usage record found for non-existent organization ${row.workspace_usage.organizationId}`,
        metadata: {
          usageId: row.workspace_usage.id,
          tokensUsed: row.workspace_usage.tokensUsed,
          billingPeriod: row.workspace_usage.billingPeriodStart?.toISOString(),
        },
      })
    }
    
    if (alerts.length > 0) {
      console.log(`🚨 CRITICAL: Found ${alerts.length} orphaned usage records`)
    }
  } catch (error) {
    console.error('Error detecting orphaned usage records:', error)
  }
  
  return alerts
}

/**
 * Detect expired grace periods that haven't been handled
 */
export async function detectExpiredGracePeriods(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const now = new Date()
  
  try {
    const results = await db
      .select({
        usage: workspaceUsage,
        org: organizations,
      })
      .from(workspaceUsage)
      .leftJoin(organizations, eq(workspaceUsage.organizationId, organizations.id))
      .where(
        and(
          eq(workspaceUsage.gracePeriodActive, true),
          lt(workspaceUsage.gracePeriodExpiresAt, now)
        )
      )
    
    for (const row of results) {
      if (!row.usage || !row.org) continue
      
      const daysOverdue = Math.floor(
        (now.getTime() - row.usage.gracePeriodExpiresAt!.getTime()) / (24 * 60 * 60 * 1000)
      )
      
      alerts.push({
        type: 'expired_grace_period',
        severity: daysOverdue > 3 ? 'critical' : 'error',
        organizationId: row.org.id,
        message: `Grace period expired ${daysOverdue} days ago for organization "${row.org.name}" but not cancelled`,
        metadata: {
          organizationName: row.org.name,
          expiredAt: row.usage.gracePeriodExpiresAt?.toISOString(),
          daysOverdue,
        },
      })
    }
    
    if (alerts.length > 0) {
      console.log(`🚨 Found ${alerts.length} expired grace periods`)
    }
  } catch (error) {
    console.error('Error detecting expired grace periods:', error)
  }
  
  return alerts
}

/**
 * Detect token reservation leaks (reservations older than 10 minutes still in reserved state)
 */
export async function detectReservationLeaks(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  
  try {
    const results = await db
      .select()
      .from(tokenReservations)
      .where(
        and(
          eq(tokenReservations.status, 'reserved'),
          lt(tokenReservations.expiresAt, tenMinutesAgo)
        )
      )
    
    // Group by organization
    const byOrg: Record<string, typeof results> = {}
    for (const res of results) {
      if (!byOrg[res.organizationId]) {
        byOrg[res.organizationId] = []
      }
      byOrg[res.organizationId].push(res)
    }
    
    for (const [orgId, reservations] of Object.entries(byOrg)) {
      const totalLeaked = reservations.reduce((sum, r) => sum + r.estimatedTokens, 0)
      
      // Get org name
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)
      
      alerts.push({
        type: 'reservation_leak',
        severity: totalLeaked > 10000 ? 'error' : 'warning',
        organizationId: orgId,
        message: `${reservations.length} expired token reservations not cleaned up (${totalLeaked.toLocaleString()} tokens leaked)`,
        metadata: {
          organizationName: org?.name,
          reservationCount: reservations.length,
          tokensLeaked: totalLeaked,
          oldestReservation: Math.min(...reservations.map(r => r.expiresAt.getTime())),
        },
      })
    }
    
    if (alerts.length > 0) {
      console.log(`⚠️  Found ${alerts.length} reservation leaks`)
    }
  } catch (error) {
    console.error('Error detecting reservation leaks:', error)
  }
  
  return alerts
}

/**
 * Detect webhook processing failures
 */
export async function detectWebhookFailures(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  try {
    const results = await db
      .select()
      .from(stripeWebhookLogs)
      .where(
        and(
          eq(stripeWebhookLogs.status, 'failed'),
          gte(stripeWebhookLogs.createdAt, oneDayAgo)
        )
      )
    
    if (results.length > 0) {
      // Group by event type
      const byType: Record<string, number> = {}
      for (const log of results) {
        byType[log.eventType] = (byType[log.eventType] || 0) + 1
      }
      
      alerts.push({
        type: 'webhook_failures',
        severity: results.length > 10 ? 'critical' : 'error',
        message: `${results.length} webhook events failed in the last 24 hours`,
        metadata: {
          totalFailures: results.length,
          failuresByType: byType,
          recentErrors: results.slice(0, 5).map(r => ({
            eventId: r.eventId,
            eventType: r.eventType,
            error: r.errorMessage,
          })),
        },
      })
      
      console.log(`🚨 Found ${results.length} webhook failures in last 24 hours`)
    }
  } catch (error) {
    console.error('Error detecting webhook failures:', error)
  }
  
  return alerts
}

// ============================================================================
// MAIN MONITORING FUNCTION
// ============================================================================

/**
 * Run all monitoring checks and generate report
 */
export async function runMonitoring(): Promise<MonitoringReport> {
  console.log('🔍 Running subscription monitoring checks...\n')
  
  const allAlerts: Alert[] = []
  
  // Run all detectors in parallel
  const [
    zeroUsage,
    negativeBalance,
    staleSubscriptions,
    orphanedUsage,
    expiredGracePeriods,
    reservationLeaks,
    webhookFailures,
  ] = await Promise.all([
    detectZeroUsageAnomalies(),
    detectNegativeBalance(),
    detectStaleSubscriptions(),
    detectOrphanedUsageRecords(),
    detectExpiredGracePeriods(),
    detectReservationLeaks(),
    detectWebhookFailures(),
  ])
  
  allAlerts.push(
    ...zeroUsage,
    ...negativeBalance,
    ...staleSubscriptions,
    ...orphanedUsage,
    ...expiredGracePeriods,
    ...reservationLeaks,
    ...webhookFailures
  )
  
  // Categorize by severity
  const summary = {
    critical: allAlerts.filter(a => a.severity === 'critical').length,
    error: allAlerts.filter(a => a.severity === 'error').length,
    warning: allAlerts.filter(a => a.severity === 'warning').length,
    info: allAlerts.filter(a => a.severity === 'info').length,
  }
  
  // Store alerts in database
  for (const alert of allAlerts) {
    await storeAlert(alert)
  }
  
  const report: MonitoringReport = {
    timestamp: new Date(),
    alerts: allAlerts,
    summary,
  }
  
  printMonitoringReport(report)
  
  return report
}

/**
 * Store alert in database
 */
async function storeAlert(alert: Alert): Promise<void> {
  try {
    await db.insert(subscriptionAlerts).values({
      id: generateId(),
      organizationId: alert.organizationId || null,
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata,
      status: 'open',
    })
  } catch (error) {
    console.error('Failed to store alert:', error)
  }
}

/**
 * Print monitoring report
 */
function printMonitoringReport(report: MonitoringReport): void {
  console.log('\n' + '='.repeat(80))
  console.log('MONITORING REPORT')
  console.log('='.repeat(80))
  console.log(`Timestamp: ${report.timestamp.toISOString()}`)
  console.log('')
  console.log('Summary:')
  console.log(`  🔴 Critical: ${report.summary.critical}`)
  console.log(`  🟠 Error:    ${report.summary.error}`)
  console.log(`  🟡 Warning:  ${report.summary.warning}`)
  console.log(`  ℹ️  Info:     ${report.summary.info}`)
  console.log('')
  console.log(`Total Alerts: ${report.alerts.length}`)
  console.log('='.repeat(80))
  
  if (report.summary.critical > 0) {
    console.log('\n🚨 CRITICAL ALERTS:')
    report.alerts
      .filter(a => a.severity === 'critical')
      .forEach(a => {
        console.log(`\n  ${a.type.toUpperCase()}`)
        console.log(`  ${a.message}`)
      })
  }
  
  if (report.summary.error > 0) {
    console.log('\n🔴 ERROR ALERTS:')
    report.alerts
      .filter(a => a.severity === 'error')
      .forEach(a => {
        console.log(`\n  ${a.type.toUpperCase()}`)
        console.log(`  ${a.message}`)
      })
  }
  
  console.log('')
}

/**
 * Send alert notifications (email/Slack)
 */
export async function sendAlertNotifications(report: MonitoringReport): Promise<void> {
  // Only send if there are critical or error alerts
  if (report.summary.critical === 0 && report.summary.error === 0) {
    return
  }
  
  console.log('📧 Sending alert notifications...')
  
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // TODO: Integrate with Slack webhook
  
  // For now, just log
  console.log('Alert notification would be sent here')
}

