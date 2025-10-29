/**
 * Sync existing AI generations with usage metering
 */

import { db } from '@/lib/db'
import { aiUsageMetering, workspaceUsage, aiGenerations } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

async function syncAIUsage() {
  console.log('='.repeat(80))
  console.log('SYNCING AI GENERATIONS WITH USAGE METERING')
  console.log('='.repeat(80))

  try {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Get all AI usage metering records for current month
    const meteringRecords = await db
      .select()
      .from(aiUsageMetering)
      .where(eq(aiUsageMetering.billingPeriodStart, monthStart))

    console.log(`\n📊 Found ${meteringRecords.length} metering records for current month\n`)

    let syncedCount = 0
    let skippedCount = 0

    for (const metering of meteringRecords) {
      // Get AI generations for this org in current month
      const [generationStats] = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalTokens: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)`,
        })
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.organizationId, metering.organizationId),
            gte(aiGenerations.createdAt, monthStart),
            eq(aiGenerations.status, 'completed')
          )
        )

      const totalGenerations = Number(generationStats?.count || 0)
      const totalTokens = Number(generationStats?.totalTokens || 0)

      if (totalGenerations === 0) {
        console.log(`⏭️  Org ${metering.organizationId}: No generations this month`)
        skippedCount++
        continue
      }

      console.log(`\n🔄 Org ${metering.organizationId}:`)
      console.log(`  - Generations: ${totalGenerations}`)
      console.log(`  - Tokens: ${totalTokens.toLocaleString()}`)
      console.log(`  - Current metering tokens: ${metering.tokensUsed}`)

      // Update AI usage metering
      const newTokensRemaining = Math.max(0, metering.tokenPool - totalTokens)
      const newOverageTokens = Math.max(0, totalTokens - metering.tokenPool)
      
      await db
        .update(aiUsageMetering)
        .set({
          tokensUsed: totalTokens,
          tokensRemaining: newTokensRemaining,
          overageTokens: newOverageTokens,
          aiActionsCount: totalGenerations,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(aiUsageMetering.organizationId, metering.organizationId),
            eq(aiUsageMetering.billingPeriodStart, monthStart)
          )
        )

      console.log(`  ✅ Updated AI usage metering`)

      // Update workspace usage
      await db
        .update(workspaceUsage)
        .set({
          tokensUsed: totalTokens,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workspaceUsage.organizationId, metering.organizationId),
            eq(workspaceUsage.billingPeriodStart, monthStart)
          )
        )

      console.log(`  ✅ Updated workspace usage`)
      syncedCount++
    }

    console.log('\n' + '='.repeat(80))
    console.log('SYNC COMPLETE')
    console.log(`✅ Synced: ${syncedCount} organizations`)
    console.log(`⏭️  Skipped: ${skippedCount} organizations`)
    console.log('='.repeat(80))
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// Run the sync
syncAIUsage()
  .then(() => {
    console.log('\n✅ Sync completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error)
    process.exit(1)
  })

