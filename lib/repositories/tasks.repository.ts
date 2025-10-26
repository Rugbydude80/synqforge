import { db } from '@/lib/db';
import { generateId } from '@/lib/db';
import {
  tasks,
  stories,
  projects,
  users,
  activities
} from '@/lib/db/schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';

export interface CreateTaskInput {
  storyId: string;
  projectId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: 'todo' | 'in_progress' | 'done' | 'blocked';
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string | null;
  tags?: string[];
  orderIndex?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'todo' | 'in_progress' | 'done' | 'blocked';
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string | null;
  tags?: string[];
  orderIndex?: number;
}

export interface TaskFilters {
  storyId?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string | string[];
  priority?: string | string[];
  tags?: string[];
  organizationId?: string;
}

export interface TaskWithRelations {
  id: string;
  storyId: string;
  projectId: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | null;
  priority: 'low' | 'medium' | 'high' | 'critical' | null;
  estimatedHours: number | null;
  actualHours: number | null;
  assigneeId: string | null;
  tags: string[] | null;
  orderIndex: number | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  story?: {
    id: string;
    title: string;
  };
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export class TasksRepository {
  /**
   * Create a new task
   */
  async create(input: CreateTaskInput, userId: string): Promise<TaskWithRelations> {
    const taskId = generateId();

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, input.storyId)
    });

    if (!story) {
      throw new Error('Story not found');
    }

    // Verify project matches story's project
    if (story.projectId !== input.projectId) {
      throw new Error('Task project must match story project');
    }

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, input.projectId)
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Verify assignee exists if provided
    if (input.assigneeId) {
      const assignee = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.assigneeId),
          eq(users.organizationId, project.organizationId)
        )
      });

      if (!assignee) {
        throw new Error('Assignee not found in organization');
      }
    }

    // Get next order index if not provided
    let orderIndex = input.orderIndex ?? 0;
    if (orderIndex === 0) {
      const [result] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${tasks.orderIndex}), -1)` })
        .from(tasks)
        .where(eq(tasks.storyId, input.storyId));
      orderIndex = (result?.maxOrder ?? -1) + 1;
    }

    // Create task
    await db.insert(tasks).values({
      id: taskId,
      organizationId: project.organizationId,
      storyId: input.storyId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: input.status ?? 'todo',
      estimatedHours: input.estimatedHours,
      actualHours: input.actualHours,
      assigneeId: input.assigneeId,
      tags: input.tags ?? [],
      orderIndex,
      createdBy: userId,
    });

    // Log activity
    await this.logActivity(
      project.organizationId,
      userId,
      'created_task',
      'task',
      taskId,
      input.projectId,
      null,
      { title: input.title, storyId: input.storyId }
    );

    return this.getById(taskId);
  }

  /**
   * Get task by ID
   */
  async getById(taskId: string): Promise<TaskWithRelations> {
    const result = await db
      .select({
        id: tasks.id,
        storyId: tasks.storyId,
        projectId: tasks.projectId,
        organizationId: tasks.organizationId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        assigneeId: tasks.assigneeId,
        tags: tasks.tags,
        orderIndex: tasks.orderIndex,
        completedAt: tasks.completedAt,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        story: {
          id: stories.id,
          title: stories.title,
        },
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
        creator: {
          id: sql<string>`creator.id`,
          name: sql<string>`creator.name`,
          email: sql<string>`creator.email`,
        },
      })
      .from(tasks)
      .leftJoin(stories, eq(tasks.storyId, stories.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .leftJoin(sql`users creator`, sql`${tasks.createdBy} = creator.id`)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!result || result.length === 0) {
      throw new Error('Task not found');
    }

    return result[0] as TaskWithRelations;
  }

  /**
   * List tasks with filters
   */
  async list(
    filters: TaskFilters,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'updatedAt' | 'priority' | 'orderIndex';
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<{ tasks: TaskWithRelations[]; total: number }> {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'orderIndex',
      orderDirection = 'asc',
    } = options;

    // Build where conditions
    const conditions = [];

    if (filters.organizationId) {
      conditions.push(eq(tasks.organizationId, filters.organizationId));
    }

    if (filters.storyId) {
      conditions.push(eq(tasks.storyId, filters.storyId));
    }

    if (filters.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }

    if (filters.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(tasks.status, filters.status as any[]));
      } else {
        conditions.push(eq(tasks.status, filters.status as any));
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(inArray(tasks.priority, filters.priority as any[]));
      } else {
        conditions.push(eq(tasks.priority, filters.priority as any));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    // Get tasks
    const orderColumn = {
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      priority: tasks.priority,
      orderIndex: tasks.orderIndex,
    }[orderBy];

    const orderFn = orderDirection === 'asc' ? asc : desc;

    const result = await db
      .select({
        id: tasks.id,
        storyId: tasks.storyId,
        projectId: tasks.projectId,
        organizationId: tasks.organizationId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        assigneeId: tasks.assigneeId,
        tags: tasks.tags,
        orderIndex: tasks.orderIndex,
        completedAt: tasks.completedAt,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        story: {
          id: stories.id,
          title: stories.title,
        },
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
        creator: {
          id: sql<string>`creator.id`,
          name: sql<string>`creator.name`,
          email: sql<string>`creator.email`,
        },
      })
      .from(tasks)
      .leftJoin(stories, eq(tasks.storyId, stories.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .leftJoin(sql`users creator`, sql`${tasks.createdBy} = creator.id`)
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      tasks: result as TaskWithRelations[],
      total,
    };
  }

  /**
   * Update task
   */
  async update(taskId: string, input: UpdateTaskInput, userId: string): Promise<TaskWithRelations> {
    // Get existing task
    const existingTask = await this.getById(taskId);

    // Verify assignee if provided
    if (input.assigneeId !== undefined && input.assigneeId !== null) {
      const assignee = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.assigneeId),
          eq(users.organizationId, existingTask.organizationId)
        )
      });

      if (!assignee) {
        throw new Error('Assignee not found in organization');
      }
    }

    // Update completed_at if status changes to 'done'
    const updateData: any = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.status === 'done' && existingTask.status !== 'done') {
      updateData.completedAt = new Date();
    } else if (input.status && input.status !== 'done' && existingTask.status === 'done') {
      updateData.completedAt = null;
    }

    await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId));

    // Log activity
    await this.logActivity(
      existingTask.organizationId,
      userId,
      'updated_task',
      'task',
      taskId,
      existingTask.projectId,
      existingTask,
      { ...existingTask, ...updateData }
    );

    return this.getById(taskId);
  }

  /**
   * Delete task
   */
  async delete(taskId: string, userId: string): Promise<void> {
    const task = await this.getById(taskId);

    await db.delete(tasks).where(eq(tasks.id, taskId));

    // Log activity
    await this.logActivity(
      task.organizationId,
      userId,
      'deleted_task',
      'task',
      taskId,
      task.projectId,
      task,
      null
    );
  }

  /**
   * Reorder tasks within a story
   */
  async reorder(storyId: string, taskIds: string[], _userId: string): Promise<void> {
    // Verify all tasks belong to the story
    const tasksToReorder = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.storyId, storyId),
          inArray(tasks.id, taskIds)
        )
      );

    if (tasksToReorder.length !== taskIds.length) {
      throw new Error('Some tasks do not belong to this story');
    }

    // Update order indices
    for (let i = 0; i < taskIds.length; i++) {
      await db
        .update(tasks)
        .set({ orderIndex: i })
        .where(eq(tasks.id, taskIds[i]));
    }
  }

  /**
   * Get task statistics for a story
   */
  async getStoryTaskStats(storyId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
    totalEstimatedHours: number;
    totalActualHours: number;
  }> {
    const [result] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        todo: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'todo' THEN 1 END)`,
        inProgress: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END)`,
        done: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'done' THEN 1 END)`,
        blocked: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'blocked' THEN 1 END)`,
        totalEstimatedHours: sql<number>`SUM(${tasks.estimatedHours})`,
        totalActualHours: sql<number>`SUM(${tasks.actualHours})`,
      })
      .from(tasks)
      .where(eq(tasks.storyId, storyId));

    return {
      total: Number(result?.total || 0),
      todo: Number(result?.todo || 0),
      inProgress: Number(result?.inProgress || 0),
      done: Number(result?.done || 0),
      blocked: Number(result?.blocked || 0),
      totalEstimatedHours: Number(result?.totalEstimatedHours || 0),
      totalActualHours: Number(result?.totalActualHours || 0),
    };
  }

  /**
   * Log activity
   */
  private async logActivity(
    organizationId: string,
    userId: string,
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
        organizationId,
        userId,
        action,
        resourceType,
        resourceId,
        projectId,
        oldValues,
        newValues,
        metadata: { source: 'api', userAgent: 'web' },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

export const tasksRepository = new TasksRepository();
