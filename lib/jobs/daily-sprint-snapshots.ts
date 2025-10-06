/**
 * Background Job: Daily Sprint Snapshots
 *
 * Runs daily at midnight UTC to capture burndown data for all active sprints
 *
 * Usage:
 * - Next.js API Route (cron): POST /api/cron/daily-snapshots
 * - Vercel Cron: Configure in vercel.json
 * - Manual trigger: Call this function directly
 */

import { sprintAnalyticsRepository } from '@/lib/repositories/sprint-analytics.repository'

export async function generateDailySprintSnapshots() {
  console.log('[CRON] Starting daily sprint snapshots job...')

  try {
    await sprintAnalyticsRepository.generateDailySnapshots()

    console.log('[CRON] Daily sprint snapshots completed successfully')
    return {
      success: true,
      message: 'Daily snapshots generated',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[CRON] Failed to generate daily snapshots:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Example Vercel Cron Configuration:
 *
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-snapshots",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
