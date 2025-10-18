/**
 * Epic Progress Service
 *
 * Handles epic status transitions and progress tracking.
 * Epic aggregates (totals, completion, progress_pct) are auto-calculated by database triggers.
 */

import { db } from '@/lib/db'
import { epics, stories } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// ============================================================================
// Types
// ============================================================================

export type EpicStatus = 'draft' | 'published' | 'planned' | 'in_progress' | 'completed' | 'archived'

export interface EpicProgressData {
  id: string
  title: string
  status: EpicStatus
  totalStories: number
  completedStories: number
  totalPoints: number
  completedPoints: number
  progressPct: string // Decimal comes as string from DB
  startDate: string | null
  targetDate: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EpicStoryBreakdown {
  byStatus: Record<string, number>
  byType: Record<string, number>
  avgPointsPerStory: number
  storiesWithoutPoints: number
}

export interface EpicProgressSummary {
  epic: EpicProgressData
  breakdown: EpicStoryBreakdown
}

// Valid status transitions for epics
const EPIC_STATUS_TRANSITIONS: Record<EpicStatus, EpicStatus[]> = {
  draft: ['published', 'planned', 'in_progress', 'completed', 'archived'],
  published: ['in_progress', 'archived', 'draft'], // Allow returning to draft
  planned: ['in_progress', 'archived', 'draft'],
  in_progress: ['completed', 'planned', 'archived'],
  completed: ['archived'], // Completed is typically terminal
  archived: ['planned'], // Allow reactivation
}

// ============================================================================
// Service Class
// ============================================================================

export class EpicProgressService {
  /**
   * Get epic progress data with aggregates
   * Aggregates are auto-calculated by database triggers, so this is a simple read
   */
  async getEpicProgress(epicId: string, organizationId: string): Promise<EpicProgressData> {
    const [epic] = await db
      .select({
        id: epics.id,
        title: epics.title,
        status: epics.status,
        totalStories: epics.totalStories,
        completedStories: epics.completedStories,
        totalPoints: epics.totalPoints,
        completedPoints: epics.completedPoints,
        progressPct: epics.progressPct,
        startDate: epics.startDate,
        targetDate: epics.targetDate,
        createdAt: epics.createdAt,
        updatedAt: epics.updatedAt,
      })
      .from(epics)
      .where(and(eq(epics.id, epicId), eq(epics.organizationId, organizationId)))

    if (!epic) {
      throw new Error(`Epic ${epicId} not found in organization ${organizationId}`)
    }

    return epic as EpicProgressData
  }

  /**
   * Get detailed epic progress summary with story breakdowns
   */
  async getEpicProgressSummary(epicId: string, organizationId: string): Promise<EpicProgressSummary> {
    const epic = await this.getEpicProgress(epicId, organizationId)

    // Get story breakdown
    const epicStories = await db
      .select({
        status: stories.status,
        storyType: stories.storyType,
        storyPoints: stories.storyPoints,
      })
      .from(stories)
      .where(and(eq(stories.epicId, epicId), eq(stories.organizationId, organizationId)))

    // Calculate breakdowns
    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}
    let totalPoints = 0
    let storiesWithPoints = 0
    let storiesWithoutPoints = 0

    for (const story of epicStories) {
      // By status
      const statusKey = story.status || 'unknown'
      byStatus[statusKey] = (byStatus[statusKey] || 0) + 1

      // By type
      const typeKey = story.storyType || 'unknown'
      byType[typeKey] = (byType[typeKey] || 0) + 1

      // Points tracking
      if (story.storyPoints && story.storyPoints > 0) {
        totalPoints += story.storyPoints
        storiesWithPoints++
      } else {
        storiesWithoutPoints++
      }
    }

    const avgPointsPerStory = storiesWithPoints > 0 ? totalPoints / storiesWithPoints : 0

    return {
      epic,
      breakdown: {
        byStatus,
        byType,
        avgPointsPerStory: Math.round(avgPointsPerStory * 10) / 10, // Round to 1 decimal
        storiesWithoutPoints,
      },
    }
  }

  /**
   * Update epic status with validation
   * Validates status transitions based on business rules
   */
  async updateEpicStatus(
    epicId: string,
    organizationId: string,
    newStatus: EpicStatus,
    force: boolean = false
  ): Promise<EpicProgressData> {
    // Get current epic
    const currentEpic = await this.getEpicProgress(epicId, organizationId)

    // Validate transition
    if (!force) {
      const currentStatus = currentEpic.status as EpicStatus
      const allowedTransitions = EPIC_STATUS_TRANSITIONS[currentStatus] || []

      if (currentStatus !== newStatus && !allowedTransitions.includes(newStatus)) {
        throw new Error(
          `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
            `Allowed transitions: ${allowedTransitions.join(', ')}`
        )
      }
    }

    // Update status
    const [updatedEpic] = await db
      .update(epics)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(epics.id, epicId), eq(epics.organizationId, organizationId)))
      .returning({
        id: epics.id,
        title: epics.title,
        status: epics.status,
        totalStories: epics.totalStories,
        completedStories: epics.completedStories,
        totalPoints: epics.totalPoints,
        completedPoints: epics.completedPoints,
        progressPct: epics.progressPct,
        startDate: epics.startDate,
        targetDate: epics.targetDate,
        createdAt: epics.createdAt,
        updatedAt: epics.updatedAt,
      })

    if (!updatedEpic) {
      throw new Error(`Failed to update epic ${epicId}`)
    }

    return updatedEpic as EpicProgressData
  }

  /**
   * Check if an epic status transition is valid
   */
  isValidStatusTransition(currentStatus: EpicStatus, newStatus: EpicStatus, force: boolean = false): boolean {
    if (force) return true
    if (currentStatus === newStatus) return true

    const allowedTransitions = EPIC_STATUS_TRANSITIONS[currentStatus] || []
    return allowedTransitions.includes(newStatus)
  }

  /**
   * Get all valid next statuses for an epic
   */
  getValidNextStatuses(currentStatus: EpicStatus): EpicStatus[] {
    return EPIC_STATUS_TRANSITIONS[currentStatus] || []
  }

  /**
   * Check if an epic is complete
   */
  isEpicComplete(epic: EpicProgressData): boolean {
    return epic.status === 'completed' || epic.status === 'archived'
  }

  /**
   * Check if epic has all stories completed (regardless of epic status)
   */
  hasAllStoriesCompleted(epic: EpicProgressData): boolean {
    if (epic.totalStories === 0) return false
    return epic.completedStories === epic.totalStories
  }
}

// Export singleton instance
export const epicProgressService = new EpicProgressService()
