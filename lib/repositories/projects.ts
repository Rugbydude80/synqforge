import { db, generateId } from '@/lib/db'
import { projects, users, epics, stories, sprints, activities } from '@/lib/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import {
  CreateProjectInput,
  UpdateProjectInput,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/types'
import { UserContext } from '@/lib/middleware/auth'

export class ProjectsRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get all projects for user's organization
   */
  async getProjects() {
    const query = db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        slug: projects.slug,
        status: projects.status,
        ownerId: projects.ownerId,
        settings: projects.settings,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Aggregate counts
        epicCount: sql<number>`(
          SELECT COUNT(*) FROM ${epics}
          WHERE ${epics.projectId} = ${projects.id}
        )`,
        storyCount: sql<number>`(
          SELECT COUNT(*) FROM ${stories}
          WHERE ${stories.projectId} = ${projects.id}
        )`,
        completedStoryCount: sql<number>`(
          SELECT COUNT(*) FROM ${stories}
          WHERE ${stories.projectId} = ${projects.id}
          AND ${stories.status} = 'done'
        )`,
        aiGeneratedStoryCount: sql<number>`(
          SELECT COUNT(*) FROM ${stories}
          WHERE ${stories.projectId} = ${projects.id}
          AND ${stories.aiGenerated} = true
        )`,
        activeSprintCount: sql<number>`(
          SELECT COUNT(*) FROM ${sprints}
          WHERE ${sprints.projectId} = ${projects.id}
          AND ${sprints.status} = 'active'
        )`,
      })
      .from(projects)
      .where(eq(projects.organizationId, this.userContext.organizationId))
      .orderBy(desc(projects.createdAt))

    // Note: Status filter removed - needs to be implemented with conditions array before select
    // TODO: Implement filters by building conditions array before select

    const result = await query

    return result
  }

  /**
   * Get single project by ID
   */
  async getProjectById(projectId: string) {
    const [project] = await db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
        name: projects.name,
        description: projects.description,
        slug: projects.slug,
        status: projects.status,
        ownerId: projects.ownerId,
        settings: projects.settings,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Owner info
        ownerName: users.name,
        ownerEmail: users.email,
        // Aggregate counts
        epicCount: sql<number>`(
          SELECT COUNT(*) FROM ${epics} 
          WHERE ${epics.projectId} = ${projects.id}
        )`,
        storyCount: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.projectId} = ${projects.id}
        )`,
        completedStoryCount: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.projectId} = ${projects.id} 
          AND ${stories.status} = 'done'
        )`,
        sprintCount: sql<number>`(
          SELECT COUNT(*) FROM ${sprints} 
          WHERE ${sprints.projectId} = ${projects.id}
        )`,
      })
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project')
    }

    // Verify organization access
    if (project.organizationId !== this.userContext.organizationId) {
      const mismatchInfo = {
        projectOrg: project.organizationId,
        userOrg: this.userContext.organizationId,
        projectId: project.id,
        userId: this.userContext.id
      }
      console.error('Organization mismatch:', mismatchInfo)

      // Throw detailed error for debugging
      const error = new ForbiddenError(
        `Organization mismatch: Project has org "${project.organizationId}" but user has org "${this.userContext.organizationId}". Please sign out and sign back in to refresh your session.`
      )
      throw error
    }

    return project
  }

  /**
   * Get project by slug
   */
  async getProjectBySlug(slug: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.organizationId, this.userContext.organizationId)
        )
      )
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project')
    }

    return project
  }

  /**
   * Create new project
   */
  async createProject(data: CreateProjectInput) {
    if (!this.canModify()) {
      throw new ForbiddenError('Cannot create projects')
    }

    // Verify owner exists and belongs to org
    await this.verifyUserInOrg(data.ownerId)

    // Check slug uniqueness
    await this.verifySlugUnique(data.slug)

    const projectId = generateId()

    await db.insert(projects).values({
      id: projectId,
      organizationId: this.userContext.organizationId,
      ...data,
    })

    // Get the created project
    const createdProject = await this.getProjectById(projectId)

    // Log activity
    await this.logActivity(
      'created_project',
      'project',
      projectId,
      projectId,
      null,
      createdProject
    )

    return createdProject
  }

  /**
   * Update existing project
   */
  async updateProject(projectId: string, updates: UpdateProjectInput) {
    const project = await this.getProjectById(projectId)

    if (!this.canModifyProject(project)) {
      throw new ForbiddenError('Cannot modify this project')
    }

    // If updating slug, verify uniqueness
    if (updates.slug && updates.slug !== project.slug) {
      await this.verifySlugUnique(updates.slug)
    }

    // If updating owner, verify they're in org
    if (updates.ownerId && updates.ownerId !== project.ownerId) {
      await this.verifyUserInOrg(updates.ownerId)
    }

    await db
      .update(projects)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))

    // Get updated project
    const updatedProject = await this.getProjectById(projectId)

    // Log activity
    await this.logActivity(
      'updated_project',
      'project',
      projectId,
      projectId,
      project,
      updatedProject
    )

    return updatedProject
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string) {
    const project = await this.getProjectById(projectId)

    if (!this.canModifyProject(project)) {
      throw new ForbiddenError('Cannot delete this project')
    }

    // Check if project has content
    const hasContent = await this.checkProjectHasContent(projectId)
    if (hasContent) {
      throw new ConflictError(
        'Cannot delete project with existing epics or stories. Archive it instead.'
      )
    }

    await db.delete(projects).where(eq(projects.id, projectId))

    // Log activity
    await this.logActivity(
      'deleted_project',
      'project',
      projectId,
      projectId,
      project,
      null
    )

    return { success: true }
  }

  /**
   * Archive project (soft delete alternative)
   */
  async archiveProject(projectId: string) {
    return this.updateProject(projectId, { status: 'archived' })
  }

  /**
   * Get project statistics
   * Uses raw SQL to avoid query builder issues when no related data exists
   */
  async getProjectStats(projectId: string) {
    await this.getProjectById(projectId) // Verify access

    const statsResult = await db.execute<{
      totalEpics: number
      totalStories: number
      completedStories: number
      inProgressStories: number
      totalStoryPoints: number | null
      completedStoryPoints: number | null
      totalSprints: number
      activeSprints: number
    }>(sql`
      SELECT 
        (
          SELECT COUNT(*)::int 
          FROM ${epics} 
          WHERE ${epics.projectId} = ${projectId}
        ) as "totalEpics",
        (
          SELECT COUNT(*)::int 
          FROM ${stories} 
          WHERE ${stories.projectId} = ${projectId}
        ) as "totalStories",
        (
          SELECT COUNT(*)::int 
          FROM ${stories} 
          WHERE ${stories.projectId} = ${projectId}
          AND ${stories.status} = 'done'
        ) as "completedStories",
        (
          SELECT COUNT(*)::int 
          FROM ${stories} 
          WHERE ${stories.projectId} = ${projectId}
          AND ${stories.status} = 'in_progress'
        ) as "inProgressStories",
        (
          SELECT COALESCE(SUM(${stories.storyPoints}), 0)::int 
          FROM ${stories} 
          WHERE ${stories.projectId} = ${projectId}
        ) as "totalStoryPoints",
        (
          SELECT COALESCE(SUM(${stories.storyPoints}), 0)::int 
          FROM ${stories} 
          WHERE ${stories.projectId} = ${projectId}
          AND ${stories.status} = 'done'
        ) as "completedStoryPoints",
        (
          SELECT COUNT(*)::int 
          FROM ${sprints} 
          WHERE ${sprints.projectId} = ${projectId}
        ) as "totalSprints",
        (
          SELECT COUNT(*)::int 
          FROM ${sprints} 
          WHERE ${sprints.projectId} = ${projectId}
          AND ${sprints.status} = 'active'
        ) as "activeSprints"
    `)

    const stats = (statsResult[0] as any) || {
      totalEpics: 0,
      totalStories: 0,
      completedStories: 0,
      inProgressStories: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      totalSprints: 0,
      activeSprints: 0,
    }

    return {
      totalEpics: Number(stats.totalEpics) || 0,
      totalStories: Number(stats.totalStories) || 0,
      completedStories: Number(stats.completedStories) || 0,
      inProgressStories: Number(stats.inProgressStories) || 0,
      totalStoryPoints: Number(stats.totalStoryPoints) || 0,
      completedStoryPoints: Number(stats.completedStoryPoints) || 0,
      totalSprints: Number(stats.totalSprints) || 0,
      activeSprints: Number(stats.activeSprints) || 0,
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
   * Verify slug is unique within organization
   */
  private async verifySlugUnique(slug: string) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.organizationId, this.userContext.organizationId)
        )
      )
      .limit(1)

    if (existing) {
      throw new ConflictError(`Project with slug "${slug}" already exists`)
    }
  }

  /**
   * Check if project has any content
   */
  private async checkProjectHasContent(projectId: string): Promise<boolean> {
    const [result] = await db
      .select({
        epicCount: count(epics.id),
        storyCount: count(stories.id),
      })
      .from(projects)
      .leftJoin(epics, eq(epics.projectId, projects.id))
      .leftJoin(stories, eq(stories.projectId, projects.id))
      .where(eq(projects.id, projectId))
      .groupBy(projects.id)

    return (result?.epicCount || 0) > 0 || (result?.storyCount || 0) > 0
  }

  /**
   * Check if user can modify projects
   */
  private canModify(): boolean {
    return this.userContext.role === 'admin' || this.userContext.role === 'member'
  }

  /**
   * Check if user can modify specific project
   */
  private canModifyProject(project: any): boolean {
    // Admins can modify any project
    if (this.userContext.role === 'admin') return true
    
    // Members can modify any project in their org
    if (this.userContext.role === 'member') return true
    
    // Project owner can modify their project
    if (project.ownerId === this.userContext.id) return true
    
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
