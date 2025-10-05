import { db, generateId } from '@/lib/db'
import { stories, users, epics, projects, activities } from '@/lib/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import {
  CreateStoryInput,
  UpdateStoryInput,
  StoryFilters,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/types'
import { UserContext } from '@/lib/middleware/auth'

export class StoriesRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get stories for an epic with filtering
   */
  async getStories(epicId: string, filters?: StoryFilters) {
    // Verify epic access
    await this.verifyEpicAccess(epicId)

    let query = db
      .select({
        id: stories.id,
        epicId: stories.epicId,
        projectId: stories.projectId,
        organizationId: stories.organizationId,
        title: stories.title,
        description: stories.description,
        acceptanceCriteria: stories.acceptanceCriteria,
        storyPoints: stories.storyPoints,
        priority: stories.priority,
        status: stories.status,
        storyType: stories.storyType,
        aiGenerated: stories.aiGenerated,
        aiValidationScore: stories.aiValidationScore,
        aiSuggestions: stories.aiSuggestions,
        createdBy: stories.createdBy,
        assignedTo: stories.assigneeId,
        labels: stories.labels,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
        // Assignee info
        assigneeName: users.name,
        assigneeEmail: users.email,
      })
      .from(stories)
      .leftJoin(users, eq(stories.createdBy, users.id))
      .leftJoin(users, eq(stories.assigneeId, users.id))
      .where(eq(stories.epicId, epicId))

    // Apply filters
    if (filters) {
      const conditions = []

      if (filters.status) {
        conditions.push(eq(stories.status, filters.status as any))
      }
      if (filters.assignedTo) {
        conditions.push(eq(stories.assigneeId, filters.assignedTo))
      }
      if (filters.storyType) {
        conditions.push(eq(stories.storyType, filters.storyType as any))
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any
      }
    }

    const result = await query.orderBy(desc(stories.priority))

    return result
  }

  /**
   * Get single story by ID
   */
  async getStoryById(storyId: string) {
    const [story] = await db
      .select({
        id: stories.id,
        epicId: stories.epicId,
        projectId: stories.projectId,
        organizationId: stories.organizationId,
        title: stories.title,
        description: stories.description,
        acceptanceCriteria: stories.acceptanceCriteria,
        storyPoints: stories.storyPoints,
        priority: stories.priority,
        status: stories.status,
        storyType: stories.storyType,
        aiGenerated: stories.aiGenerated,
        aiValidationScore: stories.aiValidationScore,
        aiSuggestions: stories.aiSuggestions,
        createdBy: stories.createdBy,
        assignedTo: stories.assigneeId,
        labels: stories.labels,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
        // Assignee info
        assigneeName: users.name,
        assigneeEmail: users.email,
        // Epic info
        epicTitle: epics.title,
        epicStatus: epics.status,
        // Project info
        projectName: projects.name,
        projectSlug: projects.slug,
      })
      .from(stories)
      .leftJoin(users, eq(stories.createdBy, users.id))
      .leftJoin(users, eq(stories.assigneeId, users.id))
      .leftJoin(epics, eq(stories.epicId, epics.id))
      .leftJoin(projects, eq(stories.projectId, projects.id))
      .where(eq(stories.id, storyId))
      .limit(1)

    if (!story) {
      throw new NotFoundError('Story')
    }

    // Verify organization access
    if (story.organizationId !== this.userContext.organizationId) {
      throw new ForbiddenError('Access denied to this story')
    }

    return story
  }

  /**
   * Get stories by project
   */
  async getStoriesByProject(projectId: string, filters?: StoryFilters) {
    // Verify project access
    await this.verifyProjectAccess(projectId)

    let query = db
      .select({
        id: stories.id,
        epicId: stories.epicId,
        projectId: stories.projectId,
        organizationId: stories.organizationId,
        title: stories.title,
        description: stories.description,
        acceptanceCriteria: stories.acceptanceCriteria,
        storyPoints: stories.storyPoints,
        priority: stories.priority,
        status: stories.status,
        storyType: stories.storyType,
        aiGenerated: stories.aiGenerated,
        aiValidationScore: stories.aiValidationScore,
        aiSuggestions: stories.aiSuggestions,
        createdBy: stories.createdBy,
        assignedTo: stories.assigneeId,
        labels: stories.labels,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
        // Assignee info
        assigneeName: users.name,
        assigneeEmail: users.email,
        // Epic info
        epicTitle: epics.title,
        epicStatus: epics.status,
      })
      .from(stories)
      .leftJoin(users, eq(stories.createdBy, users.id))
      .leftJoin(users, eq(stories.assigneeId, users.id))
      .leftJoin(epics, eq(stories.epicId, epics.id))
      .where(eq(stories.projectId, projectId))

    // Apply filters
    if (filters) {
      const conditions = []

      if (filters.status) {
        conditions.push(eq(stories.status, filters.status as any))
      }
      if (filters.assignedTo) {
        conditions.push(eq(stories.assigneeId, filters.assignedTo))
      }
      if (filters.storyType) {
        conditions.push(eq(stories.storyType, filters.storyType as any))
      }
      if (filters.epicId) {
        conditions.push(eq(stories.epicId, filters.epicId))
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any
      }
    }

    const result = await query.orderBy(desc(stories.priority))

    return result
  }

  /**
   * Create new story
   */
  async createStory(data: CreateStoryInput) {
    if (!this.canModify()) {
      throw new ForbiddenError('Cannot create stories')
    }

    // Verify epic access and get project info
    const epic = await this.getEpicInfo(data.epicId)

    // Verify assigned user if provided
    if (data.assignedTo) {
      await this.verifyUserInOrg(data.assignedTo)
    }

    const storyId = generateId()

    const [story] = await db
      .insert(stories)
      .values({
        id: storyId,
        ...data,
        organizationId: epic.organizationId,
        projectId: epic.projectId,
        createdBy: this.userContext.id,
        priority: data.priority || this.calculatePriorityRank(data),
      })
      .$returningId()

    // Get the created story
    const createdStory = await this.getStoryById(storyId)

    // Log activity
    await this.logActivity(
      'created_story',
      'story',
      storyId,
      epic.projectId,
      null,
      createdStory
    )

    return createdStory
  }

  /**
   * Update existing story
   */
  async updateStory(storyId: string, updates: UpdateStoryInput) {
    const story = await this.getStoryById(storyId)

    if (!this.canModifyStory(story)) {
      throw new ForbiddenError('Cannot modify this story')
    }

    // Verify assigned user if being updated
    if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
      await this.verifyUserInOrg(updates.assignedTo)
    }

    // Calculate new priority rank if needed
    const updateData: any = { ...updates }
    if (updates.priority !== undefined) {
      updateData.priority = updates.priority
    }

    await db
      .update(stories)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, storyId))

    // Get updated story
    const updatedStory = await this.getStoryById(storyId)

    // Log activity
    await this.logActivity(
      'updated_story',
      'story',
      storyId,
      story.projectId,
      story,
      updatedStory
    )

    return updatedStory
  }

  /**
   * Delete story
   */
  async deleteStory(storyId: string) {
    const story = await this.getStoryById(storyId)

    if (!this.canModifyStory(story)) {
      throw new ForbiddenError('Cannot delete this story')
    }

    await db.delete(stories).where(eq(stories.id, storyId))

    // Log activity
    await this.logActivity(
      'deleted_story',
      'story',
      storyId,
      story.projectId,
      story,
      null
    )

    return { success: true }
  }

  /**
   * Move story to different epic
   */
  async moveStory(storyId: string, newEpicId: string) {
    const story = await this.getStoryById(storyId)

    if (!this.canModifyStory(story)) {
      throw new ForbiddenError('Cannot move this story')
    }

    // Verify new epic access
    const newEpic = await this.getEpicInfo(newEpicId)

    // Verify epic belongs to same project
    if (newEpic.projectId !== story.projectId) {
      throw new ForbiddenError('Cannot move story to epic in different project')
    }

    await db
      .update(stories)
      .set({
        epicId: newEpicId,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, storyId))

    const movedStory = await this.getStoryById(storyId)

    // Log activity
    await this.logActivity(
      'moved_story',
      'story',
      storyId,
      story.projectId,
      story,
      movedStory
    )

    return movedStory
  }

  /**
   * Get story statistics for an epic
   */
  async getStoryStats(epicId: string) {
    await this.verifyEpicAccess(epicId) // Verify access

    const [stats] = await db
      .select({
        totalStories: count(stories.id),
        completedStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'done' THEN 1 END)`,
        inProgressStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'in_progress' THEN 1 END)`,
        backlogStories: sql<number>`COUNT(CASE WHEN ${stories.status} = 'backlog' THEN 1 END)`,
        totalStoryPoints: sql<number>`SUM(${stories.storyPoints})`,
        completedStoryPoints: sql<number>`SUM(CASE WHEN ${stories.status} = 'done' THEN ${stories.storyPoints} ELSE 0 END)`,
        // Story type breakdown
        featureCount: sql<number>`COUNT(CASE WHEN ${stories.storyType} = 'feature' THEN 1 END)`,
        bugCount: sql<number>`COUNT(CASE WHEN ${stories.storyType} = 'bug' THEN 1 END)`,
        taskCount: sql<number>`COUNT(CASE WHEN ${stories.storyType} = 'task' THEN 1 END)`,
        spikeCount: sql<number>`COUNT(CASE WHEN ${stories.storyType} = 'spike' THEN 1 END)`,
        // AI generated stories
        aiGeneratedCount: sql<number>`COUNT(CASE WHEN ${stories.aiGenerated} = true THEN 1 END)`,
        // Status breakdown
        backlogCount: sql<number>`COUNT(CASE WHEN ${stories.status} = 'backlog' THEN 1 END)`,
        readyCount: sql<number>`COUNT(CASE WHEN ${stories.status} = 'ready' THEN 1 END)`,
        inProgressCount: sql<number>`COUNT(CASE WHEN ${stories.status} = 'in_progress' THEN 1 END)`,
        reviewCount: sql<number>`COUNT(CASE WHEN ${stories.status} = 'review' THEN 1 END)`,
        doneCount: sql<number>`COUNT(CASE WHEN ${stories.status} = 'done' THEN 1 END)`,
        archivedCount: sql<number>`COUNT(CASE WHEN ${stories.status} = 'archived' THEN 1 END)`,
      })
      .from(stories)
      .where(eq(stories.epicId, epicId))

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
      featureCount: Number(stats?.featureCount || 0),
      bugCount: Number(stats?.bugCount || 0),
      taskCount: Number(stats?.taskCount || 0),
      spikeCount: Number(stats?.spikeCount || 0),
      aiGeneratedCount: Number(stats?.aiGeneratedCount || 0),
      backlogCount: Number(stats?.backlogCount || 0),
      readyCount: Number(stats?.readyCount || 0),
      inProgressCount: Number(stats?.inProgressCount || 0),
      reviewCount: Number(stats?.reviewCount || 0),
      doneCount: Number(stats?.doneCount || 0),
      archivedCount: Number(stats?.archivedCount || 0),
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
   * Batch create stories
   */
  async batchCreateStories(epicId: string, storyData: CreateStoryInput[]) {
    if (!this.canModify()) {
      throw new ForbiddenError('Cannot create stories')
    }

    // Verify epic access
    const epic = await this.getEpicInfo(epicId)

    const createdStories = []
    const errors = []

    for (const data of storyData) {
      try {
        // Verify assigned user if provided
        if (data.assignedTo) {
          await this.verifyUserInOrg(data.assignedTo)
        }

        const storyId = generateId()
        const priority = data.priority || this.calculatePriorityRank(data)

        await db.insert(stories).values({
          id: storyId,
          ...data,
          epicId,
          organizationId: epic.organizationId,
          projectId: epic.projectId,
          createdBy: this.userContext.id,
          priority,
        })

        const createdStory = await this.getStoryById(storyId)
        createdStories.push(createdStory)

        // Log activity for each story
        await this.logActivity(
          'created_story',
          'story',
          storyId,
          epic.projectId,
          null,
          createdStory
        )

      } catch (error) {
        errors.push({
          data,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      success: true,
      created: createdStories,
      errors,
      createdCount: createdStories.length,
      errorCount: errors.length,
    }
  }

  /**
   * Calculate priority rank for a story
   */
  private calculatePriorityRank(data: CreateStoryInput): number {
    // Simple priority ranking algorithm
    // Higher priority and story points get higher rank
    const priorityWeights = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4,
    }

    const priorityWeight = priorityWeights[data.storyType === 'bug' ? 'high' : data.storyType || 'medium']
    const pointsWeight = (data.storyPoints || 1) / 10

    return priorityWeight + pointsWeight
  }

  /**
   * Get epic info
   */
  private async getEpicInfo(epicId: string) {
    const [epic] = await db
      .select({
        id: epics.id,
        projectId: epics.projectId,
        organizationId: epics.organizationId,
      })
      .from(epics)
      .where(eq(epics.id, epicId))
      .limit(1)

    if (!epic) {
      throw new NotFoundError('Epic')
    }

    if (epic.organizationId !== this.userContext.organizationId) {
      throw new ForbiddenError('Access denied to this epic')
    }

    return epic
  }

  /**
   * Verify epic access
   */
  private async verifyEpicAccess(epicId: string) {
    await this.getEpicInfo(epicId)
  }

  /**
   * Verify project access
   */
  private async verifyProjectAccess(projectId: string) {
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
   * Check if user can modify stories
   */
  private canModify(): boolean {
    return this.userContext.role === 'admin' || this.userContext.role === 'member'
  }

  /**
   * Check if user can modify specific story
   */
  private canModifyStory(story: any): boolean {
    // Admins can modify any story
    if (this.userContext.role === 'admin') return true

    // Members can modify any story in their org
    if (this.userContext.role === 'member') return true

    // Story creator can modify their story
    if (story.createdBy === this.userContext.id) return true

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


