import { db, generateId } from '@/lib/db'
import { epics, projects, stories, users, activities } from '@/lib/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import {
  CreateEpicInput,
  UpdateEpicInput,
  NotFoundError,
  ForbiddenError,
} from '@/lib/types'
import { UserContext } from '@/lib/middleware/auth'

export class EpicsRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get all epics for the organization (optionally filtered by project and/or status)
   */
  async getEpics(projectId?: string, status?: string) {
    // If projectId is provided, verify access to that specific project
    if (projectId) {
      await this.verifyProjectAccess(projectId)
    }

    // Build where conditions
    const conditions = []
    
    if (projectId) {
      conditions.push(eq(epics.projectId, projectId))
    } else {
      conditions.push(eq(epics.organizationId, this.userContext.organizationId))
    }
    
    if (status) {
      conditions.push(eq(epics.status, status))
    }

    const query = db
      .select({
        id: epics.id,
        projectId: epics.projectId,
        title: epics.title,
        description: epics.description,
        goals: epics.goals,
        status: epics.status,
        priority: epics.priority,
        aiGenerated: epics.aiGenerated,
        createdBy: epics.createdBy,
        assignedTo: epics.assignedTo,
        startDate: epics.startDate,
        targetDate: epics.targetDate,
        createdAt: epics.createdAt,
        updatedAt: epics.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
        // Story counts
        totalStories: sql<number>`(
          SELECT COUNT(*) FROM ${stories}
          WHERE ${stories.epicId} = ${epics.id}
        )`,
        completedStories: sql<number>`(
          SELECT COUNT(*) FROM ${stories}
          WHERE ${stories.epicId} = ${epics.id}
          AND ${stories.status} = 'done'
        )`,
        totalStoryPoints: sql<number>`(
          SELECT SUM(${stories.storyPoints}) FROM ${stories}
          WHERE ${stories.epicId} = ${epics.id}
        )`,
        completedStoryPoints: sql<number>`(
          SELECT SUM(${stories.storyPoints}) FROM ${stories}
          WHERE ${stories.epicId} = ${epics.id}
          AND ${stories.status} = 'done'
        )`,
      })
      .from(epics)
      .leftJoin(users, eq(epics.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(epics.createdAt))

    const result = await query

    return result
  }

  /**
   * Get single epic by ID
   */
  async getEpicById(epicId: string) {
    const [epic] = await db
      .select({
        id: epics.id,
        projectId: epics.projectId,
        organizationId: epics.organizationId,
        title: epics.title,
        description: epics.description,
        goals: epics.goals,
        status: epics.status,
        priority: epics.priority,
        aiGenerated: epics.aiGenerated,
        aiGenerationPrompt: epics.aiGenerationPrompt,
        createdBy: epics.createdBy,
        assignedTo: epics.assignedTo,
        startDate: epics.startDate,
        targetDate: epics.targetDate,
        createdAt: epics.createdAt,
        updatedAt: epics.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
        // Project info
        projectName: projects.name,
        projectSlug: projects.slug,
      })
      .from(epics)
      .leftJoin(users, eq(epics.createdBy, users.id))
      .leftJoin(projects, eq(epics.projectId, projects.id))
      .where(eq(epics.id, epicId))
      .limit(1)

    if (!epic) {
      throw new NotFoundError('Epic')
    }

    // Verify organization access
    if (epic.organizationId !== this.userContext.organizationId) {
      throw new ForbiddenError('Access denied to this epic')
    }

    return epic
  }

  /**
   * Create new epic
   */
  async createEpic(data: CreateEpicInput) {
    if (!this.canModify()) {
      throw new ForbiddenError('Cannot create epics')
    }

    // Verify project access and get organization ID
    const project = await this.getProjectInfo(data.projectId)

    // Verify assigned user if provided
    if (data.assignedTo) {
      await this.verifyUserInOrg(data.assignedTo)
    }

    const epicId = generateId()

    await db
      .insert(epics)
      .values({
        id: epicId,
        ...data,
        organizationId: project.organizationId,
        createdBy: this.userContext.id,
      })

    // Get the created epic
    const createdEpic = await this.getEpicById(epicId)

    // Log activity
    await this.logActivity(
      'created_epic',
      'epic',
      epicId,
      data.projectId,
      null,
      createdEpic
    )

    return createdEpic
  }

  /**
   * Update existing epic
   */
  async updateEpic(epicId: string, updates: UpdateEpicInput) {
    const epic = await this.getEpicById(epicId)

    if (!this.canModifyEpic(epic)) {
      throw new ForbiddenError('Cannot modify this epic')
    }

    // Verify assigned user if being updated
    if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
      await this.verifyUserInOrg(updates.assignedTo)
    }

    await db
      .update(epics)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(epics.id, epicId))

    // Get updated epic
    const updatedEpic = await this.getEpicById(epicId)

    // Log activity
    await this.logActivity(
      'updated_epic',
      'epic',
      epicId,
      epic.projectId,
      epic,
      updatedEpic
    )

    return updatedEpic
  }

  /**
   * Publish epic - makes it visible and active for story workflows
   */
  async publishEpic(epicId: string) {
    const epic = await this.getEpicById(epicId)

    if (!this.canPublishEpic(epic)) {
      throw new ForbiddenError('Cannot publish this epic. Only admins and epic owners can publish.')
    }

    // Verify epic is in draft state
    if (epic.status !== 'draft') {
      throw new ForbiddenError(`Cannot publish epic with status "${epic.status}". Only draft epics can be published.`)
    }

    // Update epic status to published
    await db
      .update(epics)
      .set({
        status: 'published',
        updatedAt: new Date(),
      })
      .where(eq(epics.id, epicId))

    // Update linked stories to 'ready' status if they're in 'backlog' (if any exist)
    const hasStories = await this.checkEpicHasStories(epicId)
    if (hasStories) {
      await db
        .update(stories)
        .set({
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stories.epicId, epicId),
            eq(stories.status, 'backlog')
          )
        )
    }

    // Get updated epic
    const updatedEpic = await this.getEpicById(epicId)

    // Log activity
    await this.logActivity(
      'published_epic',
      'epic',
      epicId,
      epic.projectId,
      epic,
      updatedEpic
    )

    return updatedEpic
  }

  /**
   * Delete epic
   */
  async deleteEpic(epicId: string) {
    const epic = await this.getEpicById(epicId)

    if (!this.canModifyEpic(epic)) {
      throw new ForbiddenError('Cannot delete this epic')
    }

    // Check if epic has stories
    const hasStories = await this.checkEpicHasStories(epicId)
    if (hasStories) {
      throw new ForbiddenError(
        'Cannot delete epic with existing stories. Move or delete stories first.'
      )
    }

    await db.delete(epics).where(eq(epics.id, epicId))

    // Log activity
    await this.logActivity(
      'deleted_epic',
      'epic',
      epicId,
      epic.projectId,
      epic,
      null
    )

    return { success: true }
  }

  /**
   * Get epic progress and statistics
   */
  async getEpicProgress(epicId: string) {
    await this.getEpicById(epicId) // Verify access

    const [stats] = await db
      .select({
        totalStories: count(stories.id),
        completedStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'done' THEN 1 END)`,
        inProgressStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'in_progress' THEN 1 END)`,
        backlogStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'backlog' THEN 1 END)`,
        totalStoryPoints: sql<number>`SUM(${stories.storyPoints})`,
        completedStoryPoints: sql<number>`SUM(CASE WHEN ${stories.status} = 'done' THEN ${stories.storyPoints} ELSE 0 END)`,
        // AI generated stories
        aiGeneratedCount: sql<number>`COUNT(CASE WHEN ${stories.aiGenerated} = true THEN 1 END)`,
      })
      .from(epics)
      .leftJoin(stories, eq(stories.epicId, epics.id))
      .where(eq(epics.id, epicId))
      .groupBy(epics.id)

    const totalStories = Number(stats?.totalStories || 0)
    const completedStories = Number(stats?.completedStories || 0)
    const totalPoints = Number(stats?.totalStoryPoints || 0)
    const completedPoints = Number(stats?.completedStoryPoints || 0)

    return {
      totalStories,
      completedStories,
      inProgressStories: Number(stats?.inProgressStories || 0),
      backlogStories: Number(stats?.backlogStories || 0),
      totalStoryPoints: totalPoints,
      completedStoryPoints: completedPoints,
      aiGeneratedCount: Number(stats?.aiGeneratedCount || 0),
      completionPercentage: totalStories > 0
        ? Math.round((completedStories / totalStories) * 100)
        : 0,
      pointsCompletionPercentage: totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : 0,
      averagePointsPerStory: totalStories > 0
        ? Math.round((totalPoints / totalStories) * 10) / 10
        : 0,
    }
  }

  /**
   * Get stories for an epic (with full story details)
   */
  async getEpicStories(epicId: string) {
    await this.getEpicById(epicId) // Verify access

    const result = await db
      .select()
      .from(stories)
      .where(eq(stories.epicId, epicId))
      .orderBy(desc(stories.priority))

    return result
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
   * Verify user belongs to organization
   */
  private async verifyUserInOrg(userId: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, this.userContext.organizationId)
        )
      )
      .limit(1)

    if (!user) {
      throw new NotFoundError('User not found in organization')
    }
  }

  /**
   * Check if epic has any stories
   */
  private async checkEpicHasStories(epicId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: count(stories.id) })
      .from(stories)
      .where(eq(stories.epicId, epicId))

    return (result?.count || 0) > 0
  }

  /**
   * Check if user can modify epics
   */
  private canModify(): boolean {
    return this.userContext.role === 'admin' || this.userContext.role === 'member'
  }

  /**
   * Check if user can modify specific epic
   */
  private canModifyEpic(epic: any): boolean {
    // Admins can modify any epic
    if (this.userContext.role === 'admin') return true
    
    // Members can modify any epic in their org
    if (this.userContext.role === 'member') return true
    
    // Epic creator can modify their epic
    if (epic.createdBy === this.userContext.id) return true
    
    return false
  }

  /**
   * Check if user can publish epic
   */
  private canPublishEpic(epic: any): boolean {
    // Admins can publish any epic
    if (this.userContext.role === 'admin') return true
    
    // Epic creator can publish their epic
    if (epic.createdBy === this.userContext.id) return true
    
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

