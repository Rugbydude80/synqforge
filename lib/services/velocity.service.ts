/**
 * Velocity Service
 *
 * Handles sprint velocity calculation, rolling averages, and forecasting.
 * Uses the view_sprint_velocity view for efficient queries.
 */

import { db } from '@/lib/db'
import { sprints, sprintStories, stories, projects } from '@/lib/db/schema'
import { eq, and, desc, sql, inArray, gte, lt } from 'drizzle-orm'

// ============================================================================
// Types
// ============================================================================

export interface SprintVelocityData {
  sprintId: string
  sprintName: string
  projectId: string
  organizationId: string
  startDate: string
  endDate: string
  sprintStatus: string
  completedPoints: number
  completedStories: number
  committedPoints: number
  committedStories: number
  completionRate: number // Percentage
}

export interface VelocityForecast {
  sprintIndex: number // 1, 2, 3 for next N sprints
  predictedPoints: number
  basis: string // 'rolling_avg_3', 'rolling_avg_5', etc.
  confidence: 'low' | 'medium' | 'high'
}

export interface SprintVelocitySummary {
  sprint: {
    id: string
    name: string
    goal: string | null
    status: string
    startDate: string
    endDate: string
  }
  velocity: {
    completedPoints: number
    completedStories: number
    committedPoints: number
    committedStories: number
    completionRate: number
  }
  projectMetrics: {
    rollingAvg3: number
    rollingAvg5: number
    allTimeAvg: number
    minVelocity: number
    maxVelocity: number
    totalCompletedSprints: number
  }
  forecast: VelocityForecast[]
}

export interface ProjectVelocityHistory {
  projectId: string
  organizationId: string
  completedSprints: number
  avgVelocity: number
  minVelocity: number
  maxVelocity: number
  velocityStddev: number
  rollingAvg3: number
  rollingAvg5: number
}

// ============================================================================
// Service Class
// ============================================================================

export class VelocityService {
  /**
   * Calculate velocity for a specific sprint
   * Uses the sprint date boundaries to determine which completed stories count
   */
  async calculateSprintVelocity(sprintId: string, organizationId: string): Promise<SprintVelocityData> {
    // Get sprint details first
    const [sprint] = await db
      .select({
        id: sprints.id,
        name: sprints.name,
        projectId: sprints.projectId,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        status: sprints.status,
        organizationId: projects.organizationId,
      })
      .from(sprints)
      .innerJoin(projects, eq(projects.id, sprints.projectId))
      .where(and(eq(sprints.id, sprintId), eq(projects.organizationId, organizationId)))

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found in organization ${organizationId}`)
    }

    // Calculate completed points (stories done within sprint date boundaries)
    const completedData = await db
      .select({
        completedPoints: sql<number>`COALESCE(SUM(${stories.storyPoints}), 0)`,
        completedStories: sql<number>`COUNT(${stories.id})`,
      })
      .from(sprintStories)
      .innerJoin(stories, eq(stories.id, sprintStories.storyId))
      .where(
        and(
          eq(sprintStories.sprintId, sprintId),
          eq(stories.status, 'done'),
          gte(stories.doneAt, sql`${sprint.startDate}::TIMESTAMPTZ`),
          lt(stories.doneAt, sql`${sprint.endDate}::TIMESTAMPTZ`)
        )
      )

    // Calculate committed points (all stories in sprint)
    const committedData = await db
      .select({
        committedPoints: sql<number>`COALESCE(SUM(${stories.storyPoints}), 0)`,
        committedStories: sql<number>`COUNT(${stories.id})`,
      })
      .from(sprintStories)
      .innerJoin(stories, eq(stories.id, sprintStories.storyId))
      .where(eq(sprintStories.sprintId, sprintId))

    const completed = completedData[0] || { completedPoints: 0, completedStories: 0 }
    const committed = committedData[0] || { committedPoints: 0, committedStories: 0 }

    const completionRate =
      committed.committedPoints > 0 ? (completed.completedPoints / committed.committedPoints) * 100 : 0

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      projectId: sprint.projectId,
      organizationId: sprint.organizationId,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      sprintStatus: sprint.status,
      completedPoints: completed.completedPoints,
      completedStories: completed.completedStories,
      committedPoints: committed.committedPoints,
      committedStories: committed.committedStories,
      completionRate: Math.round(completionRate),
    }
  }

  /**
   * Get rolling average velocity for a project
   * Defaults to last N completed sprints
   */
  async getRollingVelocity(projectId: string, organizationId: string, n: number = 3): Promise<number> {
    // Get last N completed sprints
    const completedSprints = await db
      .select({
        id: sprints.id,
        velocityCached: sprints.velocityCached,
        endDate: sprints.endDate,
      })
      .from(sprints)
      .innerJoin(projects, eq(projects.id, sprints.projectId))
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'completed'), eq(projects.organizationId, organizationId)))
      .orderBy(desc(sprints.endDate))
      .limit(n)

    if (completedSprints.length === 0) {
      return 0 // No completed sprints yet
    }

    // Calculate average from cached velocity
    const total = completedSprints.reduce((sum, sprint) => sum + (sprint.velocityCached || 0), 0)
    const average = total / completedSprints.length

    return Math.round(average)
  }

  /**
   * Forecast velocity for next K sprints using rolling average
   * Simple linear forecast; can be enhanced with Monte Carlo later
   */
  async forecastVelocity(
    projectId: string,
    organizationId: string,
    k: number = 3,
    basis: 3 | 5 = 3
  ): Promise<VelocityForecast[]> {
    const avgVelocity = await this.getRollingVelocity(projectId, organizationId, basis)

    // Get total completed sprints for confidence calculation
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(sprints)
      .innerJoin(projects, eq(projects.id, sprints.projectId))
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'completed'), eq(projects.organizationId, organizationId)))

    const completedSprints = count || 0

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high' = 'low'
    if (completedSprints >= 10) confidence = 'high'
    else if (completedSprints >= 5) confidence = 'medium'

    const forecasts: VelocityForecast[] = []
    for (let i = 1; i <= k; i++) {
      forecasts.push({
        sprintIndex: i,
        predictedPoints: avgVelocity,
        basis: `rolling_avg_${basis}`,
        confidence,
      })
    }

    return forecasts
  }

  /**
   * Get comprehensive sprint velocity summary
   * Includes sprint details, velocity metrics, and forecasts
   */
  async getSprintVelocitySummary(sprintId: string, organizationId: string): Promise<SprintVelocitySummary> {
    // Get sprint details
    const [sprint] = await db
      .select({
        id: sprints.id,
        name: sprints.name,
        goal: sprints.goal,
        status: sprints.status,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        projectId: sprints.projectId,
      })
      .from(sprints)
      .innerJoin(projects, eq(projects.id, sprints.projectId))
      .where(and(eq(sprints.id, sprintId), eq(projects.organizationId, organizationId)))

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`)
    }

    // Get velocity data
    const velocity = await this.calculateSprintVelocity(sprintId, organizationId)

    // Get project metrics
    const rollingAvg3 = await this.getRollingVelocity(sprint.projectId, organizationId, 3)
    const rollingAvg5 = await this.getRollingVelocity(sprint.projectId, organizationId, 5)

    // Get all-time stats
    const projectStats = await this.getProjectVelocityHistory(sprint.projectId, organizationId)

    // Get forecast
    const forecast = await this.forecastVelocity(sprint.projectId, organizationId, 3, 3)

    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      velocity: {
        completedPoints: velocity.completedPoints,
        completedStories: velocity.completedStories,
        committedPoints: velocity.committedPoints,
        committedStories: velocity.committedStories,
        completionRate: velocity.completionRate,
      },
      projectMetrics: {
        rollingAvg3,
        rollingAvg5,
        allTimeAvg: projectStats.avgVelocity,
        minVelocity: projectStats.minVelocity,
        maxVelocity: projectStats.maxVelocity,
        totalCompletedSprints: projectStats.completedSprints,
      },
      forecast,
    }
  }

  /**
   * Get project velocity history and statistics
   */
  async getProjectVelocityHistory(projectId: string, organizationId: string): Promise<ProjectVelocityHistory> {
    // Get all completed sprints for this project
    const completedSprints = await db
      .select({
        velocityCached: sprints.velocityCached,
      })
      .from(sprints)
      .innerJoin(projects, eq(projects.id, sprints.projectId))
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'completed'), eq(projects.organizationId, organizationId)))

    if (completedSprints.length === 0) {
      return {
        projectId,
        organizationId,
        completedSprints: 0,
        avgVelocity: 0,
        minVelocity: 0,
        maxVelocity: 0,
        velocityStddev: 0,
        rollingAvg3: 0,
        rollingAvg5: 0,
      }
    }

    const velocities = completedSprints.map((s) => s.velocityCached || 0)
    const sum = velocities.reduce((a, b) => a + b, 0)
    const avg = sum / velocities.length
    const min = Math.min(...velocities)
    const max = Math.max(...velocities)

    // Calculate standard deviation
    const squareDiffs = velocities.map((v) => Math.pow(v - avg, 2))
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / velocities.length
    const stddev = Math.sqrt(avgSquareDiff)

    const rollingAvg3 = await this.getRollingVelocity(projectId, organizationId, 3)
    const rollingAvg5 = await this.getRollingVelocity(projectId, organizationId, 5)

    return {
      projectId,
      organizationId,
      completedSprints: completedSprints.length,
      avgVelocity: Math.round(avg),
      minVelocity: min,
      maxVelocity: max,
      velocityStddev: Math.round(stddev),
      rollingAvg3,
      rollingAvg5,
    }
  }

  /**
   * Manually update the velocity cache for a sprint
   * (Normally handled by triggers, but useful for backfilling or debugging)
   */
  async updateVelocityCache(sprintId: string, organizationId: string): Promise<void> {
    const velocity = await this.calculateSprintVelocity(sprintId, organizationId)

    await db
      .update(sprints)
      .set({ velocityCached: velocity.completedPoints })
      .where(eq(sprints.id, sprintId))
  }
}

// Export singleton instance
export const velocityService = new VelocityService()
