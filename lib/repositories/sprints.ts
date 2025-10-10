import { db, generateId } from '@/lib/db'
import { sprints, sprintStories, stories, projects, users, activities } from '@/lib/db/schema'
import { eq, and, desc, sql, count, inArray } from 'drizzle-orm'
import {
  CreateSprintInput,
  UpdateSprintInput,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/lib/types'
import { UserContext } from '@/lib/middleware/auth'

export class SprintsRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get all sprints for a project
   */
  async getSprints(projectId: string) {
    // Verify project access
    await this.verifyProjectAccess(projectId)

    const query = db
      .select({
        id: sprints.id,
        projectId: sprints.projectId,
        name: sprints.name,
        goal: sprints.goal,
        status: sprints.status,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        capacityPoints: sprints.capacityPoints,
        createdBy: sprints.createdBy,
        createdAt: sprints.createdAt,
        updatedAt: sprints.updatedAt,
        // Creator info
        creatorName: users.name,
        // Story counts
        committedStories: sql<number>`(
          SELECT COUNT(*) FROM ${sprintStories} 
          WHERE ${sprintStories.sprintId} = ${sprints.id}
        )`,
        completedStories: sql<number>`(
          SELECT COUNT(*) 
          FROM ${sprintStories} 
          JOIN ${stories} ON ${sprintStories.storyId} = ${stories.id}
          WHERE ${sprintStories.sprintId} = ${sprints.id}
          AND ${stories.status} = 'done'
        )`,
        committedPoints: sql<number>`(
          SELECT SUM(${stories.storyPoints})
          FROM ${sprintStories}
          JOIN ${stories} ON ${sprintStories.storyId} = ${stories.id}
          WHERE ${sprintStories.sprintId} = ${sprints.id}
        )`,
        completedPoints: sql<number>`(
          SELECT SUM(${stories.storyPoints})
          FROM ${sprintStories}
          JOIN ${stories} ON ${sprintStories.storyId} = ${stories.id}
          WHERE ${sprintStories.sprintId} = ${sprints.id}
          AND ${stories.status} = 'done'
        )`,
      })
      .from(sprints)
      .leftJoin(users, eq(sprints.createdBy, users.id))
      .where(eq(sprints.projectId, projectId))
      .orderBy(desc(sprints.startDate))

    // Note: Status filter removed - needs to be implemented with conditions array before select
    // TODO: Implement filters by building conditions array before select

    const result = await query

    return result
  }

  /**
   * Get single sprint by ID
   */
  async getSprintById(sprintId: string) {
    const [sprint] = await db
      .select({
        id: sprints.id,
        projectId: sprints.projectId,
        name: sprints.name,
        goal: sprints.goal,
        status: sprints.status,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        capacityPoints: sprints.capacityPoints,
        createdBy: sprints.createdBy,
        createdAt: sprints.createdAt,
        updatedAt: sprints.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
        // Project info
        projectName: projects.name,
        projectSlug: projects.slug,
      })
      .from(sprints)
      .leftJoin(users, eq(sprints.createdBy, users.id))
      .leftJoin(projects, eq(sprints.projectId, projects.id))
      .where(eq(sprints.id, sprintId))
      .limit(1)

    if (!sprint) {
      throw new NotFoundError('Sprint')
    }

    // Verify organization access via project
    await this.verifyProjectAccess(sprint.projectId)

    return sprint
  }

  /**
   * Get active sprint for a project
   */
  async getActiveSprint(projectId: string) {
    await this.verifyProjectAccess(projectId)

    const [sprint] = await db
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.projectId, projectId),
          eq(sprints.status, 'active')
        )
      )
      .limit(1)

    return sprint || null
  }

  /**
   * Create new sprint
   */
  async createSprint(data: CreateSprintInput) {
    if (!this.canModify()) {
      throw new ForbiddenError('Cannot create sprints')
    }

    // Verify project access
    await this.getProjectInfo(data.projectId)

    // Validate dates
    this.validateSprintDates(data.startDate, data.endDate)

    // Check for overlapping sprints
    await this.checkOverlappingSprints(data.projectId, data.startDate, data.endDate)

    const sprintId = generateId()

    await db
      .insert(sprints)
      .values({
        id: sprintId,
        ...data,
        createdBy: this.userContext.id,
      })

    // Get the created sprint
    const createdSprint = await this.getSprintById(sprintId)

    // Log activity
    await this.logActivity(
      'created_sprint',
      'sprint',
      sprintId,
      data.projectId,
      null,
      createdSprint
    )

    return createdSprint
  }

  /**
   * Update existing sprint
   */
  async updateSprint(sprintId: string, updates: UpdateSprintInput) {
    const sprint = await this.getSprintById(sprintId)

    if (!this.canModifySprint(sprint)) {
      throw new ForbiddenError('Cannot modify this sprint')
    }

    // Validate dates if being updated
    if (updates.startDate || updates.endDate) {
      const startDate = updates.startDate || sprint.startDate
      const endDate = updates.endDate || sprint.endDate
      this.validateSprintDates(startDate, endDate)
    }

    await db
      .update(sprints)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sprints.id, sprintId))

    // Get updated sprint
    const updatedSprint = await this.getSprintById(sprintId)

    // Log activity
    await this.logActivity(
      'updated_sprint',
      'sprint',
      sprintId,
      sprint.projectId,
      sprint,
      updatedSprint
    )

    return updatedSprint
  }

  /**
   * Delete sprint
   */
  async deleteSprint(sprintId: string) {
    const sprint = await this.getSprintById(sprintId)

    if (!this.canModifySprint(sprint)) {
      throw new ForbiddenError('Cannot delete this sprint')
    }

    // Can only delete planning sprints
    if (sprint.status !== 'planning') {
      throw new ForbiddenError(
        'Cannot delete active or completed sprints. Cancel them instead.'
      )
    }

    // Delete will cascade to sprint_stories
    await db.delete(sprints).where(eq(sprints.id, sprintId))

    // Log activity
    await this.logActivity(
      'deleted_sprint',
      'sprint',
      sprintId,
      sprint.projectId,
      sprint,
      null
    )

    return { success: true }
  }

  /**
   * Start a sprint (set to active)
   */
  async startSprint(sprintId: string) {
    const sprint = await this.getSprintById(sprintId)

    if (sprint.status !== 'planning') {
      throw new ValidationError('Only planning sprints can be started')
    }

    // Check if another sprint is active
    const activeSprint = await this.getActiveSprint(sprint.projectId)
    if (activeSprint) {
      throw new ConflictError(
        `Another sprint "${activeSprint.name}" is already active. Complete or cancel it first.`
      )
    }

    return this.updateSprint(sprintId, { status: 'active' })
  }

  /**
   * Complete a sprint
   */
  async completeSprint(sprintId: string) {
    const sprint = await this.getSprintById(sprintId)

    if (sprint.status !== 'active') {
      throw new ValidationError('Only active sprints can be completed')
    }

    return this.updateSprint(sprintId, { status: 'completed' })
  }

  /**
   * Cancel a sprint
   */
  async cancelSprint(sprintId: string) {
    const sprint = await this.getSprintById(sprintId)

    if (sprint.status === 'completed') {
      throw new ValidationError('Cannot cancel completed sprints')
    }

    return this.updateSprint(sprintId, { status: 'cancelled' })
  }

  /**
   * Add stories to sprint
   */
  async addStoriesToSprint(sprintId: string, storyIds: string[]) {
    const sprint = await this.getSprintById(sprintId)

    if (!this.canModifySprint(sprint)) {
      throw new ForbiddenError('Cannot modify this sprint')
    }

    // Verify all stories belong to same project
    const storyList = await db
      .select({ id: stories.id, projectId: stories.projectId })
      .from(stories)
      .where(inArray(stories.id, storyIds))

    if (storyList.length !== storyIds.length) {
      throw new NotFoundError('One or more stories not found')
    }

    if (storyList.some((s) => s.projectId !== sprint.projectId)) {
      throw new ValidationError('All stories must belong to the sprint project')
    }

    // Add stories to sprint
    const values = storyIds.map((storyId) => ({
      sprintId,
      storyId,
      addedAt: new Date(),
      addedBy: this.userContext.id,
    }))

    await db
      .insert(sprintStories)
      .values(values)
      .onConflictDoUpdate({
        target: [sprintStories.sprintId, sprintStories.storyId],
        set: { addedAt: new Date() }
      })

    // Log activity
    await this.logActivity(
      'added_stories_to_sprint',
      'sprint',
      sprintId,
      sprint.projectId,
      null,
      { storyIds }
    )

    return { success: true, added: storyIds.length }
  }

  /**
   * Remove stories from sprint
   */
  async removeStoriesFromSprint(sprintId: string, storyIds: string[]) {
    const sprint = await this.getSprintById(sprintId)

    if (!this.canModifySprint(sprint)) {
      throw new ForbiddenError('Cannot modify this sprint')
    }

    await db
      .delete(sprintStories)
      .where(
        and(
          eq(sprintStories.sprintId, sprintId),
          inArray(sprintStories.storyId, storyIds)
        )
      )

    // Log activity
    await this.logActivity(
      'removed_stories_from_sprint',
      'sprint',
      sprintId,
      sprint.projectId,
      { storyIds },
      null
    )

    return { success: true, removed: storyIds.length }
  }

  /**
   * Get stories in a sprint (for Kanban board)
   */
  async getSprintStories(sprintId: string) {
    await this.getSprintById(sprintId) // Verify access

    const result = await db
      .select({
        id: stories.id,
        epicId: stories.epicId,
        projectId: stories.projectId,
        title: stories.title,
        description: stories.description,
        acceptanceCriteria: stories.acceptanceCriteria,
        storyPoints: stories.storyPoints,
        priority: stories.priority,
        status: stories.status,
        storyType: stories.storyType,
        assignedTo: stories.assigneeId,
        labels: stories.labels,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        addedAt: sprintStories.addedAt,
      })
      .from(sprintStories)
      .innerJoin(stories, eq(sprintStories.storyId, stories.id))
      .where(eq(sprintStories.sprintId, sprintId))
      .orderBy(desc(stories.priority))

    return result
  }

  /**
   * Get sprint metrics and velocity
   */
  async getSprintMetrics(sprintId: string) {
    await this.getSprintById(sprintId) // Verify access

    const [metrics] = await db
      .select({
        totalStories: count(stories.id),
        completedStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'done' THEN 1 END)`,
        inProgressStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'in_progress' THEN 1 END)`,
        reviewStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'review' THEN 1 END)`,
        readyStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'ready' THEN 1 END)`,
        backlogStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'backlog' THEN 1 END)`,
        totalPoints: sql<number>`SUM(${stories.storyPoints})`,
        completedPoints: sql<number>`SUM(CASE WHEN ${stories.status} = 'done' THEN ${stories.storyPoints} ELSE 0 END)`,
        inProgressPoints: sql<number>`SUM(CASE WHEN ${stories.status} = 'in_progress' THEN ${stories.storyPoints} ELSE 0 END)`,
      })
      .from(sprintStories)
      .innerJoin(stories, eq(sprintStories.storyId, stories.id))
      .where(eq(sprintStories.sprintId, sprintId))

    const totalStories = Number(metrics?.totalStories || 0)
    const completedStories = Number(metrics?.completedStories || 0)
    const totalPoints = Number(metrics?.totalPoints || 0)
    const completedPoints = Number(metrics?.completedPoints || 0)

    return {
      totalStories,
      completedStories,
      inProgressStories: Number(metrics?.inProgressStories || 0),
      reviewStories: Number(metrics?.reviewStories || 0),
      readyStories: Number(metrics?.readyStories || 0),
      backlogStories: Number(metrics?.backlogStories || 0),
      totalPoints,
      completedPoints,
      inProgressPoints: Number(metrics?.inProgressPoints || 0),
      remainingPoints: totalPoints - completedPoints,
      completionPercentage: totalStories > 0
        ? Math.round((completedStories / totalStories) * 100)
        : 0,
      pointsCompletionPercentage: totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : 0,
      velocity: completedPoints, // Velocity = completed points
    }
  }

  /**
   * Get burndown chart data
   */
  async getBurndownData(sprintId: string) {
    const sprint = await this.getSprintById(sprintId)
    const metrics = await this.getSprintMetrics(sprintId)

    // Calculate ideal burndown
    const startDate = new Date(sprint.startDate)
    const endDate = new Date(sprint.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const pointsPerDay = metrics.totalPoints / totalDays

    const idealBurndown = []
    for (let day = 0; day <= totalDays; day++) {
      idealBurndown.push({
        day,
        date: new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remainingPoints: Math.max(0, Math.round(metrics.totalPoints - (pointsPerDay * day))),
      })
    }

    // Get actual burndown from activities
    // In a real implementation, you'd track daily progress
    // For now, return structure with current state
    const currentDay = Math.min(
      totalDays,
      Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    )

    return {
      sprintId,
      totalPoints: metrics.totalPoints,
      completedPoints: metrics.completedPoints,
      remainingPoints: metrics.remainingPoints,
      totalDays,
      currentDay,
      idealBurndown,
      actualBurndown: [
        { day: 0, remainingPoints: metrics.totalPoints },
        { day: currentDay, remainingPoints: metrics.remainingPoints },
      ],
    }
  }

  /**
   * Get sprint velocity (average from past sprints)
   */
  async getProjectVelocity(projectId: string, lastNSprints: number = 3) {
    await this.verifyProjectAccess(projectId)

    const completedSprints = await db
      .select({
        id: sprints.id,
        name: sprints.name,
        completedPoints: sql<number>`(
          SELECT SUM(${stories.storyPoints})
          FROM ${sprintStories}
          JOIN ${stories} ON ${sprintStories.storyId} = ${stories.id}
          WHERE ${sprintStories.sprintId} = ${sprints.id}
          AND ${stories.status} = 'done'
        )`,
      })
      .from(sprints)
      .where(
        and(
          eq(sprints.projectId, projectId),
          eq(sprints.status, 'completed')
        )
      )
      .orderBy(desc(sprints.endDate))
      .limit(lastNSprints)

    if (completedSprints.length === 0) {
      return {
        averageVelocity: 0,
        sprintsAnalyzed: 0,
        velocityData: [],
      }
    }

    const velocityData = completedSprints.map((s) => ({
      sprintId: s.id,
      sprintName: s.name,
      velocity: Number(s.completedPoints || 0),
    }))

    const totalVelocity = velocityData.reduce((sum, s) => sum + s.velocity, 0)
    const averageVelocity = Math.round(totalVelocity / velocityData.length)

    return {
      averageVelocity,
      sprintsAnalyzed: completedSprints.length,
      velocityData,
    }
  }

  /**
   * Get project info
   */
  private async getProjectInfo(projectId: string) {
    const [project] = await db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project')
    }

    if (project.organizationId !== this.userContext.organizationId) {
      throw new ForbiddenError('Access denied to this project')
    }

    return project
  }

  /**
   * Verify project access
   */
  private async verifyProjectAccess(projectId: string) {
    await this.getProjectInfo(projectId)
  }

  /**
   * Validate sprint dates
   */
  private validateSprintDates(startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end <= start) {
      throw new ValidationError('End date must be after start date')
    }

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) {
      throw new ValidationError('Sprint duration cannot exceed 30 days')
    }
  }

  /**
   * Check for overlapping sprints
   */
  private async checkOverlappingSprints(
    projectId: string,
    startDate: string,
    endDate: string,
    excludeSprintId?: string
  ) {
    const conditions = [
      eq(sprints.projectId, projectId),
      sql`(
        (${sprints.startDate} <= ${startDate} AND ${sprints.endDate} >= ${startDate})
        OR
        (${sprints.startDate} <= ${endDate} AND ${sprints.endDate} >= ${endDate})
        OR
        (${sprints.startDate} >= ${startDate} AND ${sprints.endDate} <= ${endDate})
      )`
    ]

    if (excludeSprintId) {
      conditions.push(sql`${sprints.id} != ${excludeSprintId}`)
    }

    const [overlapping] = await db
      .select({ id: sprints.id, name: sprints.name })
      .from(sprints)
      .where(and(...conditions))
      .limit(1)

    if (overlapping) {
      throw new ConflictError(
        `Sprint dates overlap with existing sprint "${overlapping.name}"`
      )
    }
  }

  /**
   * Check if user can modify sprints
   */
  private canModify(): boolean {
    return this.userContext.role === 'admin' || this.userContext.role === 'member'
  }

  /**
   * Check if user can modify specific sprint
   */
  private canModifySprint(sprint: any): boolean {
    if (this.userContext.role === 'admin') return true
    if (this.userContext.role === 'member') return true
    if (sprint.createdBy === this.userContext.id) return true
    return false
  }

  /**
   * Log activity
   */
  private async logActivity(
    action: string,
    resourceType: string,
    resourceId: string,
    projectId: string | null,
    oldValues: any,
    newValues: any
  ) {
    try {
      await db.insert(activities).values({
        id: generateId(),
        organizationId: this.userContext.organizationId,
        projectId,
        userId: this.userContext.id,
        action,
        resourceType,
        resourceId,
        oldValues,
        newValues,
        metadata: { source: 'api', userAgent: 'web' },
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }
}