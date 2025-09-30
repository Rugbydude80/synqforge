import { db, generateId } from '@/lib/db'
import { users, activities, stories, projects, sprints } from '@/lib/db/schema'
import { eq, and, desc, sql, count, like, or, asc } from 'drizzle-orm'
import {
  UpdateUserInput,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/types'
import { UserContext } from '@/lib/middleware/auth'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: 'admin' | 'member' | 'viewer'
  isActive: boolean
  preferences: Record<string, any> | null
  lastActiveAt: Date | null
  createdAt: Date
  // Extended info
  projectsOwned: number
  storiesCreated: number
  storiesAssigned: number
  activitiesCount: number
}

export interface UserStats {
  projectsOwned: number
  storiesCreated: number
  storiesAssigned: number
  storiesCompleted: number
  storiesInProgress: number
  totalStoryPoints: number
  completionRate: number
  activitiesCount: number
  lastActiveAt: Date | null
  memberSince: Date
}

export interface UserActivity {
  id: string
  action: string
  resourceType: string
  resourceId: string
  projectId: string | null
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  metadata: Record<string, any> | null
  createdAt: Date
}

export class UsersRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get current user profile with extended info
   */
  async getCurrentUser(): Promise<UserProfile> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        preferences: users.preferences,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt,
        // Extended stats
        projectsOwned: sql<number>`(
          SELECT COUNT(*) FROM ${projects} 
          WHERE ${projects.ownerId} = ${users.id}
        )`,
        storiesCreated: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.createdBy} = ${users.id}
        )`,
        storiesAssigned: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.assignedTo} = ${users.id}
        )`,
        activitiesCount: sql<number>`(
          SELECT COUNT(*) FROM ${activities} 
          WHERE ${activities.userId} = ${users.id}
        )`,
      })
      .from(users)
      .where(eq(users.id, this.userContext.id))
      .limit(1)

    if (!user) {
      throw new NotFoundError('User')
    }

    return user
  }

  /**
   * Get user by ID with extended info
   */
  async getUserById(userId: string): Promise<UserProfile> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        preferences: users.preferences,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt,
        // Extended stats
        projectsOwned: sql<number>`(
          SELECT COUNT(*) FROM ${projects} 
          WHERE ${projects.ownerId} = ${users.id}
        )`,
        storiesCreated: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.createdBy} = ${users.id}
        )`,
        storiesAssigned: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.assignedTo} = ${users.id}
        )`,
        activitiesCount: sql<number>`(
          SELECT COUNT(*) FROM ${activities} 
          WHERE ${activities.userId} = ${users.id}
        )`,
      })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, this.userContext.organizationId)
        )
      )
      .limit(1)

    if (!user) {
      throw new NotFoundError('User')
    }

    return user
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(updates: UpdateUserInput): Promise<UserProfile> {
    // Update user
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, this.userContext.id))

    // Log activity
    await this.logActivity(
      'updated_profile',
      'user',
      this.userContext.id,
      null,
      null,
      updates
    )

    // Return updated user
    return this.getCurrentUser()
  }

  /**
   * Update user profile (for current user)
   */
  async updateProfile(userId: string, updates: { name?: string; avatarUrl?: string | null; preferences?: Record<string, any> }): Promise<UserProfile> {
    // Verify user can update this profile
    if (userId !== this.userContext.id) {
      throw new ForbiddenError('Can only update your own profile')
    }

    // Update user
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    // Log activity
    await this.logActivity(
      'updated_profile',
      'user',
      userId,
      null,
      null,
      updates
    )

    // Return updated user
    return this.getCurrentUser()
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    userId: string,
    pagination: { limit: number; offset: number }
  ): Promise<UserActivity[]> {
    // Verify user exists and is in same organization
    await this.getUserById(userId)

    const activities = await db
      .select({
        id: activities.id,
        action: activities.action,
        resourceType: activities.resourceType,
        resourceId: activities.resourceId,
        projectId: activities.projectId,
        oldValues: activities.oldValues,
        newValues: activities.newValues,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          eq(activities.organizationId, this.userContext.organizationId)
        )
      )
      .orderBy(desc(activities.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset)

    return activities
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    // Verify user exists and is in same organization
    await this.getUserById(userId)

    const [stats] = await db
      .select({
        projectsOwned: sql<number>`(
          SELECT COUNT(*) FROM ${projects} 
          WHERE ${projects.ownerId} = ${userId}
        )`,
        storiesCreated: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.createdBy} = ${userId}
        )`,
        storiesAssigned: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.assignedTo} = ${userId}
        )`,
        storiesCompleted: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.assignedTo} = ${userId} 
          AND ${stories.status} = 'done'
        )`,
        storiesInProgress: sql<number>`(
          SELECT COUNT(*) FROM ${stories} 
          WHERE ${stories.assignedTo} = ${userId} 
          AND ${stories.status} = 'in_progress'
        )`,
        totalStoryPoints: sql<number>`(
          SELECT COALESCE(SUM(${stories.storyPoints}), 0) FROM ${stories} 
          WHERE ${stories.assignedTo} = ${userId}
        )`,
        activitiesCount: sql<number>`(
          SELECT COUNT(*) FROM ${activities} 
          WHERE ${activities.userId} = ${userId}
        )`,
        lastActiveAt: users.lastActiveAt,
        memberSince: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!stats) {
      throw new NotFoundError('User')
    }

    const storiesAssigned = Number(stats.storiesAssigned || 0)
    const storiesCompleted = Number(stats.storiesCompleted || 0)
    const completionRate = storiesAssigned > 0 
      ? Math.round((storiesCompleted / storiesAssigned) * 100) 
      : 0

    return {
      projectsOwned: Number(stats.projectsOwned || 0),
      storiesCreated: Number(stats.storiesCreated || 0),
      storiesAssigned,
      storiesCompleted,
      storiesInProgress: Number(stats.storiesInProgress || 0),
      totalStoryPoints: Number(stats.totalStoryPoints || 0),
      completionRate,
      activitiesCount: Number(stats.activitiesCount || 0),
      lastActiveAt: stats.lastActiveAt,
      memberSince: stats.memberSince,
    }
  }

  /**
   * Get stories assigned to a user
   */
  async getUserStories(
    userId: string,
    filters: { status?: string; projectId?: string },
    pagination: { limit: number; offset: number }
  ) {
    // Verify user exists and is in same organization
    await this.getUserById(userId)

    // Build where conditions
    const whereConditions = [
      eq(stories.assignedTo, userId),
      eq(stories.organizationId, this.userContext.organizationId),
    ]

    if (filters.status) {
      whereConditions.push(eq(stories.status, filters.status as any))
    }

    if (filters.projectId) {
      whereConditions.push(eq(stories.projectId, filters.projectId))
    }

    const userStories = await db
      .select({
        id: stories.id,
        epicId: stories.epicId,
        projectId: stories.projectId,
        title: stories.title,
        description: stories.description,
        storyPoints: stories.storyPoints,
        status: stories.status,
        storyType: stories.storyType,
        labels: stories.labels,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        // Project info
        projectName: projects.name,
        projectSlug: projects.slug,
      })
      .from(stories)
      .leftJoin(projects, eq(stories.projectId, projects.id))
      .where(and(...whereConditions))
      .orderBy(desc(stories.updatedAt))
      .limit(pagination.limit)
      .offset(pagination.offset)

    return userStories
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string) {
    const searchResults = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        lastActiveAt: users.lastActiveAt,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, this.userContext.organizationId),
          or(
            like(users.name, `%${query}%`),
            like(users.email, `%${query}%`)
          )
        )
      )
      .orderBy(asc(users.name))
      .limit(20)

    return searchResults
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(userId: string) {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId))
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
