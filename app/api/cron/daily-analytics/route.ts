/**
 * Daily Sprint Analytics Cron Job
 * Records daily snapshots of sprint progress for burndown charts
 * 
 * Configured in vercel.json to run at midnight (00:00 UTC)
 * 
 * Test locally:
 * curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { SprintAnalyticsRepository } from '@/lib/repositories/sprint-analytics.repository'
import { db } from '@/lib/db'
import { sprints, sprintStories, stories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('Authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('[Cron] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting daily analytics job...')

    const analyticsRepo = new SprintAnalyticsRepository()

    // Get all active sprints
    const activeSprints = await db
      .select()
      .from(sprints)
      .where(eq(sprints.status, 'active'))

    console.log(`[Cron] Found ${activeSprints.length} active sprints`)

    let successCount = 0
    let errorCount = 0

    for (const sprint of activeSprints) {
      try {
        // Get sprint stories
        const sprintStoriesData = await db
          .select({
            storyId: sprintStories.storyId,
            storyPoints: stories.storyPoints,
            status: stories.status,
          })
          .from(sprintStories)
          .leftJoin(stories, eq(sprintStories.storyId, stories.id))
          .where(eq(sprintStories.sprintId, sprint.id))

        // Calculate metrics
        const totalPoints = sprintStoriesData.reduce(
          (sum, s) => sum + (s.storyPoints || 0),
          0
        )

        const completedPoints = sprintStoriesData
          .filter((s) => s.status === 'done')
          .reduce((sum, s) => sum + (s.storyPoints || 0), 0)

        const remainingPoints = totalPoints - completedPoints

        // Calculate day number
        const startDate = new Date(sprint.startDate)
        const today = new Date()
        const dayNumber = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1

        // Calculate scope changes (stories added after sprint start)
        // This would require tracking when stories were added to sprint
        // For now, return 0
        const scopeChanges = 0

        // Record snapshot
        await analyticsRepo.recordDailySnapshot({
          sprintId: sprint.id,
          dayNumber,
          remainingPoints,
          completedPoints,
          scopeChanges,
        })

        console.log(
          `[Cron] Recorded snapshot for sprint ${sprint.id} (${sprint.name}): Day ${dayNumber}, ${completedPoints}/${totalPoints} points completed`
        )

        successCount++
      } catch (error) {
        console.error(`[Cron] Error processing sprint ${sprint.id}:`, error)
        errorCount++
      }
    }

    console.log(
      `[Cron] Daily analytics job completed. Success: ${successCount}, Errors: ${errorCount}`
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${activeSprints.length} sprints`,
      successCount,
      errorCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Daily analytics job failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
