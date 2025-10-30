#!/usr/bin/env tsx
/**
 * Fix Plan/Tier Mismatches
 * 
 * Finds and fixes organizations where plan and subscriptionTier don't match
 * This happens when data gets out of sync during migrations or manual updates
 * 
 * Usage:
 *   pnpm tsx scripts/fix-plan-tier-mismatches.ts [--dry-run] [--fix]
 * 
 * Examples:
 *   pnpm tsx scripts/fix-plan-tier-mismatches.ts --dry-run  # Preview changes
 *   pnpm tsx scripts/fix-plan-tier-mismatches.ts --fix       # Apply fixes
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  console.error('\n💡 Run: vercel env pull .env.local')
  process.exit(1)
}

import { db } from '../lib/db'
import { organizations } from '../lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { mapPlanToLegacyTier } from '../lib/billing/plan-entitlements'

/**
 * Expected mapping:
 * plan: free/starter → tier: starter
 * plan: solo/core → tier: core
 * plan: pro → tier: pro
 * plan: team → tier: team
 * plan: enterprise → tier: enterprise
 * plan: admin → tier: admin
 */
function isPlanTierMismatch(plan: string, tier: string): boolean {
  const expectedTier = mapPlanToLegacyTier(plan)
  return tier !== expectedTier
}

async function findMismatches() {
  console.log('\n🔍 Scanning organizations for plan/tier mismatches...\n')

  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      tier: organizations.subscriptionTier,
    })
    .from(organizations)

  const mismatches = allOrgs.filter(org => 
    isPlanTierMismatch(org.plan || '', org.tier || '')
  )

  if (mismatches.length === 0) {
    console.log('✅ No mismatches found! All plans and tiers are in sync.')
    return []
  }

  console.log(`⚠️  Found ${mismatches.length} mismatch(es):\n`)

  mismatches.forEach((org, idx) => {
    const expectedTier = mapPlanToLegacyTier(org.plan || '')
    console.log(`${idx + 1}. ${org.name} (${org.slug})`)
    console.log(`   Current:  plan="${org.plan}", tier="${org.tier}"`)
    console.log(`   Expected: plan="${org.plan}", tier="${expectedTier}"`)
    console.log(`   Action:   Update tier from "${org.tier}" → "${expectedTier}"`)
    console.log('')
  })

  return mismatches
}

async function fixMismatches(mismatches: Array<{ id: string; plan: string; tier: string }>) {
  console.log(`\n🔧 Fixing ${mismatches.length} mismatch(es)...\n`)

  let fixed = 0
  let errors = 0

  for (const org of mismatches) {
    const expectedTier = mapPlanToLegacyTier(org.plan || '')
    
    try {
      await db
        .update(organizations)
        .set({
          subscriptionTier: expectedTier as any,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, org.id))

      console.log(`✅ Fixed: ${org.name} - tier updated from "${org.tier}" → "${expectedTier}"`)
      fixed++
    } catch (error: any) {
      console.error(`❌ Error fixing ${org.name}: ${error.message}`)
      errors++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Fixed: ${fixed}`)
  console.log(`   Errors: ${errors}`)
  
  if (fixed > 0) {
    console.log(`\n✅ All mismatches have been corrected!`)
    console.log(`   Plan and tier fields are now in sync.`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const shouldFix = args.includes('--fix')

  if (!dryRun && !shouldFix) {
    console.error('Usage: pnpm tsx scripts/fix-plan-tier-mismatches.ts [--dry-run] [--fix]')
    console.error('\nOptions:')
    console.error('  --dry-run    Preview mismatches without fixing')
    console.error('  --fix        Actually fix the mismatches')
    console.error('\nExample:')
    console.error('  pnpm tsx scripts/fix-plan-tier-mismatches.ts --dry-run')
    console.error('  pnpm tsx scripts/fix-plan-tier-mismatches.ts --fix')
    process.exit(1)
  }

  try {
    const mismatches = await findMismatches()

    if (mismatches.length > 0 && shouldFix) {
      await fixMismatches(mismatches)
    } else if (mismatches.length > 0 && dryRun) {
      console.log('\n💡 Run with --fix to apply these changes')
    }

    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

