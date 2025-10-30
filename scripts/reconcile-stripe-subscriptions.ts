/**
 * Stripe Subscription Reconciliation Script
 * 
 * Compares local database subscription state with Stripe's source of truth.
 * Detects and optionally fixes discrepancies.
 * 
 * Usage:
 *   npm run reconcile                    # Dry run (report only)
 *   npm run reconcile -- --fix           # Auto-fix discrepancies
 *   npm run reconcile -- --org <orgId>   # Check specific org
 * 
 * Exit codes:
 *   0 = No mismatches found
 *   1 = Mismatches found (dry run)
 *   2 = Error during reconciliation
 */

import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'
import { stripe } from '@/lib/stripe/stripe-client'
import Stripe from 'stripe'
import { transitionSubscriptionStatus } from '@/lib/services/subscription.service'

// ============================================================================
// TYPES
// ============================================================================

interface ReconciliationMismatch {
  organizationId: string
  organizationName: string
  stripeCustomerId: string
  localStatus: string
  stripeStatus: string
  localPlan: string
  stripePlan: string
  action: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface ReconciliationReport {
  totalOrganizations: number
  organizationsChecked: number
  mismatchesFound: number
  mismatches: ReconciliationMismatch[]
  errors: Array<{ organizationId: string; error: string }>
  fixesApplied: number
}

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

const args = process.argv.slice(2)
const dryRun = !args.includes('--fix')
const specificOrgId = args.find(arg => !arg.startsWith('--'))
const verbose = args.includes('--verbose')

// ============================================================================
// MAIN RECONCILIATION LOGIC
// ============================================================================

async function reconcileSubscriptions(): Promise<ReconciliationReport> {
  console.log('='.repeat(80))
  console.log('STRIPE SUBSCRIPTION RECONCILIATION')
  console.log('='.repeat(80))
  console.log(`Mode: ${dryRun ? 'DRY RUN (report only)' : 'FIX MODE (auto-fix enabled)'}`)
  console.log('='.repeat(80))
  console.log('')
  
  const report: ReconciliationReport = {
    totalOrganizations: 0,
    organizationsChecked: 0,
    mismatchesFound: 0,
    mismatches: [],
    errors: [],
    fixesApplied: 0,
  }
  
  try {
    // Get all organizations with Stripe customer IDs
    // Get organizations with Stripe customers
    const orgs = specificOrgId 
      ? await db
          .select()
          .from(organizations)
          .where(
            and(
              isNotNull(organizations.stripeCustomerId),
              eq(organizations.id, specificOrgId)
            )
          )
      : await db
          .select()
          .from(organizations)
          .where(isNotNull(organizations.stripeCustomerId))
    
    if (specificOrgId) {
      console.log(`Checking specific organization: ${specificOrgId}\n`)
    }
    
    report.totalOrganizations = orgs.length
    console.log(`Found ${orgs.length} organizations with Stripe customers\n`)
    
    // Check each organization
    for (const org of orgs) {
      try {
        await checkOrganization(org, report)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        report.errors.push({
          organizationId: org.id,
          error: errorMsg,
        })
        console.error(`❌ Error checking org ${org.id}:`, errorMsg)
      }
    }
    
    // Print summary
    printReport(report)
    
    return report
  } catch (error) {
    console.error('Fatal error during reconciliation:', error)
    throw error
  }
}

/**
 * Check a single organization for mismatches
 */
async function checkOrganization(
  org: typeof organizations.$inferSelect,
  report: ReconciliationReport
): Promise<void> {
  report.organizationsChecked++
  
  if (verbose) {
    console.log(`Checking: ${org.name} (${org.id})`)
  }
  
  // Fetch Stripe subscription
  let stripeSubscription: Stripe.Subscription | null = null
  
  try {
    if (org.stripeSubscriptionId) {
      stripeSubscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
    } else {
      // Try to find subscription by customer
      const subscriptions = await stripe.subscriptions.list({
        customer: org.stripeCustomerId!,
        limit: 1,
      })
      
      if (subscriptions.data.length > 0) {
        stripeSubscription = subscriptions.data[0]
      }
    }
  } catch (error: any) {
    if (error.statusCode === 404) {
      // Subscription not found in Stripe
      if (org.subscriptionStatus === 'active') {
        const mismatch: ReconciliationMismatch = {
          organizationId: org.id,
          organizationName: org.name,
          stripeCustomerId: org.stripeCustomerId!,
          localStatus: org.subscriptionStatus || 'unknown',
          stripeStatus: 'not_found',
          localPlan: org.plan || 'unknown',
          stripePlan: 'none',
          action: 'Set local status to canceled',
          severity: 'high',
        }
        
        report.mismatches.push(mismatch)
        report.mismatchesFound++
        
        console.log(`⚠️  MISMATCH: ${org.name}`)
        console.log(`   Local: ${mismatch.localStatus} | Stripe: ${mismatch.stripeStatus}`)
        
        if (!dryRun) {
          await fixMismatch(mismatch)
          report.fixesApplied++
        }
      }
      return
    }
    
    throw error
  }
  
  if (!stripeSubscription) {
    // No subscription in Stripe - should be inactive/canceled locally
    if (org.subscriptionStatus === 'active') {
      const mismatch: ReconciliationMismatch = {
        organizationId: org.id,
        organizationName: org.name,
        stripeCustomerId: org.stripeCustomerId!,
        localStatus: org.subscriptionStatus || 'unknown',
        stripeStatus: 'none',
        localPlan: org.plan || 'unknown',
        stripePlan: 'none',
        action: 'Set local status to inactive',
        severity: 'medium',
      }
      
      report.mismatches.push(mismatch)
      report.mismatchesFound++
      
      console.log(`⚠️  MISMATCH: ${org.name}`)
      console.log(`   Local: ${mismatch.localStatus} | Stripe: ${mismatch.stripeStatus}`)
      
      if (!dryRun) {
        await fixMismatch(mismatch)
        report.fixesApplied++
      }
    }
    
    return
  }
  
  // Compare statuses
  const stripeStatus = stripeSubscription.status
  const localStatus = org.subscriptionStatus || 'unknown'
  
  const statusMismatch = !statusesMatch(localStatus, stripeStatus)
  
  if (statusMismatch) {
    const mismatch: ReconciliationMismatch = {
      organizationId: org.id,
      organizationName: org.name,
      stripeCustomerId: org.stripeCustomerId!,
      localStatus,
      stripeStatus,
      localPlan: org.plan || 'unknown',
      stripePlan: stripeSubscription.items.data[0]?.price.id || 'unknown',
      action: `Update local status from ${localStatus} to ${stripeStatus}`,
      severity: getSeverity(localStatus, stripeStatus),
    }
    
    report.mismatches.push(mismatch)
    report.mismatchesFound++
    
    console.log(`⚠️  MISMATCH: ${org.name}`)
    console.log(`   Local: ${localStatus} | Stripe: ${stripeStatus}`)
    
    if (!dryRun) {
      await fixMismatch(mismatch)
      report.fixesApplied++
    }
  } else if (verbose) {
    console.log(`✓ ${org.name}: Status matches (${localStatus})`)
  }
}

/**
 * Check if local and Stripe statuses match
 */
function statusesMatch(local: string, stripe: string): boolean {
  // Exact match
  if (local === stripe) return true
  
  // Map equivalent statuses
  const equivalents: Record<string, string[]> = {
    'active': ['active', 'trialing'],
    'trialing': ['active', 'trialing'],
    'inactive': ['canceled', 'incomplete', 'incomplete_expired', 'unpaid'],
    'canceled': ['canceled', 'incomplete', 'incomplete_expired', 'unpaid'],
    'past_due': ['past_due'],
  }
  
  return equivalents[local]?.includes(stripe) || false
}

/**
 * Determine severity of mismatch
 */
function getSeverity(local: string, stripe: string): 'low' | 'medium' | 'high' | 'critical' {
  // Critical: Local says active but Stripe says canceled
  if (local === 'active' && (stripe === 'canceled' || stripe === 'unpaid')) {
    return 'critical'
  }
  
  // High: Major status difference
  if ((local === 'active' && stripe !== 'active' && stripe !== 'trialing') ||
      (local !== 'active' && local !== 'canceled' && stripe === 'active')) {
    return 'high'
  }
  
  // Medium: Moderate differences
  if (local !== stripe) {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Apply fix for a mismatch
 */
async function fixMismatch(mismatch: ReconciliationMismatch): Promise<void> {
  try {
    let newStatus: any = mismatch.stripeStatus
    
    // Map Stripe statuses to our local statuses
    if (newStatus === 'incomplete' || newStatus === 'incomplete_expired' || newStatus === 'unpaid') {
      newStatus = 'canceled'
    }
    
    if (newStatus === 'trialing') {
      newStatus = 'trialing'
    }
    
    await transitionSubscriptionStatus(
      mismatch.organizationId,
      newStatus,
      'stripe_reconciliation',
      'system'
    )
    
    console.log(`   ✅ Fixed: Updated to ${newStatus}`)
  } catch (error) {
    console.error(`   ❌ Failed to fix:`, error)
    throw error
  }
}

/**
 * Print reconciliation report
 */
function printReport(report: ReconciliationReport): void {
  console.log('')
  console.log('='.repeat(80))
  console.log('RECONCILIATION REPORT')
  console.log('='.repeat(80))
  console.log('')
  console.log(`Total Organizations:     ${report.totalOrganizations}`)
  console.log(`Organizations Checked:   ${report.organizationsChecked}`)
  console.log(`Mismatches Found:        ${report.mismatchesFound}`)
  console.log(`Errors:                  ${report.errors.length}`)
  
  if (!dryRun) {
    console.log(`Fixes Applied:           ${report.fixesApplied}`)
  }
  
  console.log('')
  
  if (report.mismatchesFound > 0) {
    console.log('MISMATCHES BY SEVERITY:')
    console.log('')
    
    const bySeverity = {
      critical: report.mismatches.filter(m => m.severity === 'critical'),
      high: report.mismatches.filter(m => m.severity === 'high'),
      medium: report.mismatches.filter(m => m.severity === 'medium'),
      low: report.mismatches.filter(m => m.severity === 'low'),
    }
    
    if (bySeverity.critical.length > 0) {
      console.log(`🔴 CRITICAL (${bySeverity.critical.length}):`)
      bySeverity.critical.forEach(m => {
        console.log(`   ${m.organizationName} (${m.organizationId})`)
        console.log(`   Local: ${m.localStatus} | Stripe: ${m.stripeStatus}`)
        console.log(`   Action: ${m.action}`)
        console.log('')
      })
    }
    
    if (bySeverity.high.length > 0) {
      console.log(`🟠 HIGH (${bySeverity.high.length}):`)
      bySeverity.high.forEach(m => {
        console.log(`   ${m.organizationName}: ${m.localStatus} → ${m.stripeStatus}`)
      })
      console.log('')
    }
    
    if (bySeverity.medium.length > 0) {
      console.log(`🟡 MEDIUM (${bySeverity.medium.length}):`)
      bySeverity.medium.forEach(m => {
        console.log(`   ${m.organizationName}: ${m.localStatus} → ${m.stripeStatus}`)
      })
      console.log('')
    }
    
    if (bySeverity.low.length > 0) {
      console.log(`🟢 LOW (${bySeverity.low.length}):`)
      bySeverity.low.forEach(m => {
        console.log(`   ${m.organizationName}: ${m.localStatus} → ${m.stripeStatus}`)
      })
      console.log('')
    }
  }
  
  if (report.errors.length > 0) {
    console.log('ERRORS:')
    console.log('')
    report.errors.forEach(e => {
      console.log(`   ${e.organizationId}: ${e.error}`)
    })
    console.log('')
  }
  
  console.log('='.repeat(80))
  
  if (dryRun && report.mismatchesFound > 0) {
    console.log('')
    console.log('💡 Run with --fix flag to automatically fix mismatches')
    console.log('   Example: npm run reconcile -- --fix')
    console.log('')
  }
  
  if (!dryRun && report.fixesApplied > 0) {
    console.log('')
    console.log(`✅ Applied ${report.fixesApplied} fixes`)
    console.log('')
  }
  
  if (report.mismatchesFound === 0 && report.errors.length === 0) {
    console.log('')
    console.log('✅ All subscriptions are in sync!')
    console.log('')
  }
}

// ============================================================================
// EXPORT FUNCTION FOR API USE
// ============================================================================

export async function runReconciliation(
  organizationId?: string,
  autoFix: boolean = false
): Promise<ReconciliationReport> {
  // TODO: Implement for API/cron use
  return {
    totalOrganizations: 0,
    organizationsChecked: 0,
    mismatchesFound: 0,
    mismatches: [],
    errors: [],
    fixesApplied: 0,
  }
}

// ============================================================================
// RUN SCRIPT
// ============================================================================

if (require.main === module) {
  reconcileSubscriptions()
    .then((report) => {
      if (report.mismatchesFound > 0 && dryRun) {
        process.exit(1) // Mismatches found in dry run
      }
      
      if (report.errors.length > 0) {
        process.exit(2) // Errors occurred
      }
      
      process.exit(0) // Success
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error)
      process.exit(2)
    })
}

