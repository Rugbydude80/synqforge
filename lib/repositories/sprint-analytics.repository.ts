import { db, generateId } from '@/lib/db'
import { sprintAnalytics, sprints, sprintStories, stories } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface CreateSprintAnalyticsInput {
  sprintId: string
  dayNumber: number
  remainingPoints: number
  completedPoints: number
  scopeChanges?: number
}

export interface SprintVelocityData {
  sprintId: string
  sprintName: string
  plannedPoints: number
  completedPoints: number
  velocity: number
  completionPercentage: number
  startDate: string
  endDate: string
}

export class SprintAnalyticsRepository {
  /**
   * Record daily sprint analytics
   */
  async recordDailySnapshot(input: CreateSprintAnalyticsInput) {
    try {
      const analyticsId = generateId()

      const [analytics] = await db
        .insert(sprintAnalytics)
        .values({
          id: analyticsId,
          sprintId: input.sprintId,
          dayNumber: input.dayNumber,
          remainingPoints: input.remainingPoints,
          completedPoints: input.completedPoints,
          scopeChanges: input.scopeChanges || 0,
        })
        .onConflictDoUpdate({
          target: [sprintAnalytics.sprintId, sprintAnalytics.dayNumber],
          set: {
            remainingPoints: input.remainingPoints,
            completedPoints: input.completedPoints,
            scopeChanges: input.scopeChanges || 0,
          },
        })
        .returning()

      return analytics
    } catch (error) {
      console.error('Record daily snapshot error:', error)
      throw new Error('Failed to record daily snapshot')
    }
  }

  /**
   * Get burndown data for a sprint
   */
  async getBurndownData(sprintId: string) {
    try {
      const burndown = await db
        .select()
        .from(sprintAnalytics)
        .where(eq(sprintAnalytics.sprintId, sprintId))
        .orderBy(sprintAnalytics.dayNumber)

      return burndown
    } catch (error) {
      console.error('Get burndown data error:', error)
      throw new Error('Failed to get burndown data')
    }
  }

  /**
   * Calculate and update sprint velocity
   */
  async updateSprintVelocity(sprintId: string) {
    try {
      // Get sprint stories and calculate completed points
      const sprintStoriesData = await db
        .select({
          storyPoints: stories.storyPoints,
          status: stories.status,
        })
        .from(sprintStories)
        .leftJoin(stories, eq(sprintStories.storyId, stories.id))
        .where(eq(sprintStories.sprintId, sprintId))

      const plannedPoints = sprintStoriesData.reduce(
        (sum, story) => sum + (story.storyPoints || 0),
        0
      )
      const completedPoints = sprintStoriesData
        .filter((story) => story.status === 'done')
        .reduce((sum, story) => sum + (story.storyPoints || 0), 0)

      const completionPercentage = plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0

      // Update sprint with calculated metrics
      const [updated] = await db
        .update(sprints)
        .set({
          plannedPoints,
          completedPoints,
          velocity: completedPoints,
          completionPercentage,
        })
        .where(eq(sprints.id, sprintId))
        .returning()

      return updated
    } catch (error) {
      console.error('Update sprint velocity error:', error)
      throw new Error('Failed to update sprint velocity')
    }
  }

  /**
   * Get velocity trend for a project (last N sprints)
   */
  async getVelocityTrend(projectId: string, limit = 6): Promise<SprintVelocityData[]> {
    try {
      const velocityData = await db
        .select({
          sprintId: sprints.id,
          sprintName: sprints.name,
          plannedPoints: sprints.plannedPoints,
          completedPoints: sprints.completedPoints,
          velocity: sprints.velocity,
          completionPercentage: sprints.completionPercentage,
          startDate: sprints.startDate,
          endDate: sprints.endDate,
        })
        .from(sprints)
        .where(eq(sprints.projectId, projectId))
        .orderBy(desc(sprints.startDate))
        .limit(limit)

      return velocityData.reverse() as SprintVelocityData[]
    } catch (error) {
      console.error('Get velocity trend error:', error)
      throw new Error('Failed to get velocity trend')
    }
  }

  /**
   * Calculate average velocity for a project
   */
  async getAverageVelocity(projectId: string, lastNSprints = 3): Promise<number> {
    try {
      const recentSprints = await db
        .select({
          velocity: sprints.velocity,
        })
        .from(sprints)
        .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'completed')))
        .orderBy(desc(sprints.endDate))
        .limit(lastNSprints)

      if (recentSprints.length === 0) {
        return 0
      }

      const totalVelocity = recentSprints.reduce((sum, sprint) => sum + (sprint.velocity || 0), 0)
      return Math.round(totalVelocity / recentSprints.length)
    } catch (error) {
      console.error('Get average velocity error:', error)
      return 0
    }
  }

  /**
   * Get sprint health metrics
   */
  async getSprintHealth(sprintId: string) {
    try {
      const [sprint] = await db.select().from(sprints).where(eq(sprints.id, sprintId)).limit(1)

      if (!sprint) {
        throw new Error('Sprint not found')
      }

      // Get latest burndown data
      const latestBurndown = await db
        .select()
        .from(sprintAnalytics)
        .where(eq(sprintAnalytics.sprintId, sprintId))
        .orderBy(desc(sprintAnalytics.dayNumber))
        .limit(1)

      // Calculate days remaining
      const today = new Date()
      const endDate = new Date(sprint.endDate)
      const startDate = new Date(sprint.startDate)
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.max(0, totalDays - daysElapsed)

      // Calculate ideal burndown rate
      const plannedPoints = sprint.plannedPoints || 0
      const completedPoints = sprint.completedPoints || 0
      const remainingPoints = plannedPoints - completedPoints
      const idealBurnRate = totalDays > 0 ? plannedPoints / totalDays : 0
      const actualBurnRate = daysElapsed > 0 ? completedPoints / daysElapsed : 0

      // Determine health status
      let healthStatus: 'on_track' | 'at_risk' | 'behind'
      const progressRatio = plannedPoints > 0 ? completedPoints / plannedPoints : 0
      const timeRatio = totalDays > 0 ? daysElapsed / totalDays : 0

      if (progressRatio >= timeRatio - 0.1) {
        healthStatus = 'on_track'
      } else if (progressRatio >= timeRatio - 0.25) {
        healthStatus = 'at_risk'
      } else {
        healthStatus = 'behind'
      }

      return {
        sprintId: sprint.id,
        sprintName: sprint.name,
        status: sprint.status,
        plannedPoints,
        completedPoints,
        remainingPoints,
        completionPercentage: sprint.completionPercentage || 0,
        daysElapsed,
        daysRemaining,
        totalDays,
        idealBurnRate,
        actualBurnRate,
        healthStatus,
        scopeChanges: latestBurndown[0]?.scopeChanges || 0,
      }
    } catch (error) {
      console.error('Get sprint health error:', error)
      throw new Error('Failed to get sprint health')
    }
  }

  /**
   * Generate daily snapshots for active sprints
   */
  async generateDailySnapshots() {
    try {
      // Get all active sprints
      const activeSprints = await db
        .select()
        .from(sprints)
        .where(eq(sprints.status, 'active'))

      for (const sprint of activeSprints) {
        // Calculate current day number
        const startDate = new Date(sprint.startDate)
        const today = new Date()
        const dayNumber = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

        // Get current points
        const sprintStoriesData = await db
          .select({
            storyPoints: stories.storyPoints,
            status: stories.status,
          })
          .from(sprintStories)
          .leftJoin(stories, eq(sprintStories.storyId, stories.id))
          .where(eq(sprintStories.sprintId, sprint.id))

        const totalPoints = sprintStoriesData.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
        const completedPoints = sprintStoriesData
          .filter((story) => story.status === 'done')
          .reduce((sum, story) => sum + (story.storyPoints || 0), 0)
        const remainingPoints = totalPoints - completedPoints

        // Get previous day's total to detect scope changes
        const previousDay = await db
          .select()
          .from(sprintAnalytics)
          .where(
            and(eq(sprintAnalytics.sprintId, sprint.id), eq(sprintAnalytics.dayNumber, dayNumber - 1))
          )
          .limit(1)

        const scopeChanges = previousDay[0]
          ? totalPoints - (previousDay[0].remainingPoints + previousDay[0].completedPoints)
          : 0

        // Record snapshot
        await this.recordDailySnapshot({
          sprintId: sprint.id,
          dayNumber,
          remainingPoints,
          completedPoints,
          scopeChanges,
        })

        // Update sprint velocity
        await this.updateSprintVelocity(sprint.id)
      }

      return true
    } catch (error) {
      console.error('Generate daily snapshots error:', error)
      throw new Error('Failed to generate daily snapshots')
    }
  }
}

// Export singleton instance
export const sprintAnalyticsRepository = new SprintAnalyticsRepository()
