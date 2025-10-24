#!/usr/bin/env ts-node
/**
 * Check Usage CLI Utility
 * Admin tool to check AI action usage for users and organizations
 * 
 * Usage:
 *   ts-node scripts/check_usage.ts --user <userId>
 *   ts-node scripts/check_usage.ts --org <organizationId>
 *   ts-node scripts/check_usage.ts --org <organizationId> --detailed
 */

import { db } from '../lib/db'
import { tokenAllowances, addOnPurchases, tokensLedger, users, organizations } from '../lib/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'

interface UsageStats {
  userId?: string
  userName?: string
  organizationId: string
  organizationName: string
  tier: string
  
  // Allowances
  baseAllowance: number
  rolloverCredits: number
  addonCredits: number
  aiActionsBonus: number
  totalCredits: number
  
  // Usage
  creditsUsed: number
  creditsRemaining: number
  usagePercent: number
  
  // Period
  periodStart: Date
  periodEnd: Date
  
  // Add-ons
  activeAddons: number
  addonsDetails?: any[]
  
  // Recent activity
  recentTransactions?: any[]
}

async function checkUserUsage(userId: string, detailed: boolean = false): Promise<UsageStats | null> {
  try {
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      console.error(`User not found: ${userId}`)
      return null
    }

    // Get allowance
    const [allowance] = await db
      .select()
      .from(tokenAllowances)
      .where(eq(tokenAllowances.userId, userId))
      .limit(1)

    if (!allowance) {
      console.error(`No allowance found for user: ${userId}`)
      return null
    }

    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, allowance.organizationId))
      .limit(1)

    if (!org) {
      console.error(`Organization not found: ${allowance.organizationId}`)
      return null
    }

    // Get active add-ons
    const now = new Date()
    const addons = await db
      .select()
      .from(addOnPurchases)
      .where(
        and(
          eq(addOnPurchases.userId, userId),
          eq(addOnPurchases.organizationId, allowance.organizationId),
          eq(addOnPurchases.status, 'active'),
          gte(addOnPurchases.expiresAt, now)
        )
      )

    const totalCredits = allowance.baseAllowance + allowance.rolloverCredits + allowance.addonCredits + allowance.aiActionsBonus
    const usagePercent = totalCredits > 0 ? (allowance.creditsUsed / totalCredits) * 100 : 0

    const stats: UsageStats = {
      userId: user.id,
      userName: user.name || user.email || 'Unknown',
      organizationId: org.id,
      organizationName: org.name,
      tier: org.subscriptionTier || 'starter',
      
      baseAllowance: allowance.baseAllowance,
      rolloverCredits: allowance.rolloverCredits,
      addonCredits: allowance.addonCredits,
      aiActionsBonus: allowance.aiActionsBonus,
      totalCredits,
      
      creditsUsed: allowance.creditsUsed,
      creditsRemaining: allowance.creditsRemaining,
      usagePercent: Math.round(usagePercent * 100) / 100,
      
      periodStart: allowance.billingPeriodStart,
      periodEnd: allowance.billingPeriodEnd,
      
      activeAddons: addons.length
    }

    if (detailed) {
      stats.addonsDetails = addons.map(addon => ({
        id: addon.id,
        type: addon.addonType,
        name: addon.addonName,
        creditsGranted: addon.creditsGranted,
        creditsUsed: addon.creditsUsed,
        creditsRemaining: addon.creditsRemaining,
        expiresAt: addon.expiresAt,
        recurring: addon.recurring
      }))

      // Get recent transactions
      const transactions = await db
        .select()
        .from(tokensLedger)
        .where(eq(tokensLedger.userId, userId))
        .orderBy(desc(tokensLedger.createdAt))
        .limit(10)

      stats.recentTransactions = transactions.map(tx => ({
        id: tx.id,
        operationType: tx.operationType,
        tokensDeducted: tx.tokensDeducted,
        source: tx.source,
        timestamp: tx.createdAt
      }))
    }

    return stats
  } catch (error) {
    console.error('Error checking user usage:', error)
    return null
  }
}

async function checkOrgUsage(organizationId: string, detailed: boolean = false): Promise<UsageStats[]> {
  try {
    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      console.error(`Organization not found: ${organizationId}`)
      return []
    }

    // Get all allowances for the org
    const allowances = await db
      .select()
      .from(tokenAllowances)
      .where(eq(tokenAllowances.organizationId, organizationId))

    const stats: UsageStats[] = []

    for (const allowance of allowances) {
      if (!allowance.userId) continue

      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, allowance.userId))
        .limit(1)

      // Get active add-ons
      const now = new Date()
      const addons = await db
        .select()
        .from(addOnPurchases)
        .where(
          and(
            eq(addOnPurchases.userId, allowance.userId),
            eq(addOnPurchases.organizationId, organizationId),
            eq(addOnPurchases.status, 'active'),
            gte(addOnPurchases.expiresAt, now)
          )
        )

      const totalCredits = allowance.baseAllowance + allowance.rolloverCredits + allowance.addonCredits + allowance.aiActionsBonus
      const usagePercent = totalCredits > 0 ? (allowance.creditsUsed / totalCredits) * 100 : 0

      const userStats: UsageStats = {
        userId: allowance.userId,
        userName: user?.name || user?.email || 'Unknown',
        organizationId: org.id,
        organizationName: org.name,
        tier: org.subscriptionTier || 'starter',
        
        baseAllowance: allowance.baseAllowance,
        rolloverCredits: allowance.rolloverCredits,
        addonCredits: allowance.addonCredits,
        aiActionsBonus: allowance.aiActionsBonus,
        totalCredits,
        
        creditsUsed: allowance.creditsUsed,
        creditsRemaining: allowance.creditsRemaining,
        usagePercent: Math.round(usagePercent * 100) / 100,
        
        periodStart: allowance.billingPeriodStart,
        periodEnd: allowance.billingPeriodEnd,
        
        activeAddons: addons.length
      }

      if (detailed) {
        userStats.addonsDetails = addons.map(addon => ({
          id: addon.id,
          type: addon.addonType,
          name: addon.addonName,
          creditsGranted: addon.creditsGranted,
          creditsUsed: addon.creditsUsed,
          creditsRemaining: addon.creditsRemaining,
          expiresAt: addon.expiresAt,
          recurring: addon.recurring
        }))

        // Get recent transactions
        const transactions = await db
          .select()
          .from(tokensLedger)
          .where(eq(tokensLedger.userId, allowance.userId))
          .orderBy(desc(tokensLedger.createdAt))
          .limit(5)

        userStats.recentTransactions = transactions.map(tx => ({
          id: tx.id,
          operationType: tx.operationType,
          creditsConsumed: tx.tokensDeducted,
          status: tx.source,
          timestamp: tx.createdAt
        }))
      }

      stats.push(userStats)
    }

    return stats
  } catch (error) {
    console.error('Error checking org usage:', error)
    return []
  }
}

function printUsageStats(stats: UsageStats | UsageStats[]) {
  const statsList = Array.isArray(stats) ? stats : [stats]

  console.log('\n════════════════════════════════════════════════════════════════════════════════')
  console.log('  AI ACTIONS USAGE REPORT')
  console.log('════════════════════════════════════════════════════════════════════════════════\n')

  for (const stat of statsList) {
    console.log(`User: ${stat.userName} (${stat.userId})`)
    console.log(`Organization: ${stat.organizationName} (${stat.organizationId})`)
    console.log(`Tier: ${stat.tier.toUpperCase()}`)
    console.log('')
    
    console.log('Allowances:')
    console.log(`  Base:     ${stat.baseAllowance.toLocaleString()} credits`)
    console.log(`  Rollover: ${stat.rolloverCredits.toLocaleString()} credits`)
    console.log(`  Add-ons:  ${stat.addonCredits.toLocaleString()} credits`)
    console.log(`  Bonus:    ${stat.aiActionsBonus.toLocaleString()} credits`)
    console.log(`  ─────────────────────────────`)
    console.log(`  Total:    ${stat.totalCredits.toLocaleString()} credits`)
    console.log('')
    
    console.log('Usage:')
    console.log(`  Used:      ${stat.creditsUsed.toLocaleString()} credits`)
    console.log(`  Remaining: ${stat.creditsRemaining.toLocaleString()} credits`)
    console.log(`  Usage:     ${stat.usagePercent}%`)
    console.log('')
    
    console.log('Billing Period:')
    console.log(`  Start: ${stat.periodStart.toISOString().split('T')[0]}`)
    console.log(`  End:   ${stat.periodEnd.toISOString().split('T')[0]}`)
    console.log('')
    
    console.log(`Active Add-ons: ${stat.activeAddons}`)
    
    if (stat.addonsDetails && stat.addonsDetails.length > 0) {
      console.log('')
      console.log('Add-on Details:')
      for (const addon of stat.addonsDetails) {
        console.log(`  • ${addon.name} (${addon.type})`)
        console.log(`    Granted: ${addon.creditsGranted}, Used: ${addon.creditsUsed}, Remaining: ${addon.creditsRemaining}`)
        console.log(`    Expires: ${addon.expiresAt?.toISOString().split('T')[0] || 'Never'}`)
      }
    }
    
    if (stat.recentTransactions && stat.recentTransactions.length > 0) {
      console.log('')
      console.log('Recent Transactions:')
      for (const tx of stat.recentTransactions) {
        console.log(`  • ${tx.operationType} - ${tx.tokensDeducted} credits (${tx.status})`)
        console.log(`    ${tx.createdAt.toISOString()}`)
      }
    }
    
    console.log('')
    console.log('────────────────────────────────────────────────────────────────────────────────')
    console.log('')
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  let userId: string | undefined
  let organizationId: string | undefined
  let detailed = false

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user' && args[i + 1]) {
      userId = args[i + 1]
      i++
    } else if (args[i] === '--org' && args[i + 1]) {
      organizationId = args[i + 1]
      i++
    } else if (args[i] === '--detailed' || args[i] === '-d') {
      detailed = true
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: ts-node scripts/check_usage.ts [OPTIONS]

Check AI action usage for users and organizations.

OPTIONS:
  --user <id>       Check usage for a specific user
  --org <id>        Check usage for all users in an organization
  --detailed, -d    Show detailed information (add-ons, transactions)
  --help, -h        Show this help message

EXAMPLES:
  ts-node scripts/check_usage.ts --user abc123
  ts-node scripts/check_usage.ts --org org456 --detailed
  ts-node scripts/check_usage.ts --user abc123 -d
      `)
      process.exit(0)
    }
  }

  if (!userId && !organizationId) {
    console.error('Error: Must provide --user or --org')
    console.log('Use --help for usage information')
    process.exit(1)
  }

  try {
    if (userId) {
      const stats = await checkUserUsage(userId, detailed)
      if (stats) {
        printUsageStats(stats)
      }
    } else if (organizationId) {
      const stats = await checkOrgUsage(organizationId, detailed)
      if (stats.length > 0) {
        printUsageStats(stats)
        
        // Print summary
        const totalUsed = stats.reduce((sum, s) => sum + s.creditsUsed, 0)
        const totalRemaining = stats.reduce((sum, s) => sum + s.creditsRemaining, 0)
        const totalCredits = stats.reduce((sum, s) => sum + s.totalCredits, 0)
        
        console.log('Organization Summary:')
        console.log(`  Total Users:   ${stats.length}`)
        console.log(`  Total Credits: ${totalCredits.toLocaleString()}`)
        console.log(`  Total Used:    ${totalUsed.toLocaleString()}`)
        console.log(`  Total Remaining: ${totalRemaining.toLocaleString()}`)
        console.log(`  Overall Usage: ${totalCredits > 0 ? Math.round((totalUsed / totalCredits) * 100) : 0}%`)
        console.log('')
      } else {
        console.log('No usage data found for organization')
      }
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()

