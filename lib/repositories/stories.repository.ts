import { db } from '@/lib/db';
import {
  stories,
  epics,
  projects,
  users,
  sprintStories,
  sprints,
  activities
} from '@/lib/db/schema';
import { eq, and, desc, asc, sql, inArray, isNull, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateStoryInput {
  projectId: string;
  epicId?: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  storyPoints?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  status?: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  tags?: string[];
  aiGenerated?: boolean;
  aiPrompt?: string;
  aiModelUsed?: string;
}

export interface UpdateStoryInput {
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  storyPoints?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  status?: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  tags?: string[];
  epicId?: string;
}

export interface StoryFilters {
  projectId?: string;
  epicId?: string;
  assigneeId?: string;
  status?: string | string[];
  priority?: string | string[];
  aiGenerated?: boolean;
  tags?: string[];
}

export interface StoryWithRelations {
  id: string;
  projectId: string;
  epicId: string | null;
  title: string;
  description: string | null;
  acceptanceCriteria: string[] | null;
  storyPoints: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  assigneeId: string | null;
  tags: string[] | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  aiModelUsed: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    key: string;
  };
  epic?: {
    id: string;
    title: string;
    color: string;
  } | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  currentSprint?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  } | null;
}

export class StoriesRepository {
  /**
   * Create a new story
   */
  async create(input: CreateStoryInput, userId: string): Promise<StoryWithRelations> {
    const storyId = nanoid();

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, input.projectId)
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Verify epic exists if provided
    if (input.epicId) {
      const epic = await db.query.epics.findFirst({
        where: and(
          eq(epics.id, input.epicId),
          eq(epics.projectId, input.projectId)
        )
      });

      if (!epic) {
        throw new Error('Epic not found or does not belong to this project');
      }
    }

    // Verify assignee exists if provided
    if (input.assigneeId) {
      const assignee = await db.query.users.findFirst({
        where: eq(users.id, input.assigneeId)
      });

      if (!assignee) {
        throw new Error('Assignee not found');
      }
    }

    // Create story
    await db.insert(stories).values({
      id: storyId,
      projectId: input.projectId,
      epicId: input.epicId || null,
      title: input.title,
      description: input.description || null,
      acceptanceCriteria: input.acceptanceCriteria || null,
      storyPoints: input.storyPoints || null,
      priority: input.priority,
      status: input.status || 'backlog',
      assigneeId: input.assigneeId || null,
      tags: input.tags || null,
      aiGenerated: input.aiGenerated || false,
      aiPrompt: input.aiPrompt || null,
      aiModelUsed: input.aiModelUsed || null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Log activity
    await db.insert(activities).values({
      id: nanoid(),
      userId,
      projectId: input.projectId,
      type: 'story_created',
      entityType: 'story',
      entityId: storyId,
      metadata: {
        storyTitle: input.title,
        priority: input.priority,
        aiGenerated: input.aiGenerated || false
      },
      createdAt: new Date()
    });

    return this.getById(storyId);
  }

  /**
   * Get story by ID with all relations
   */
  async getById(storyId: string): Promise<StoryWithRelations> {
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId),
      with: {
        project: {
          columns: {
            id: true,
            name: true,
            key: true
          }
        },
        epic: {
          columns: {
            id: true,
            title: true,
            color: true
          }
        },
        assignee: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!story) {
      throw new Error('Story not found');
    }

    // Get current sprint if any
    const currentSprintRelation = await db.query.sprintStories.findFirst({
      where: eq(sprintStories.storyId, storyId),
      with: {
        sprint: {
          columns: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true
          }
        }
      },
      orderBy: [desc(sprintStories.addedAt)]
    });

    return {
      ...story,
      currentSprint: currentSprintRelation?.sprint.status === 'active'
        ? currentSprintRelation.sprint
        : null
    };
  }

  /**
   * Update story
   */
  async update(
    storyId: string,
    input: UpdateStoryInput,
    userId: string
  ): Promise<StoryWithRelations> {
    // Verify story exists
    const existingStory = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!existingStory) {
      throw new Error('Story not found');
    }

    // Verify epic if provided
    if (input.epicId !== undefined) {
      if (input.epicId) {
        const epic = await db.query.epics.findFirst({
          where: and(
            eq(epics.id, input.epicId),
            eq(epics.projectId, existingStory.projectId)
          )
        });

        if (!epic) {
          throw new Error('Epic not found or does not belong to this project');
        }
      }
    }

    // Verify assignee if provided
    if (input.assigneeId !== undefined) {
      if (input.assigneeId) {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, input.assigneeId)
        });

        if (!assignee) {
          throw new Error('Assignee not found');
        }
      }
    }

    // Track what changed for activity log
    const changes: Record<string, any> = {};
    if (input.status && input.status !== existingStory.status) {
      changes.status = { from: existingStory.status, to: input.status };
    }
    if (input.priority && input.priority !== existingStory.priority) {
      changes.priority = { from: existingStory.priority, to: input.priority };
    }
    if (input.assigneeId !== undefined && input.assigneeId !== existingStory.assigneeId) {
      changes.assignee = { from: existingStory.assigneeId, to: input.assigneeId };
    }

    // Update story
    await db.update(stories)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(stories.id, storyId));

    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      await db.insert(activities).values({
        id: nanoid(),
        userId,
        projectId: existingStory.projectId,
        type: 'story_updated',
        entityType: 'story',
        entityId: storyId,
        metadata: {
          storyTitle: existingStory.title,
          changes
        },
        createdAt: new Date()
      });
    }

    return this.getById(storyId);
  }

  /**
   * Delete story (soft delete by setting status to archived)
   */
  async delete(storyId: string, userId: string): Promise<void> {
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!story) {
      throw new Error('Story not found');
    }

    // Remove from any sprints
    await db.delete(sprintStories)
      .where(eq(sprintStories.storyId, storyId));

    // Soft delete by updating status
    await db.update(stories)
      .set({
        status: 'backlog', // Move to backlog as "archived" state
        updatedAt: new Date()
      })
      .where(eq(stories.id, storyId));

    // Log activity
    await db.insert(activities).values({
      id: nanoid(),
      userId,
      projectId: story.projectId,
      type: 'story_deleted',
      entityType: 'story',
      entityId: storyId,
      metadata: {
        storyTitle: story.title
      },
      createdAt: new Date()
    });
  }

  /**
   * List stories with filters
   */
  async list(
    filters: StoryFilters = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'updatedAt' | 'priority' | 'storyPoints';
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<{ stories: StoryWithRelations[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = options;

    // Build where conditions
    const conditions = [];

    if (filters.projectId) {
      conditions.push(eq(stories.projectId, filters.projectId));
    }

    if (filters.epicId !== undefined) {
      conditions.push(
        filters.epicId === null
          ? isNull(stories.epicId)
          : eq(stories.epicId, filters.epicId)
      );
    }

    if (filters.assigneeId !== undefined) {
      conditions.push(
        filters.assigneeId === null
          ? isNull(stories.assigneeId)
          : eq(stories.assigneeId, filters.assigneeId)
      );
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(stories.status, filters.status as any));
      } else {
        conditions.push(eq(stories.status, filters.status as any));
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(inArray(stories.priority, filters.priority as any));
      } else {
        conditions.push(eq(stories.priority, filters.priority as any));
      }
    }

    if (filters.aiGenerated !== undefined) {
      conditions.push(eq(stories.aiGenerated, filters.aiGenerated));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stories)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get stories
    const orderColumn = orderBy === 'createdAt' ? stories.createdAt
      : orderBy === 'updatedAt' ? stories.updatedAt
      : orderBy === 'priority' ? stories.priority
      : stories.storyPoints;

    const storiesData = await db.query.stories.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit,
      offset,
      orderBy: orderDirection === 'desc' ? [desc(orderColumn)] : [asc(orderColumn)],
      with: {
        project: {
          columns: {
            id: true,
            name: true,
            key: true
          }
        },
        epic: {
          columns: {
            id: true,
            title: true,
            color: true
          }
        },
        assignee: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Fetch current sprints for all stories
    const storyIds = storiesData.map(s => s.id);
    const sprintRelations = storyIds.length > 0
      ? await db.query.sprintStories.findMany({
          where: inArray(sprintStories.storyId, storyIds),
          with: {
            sprint: {
              columns: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                status: true
              }
            }
          }
        })
      : [];

    const sprintMap = new Map(
      sprintRelations
        .filter(sr => sr.sprint.status === 'active')
        .map(sr => [sr.storyId, sr.sprint])
    );

    return {
      stories: storiesData.map(story => ({
        ...story,
        currentSprint: sprintMap.get(story.id) || null
      })),
      total: count
    };
  }

  /**
   * Get stories by epic
   */
  async getByEpic(epicId: string): Promise<StoryWithRelations[]> {
    const { stories: storiesData } = await this.list({ epicId });
    return storiesData;
  }

  /**
   * Get stories by sprint
   */
  async getBySprint(sprintId: string): Promise<StoryWithRelations[]> {
    const sprintStoryRelations = await db.query.sprintStories.findMany({
      where: eq(sprintStories.sprintId, sprintId),
      with: {
        story: {
          with: {
            project: {
              columns: {
                id: true,
                name: true,
                key: true
              }
            },
            epic: {
              columns: {
                id: true,
                title: true,
                color: true
              }
            },
            assignee: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            },
            creator: {
              columns: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        sprint: {
          columns: {
            id: true,
            name: true,
            startDate: true,
            endDate: true
          }
        }
      }
    });

    return sprintStoryRelations.map(relation => ({
      ...relation.story,
      currentSprint: relation.sprint
    }));
  }

  /**
   * Assign story to sprint
   */
  async assignToSprint(
    storyId: string,
    sprintId: string,
    userId: string
  ): Promise<void> {
    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!story) {
      throw new Error('Story not found');
    }

    // Verify sprint exists and is in same project
    const sprint = await db.query.sprints.findFirst({
      where: and(
        eq(sprints.id, sprintId),
        eq(sprints.projectId, story.projectId)
      )
    });

    if (!sprint) {
      throw new Error('Sprint not found or does not belong to same project');
    }

    // Check if already assigned
    const existing = await db.query.sprintStories.findFirst({
      where: and(
        eq(sprintStories.sprintId, sprintId),
        eq(sprintStories.storyId, storyId)
      )
    });

    if (existing) {
      throw new Error('Story already assigned to this sprint');
    }

    // Assign to sprint
    await db.insert(sprintStories).values({
      sprintId,
      storyId,
      addedAt: new Date(),
      addedBy: userId
    });

    // Log activity
    await db.insert(activities).values({
      id: nanoid(),
      userId,
      projectId: story.projectId,
      type: 'story_sprint_assigned',
      entityType: 'story',
      entityId: storyId,
      metadata: {
        storyTitle: story.title,
        sprintName: sprint.name
      },
      createdAt: new Date()
    });
  }

  /**
   * Remove story from sprint
   */
  async removeFromSprint(
    storyId: string,
    sprintId: string,
    userId: string
  ): Promise<void> {
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!story) {
      throw new Error('Story not found');
    }

    await db.delete(sprintStories)
      .where(and(
        eq(sprintStories.sprintId, sprintId),
        eq(sprintStories.storyId, storyId)
      ));

    // Log activity
    await db.insert(activities).values({
      id: nanoid(),
      userId,
      projectId: story.projectId,
      type: 'story_sprint_removed',
      entityType: 'story',
      entityId: storyId,
      metadata: {
        storyTitle: story.title
      },
      createdAt: new Date()
    });
  }

  /**
   * Bulk create stories (for AI generation)
   */
  async bulkCreate(
    stories: CreateStoryInput[],
    userId: string
  ): Promise<StoryWithRelations[]> {
    const createdStories: StoryWithRelations[] = [];

    for (const storyInput of stories) {
      const story = await this.create(storyInput, userId);
      createdStories.push(story);
    }

    return createdStories;
  }

  /**
   * Get story statistics for a project
   */
  async getProjectStats(projectId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    totalPoints: number;
    completedPoints: number;
    aiGenerated: number;
  }> {
    const projectStories = await db.query.stories.findMany({
      where: eq(stories.projectId, projectId)
    });

    const stats = {
      total: projectStories.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      totalPoints: 0,
      completedPoints: 0,
      aiGenerated: 0
    };

    projectStories.forEach(story => {
      // Status counts
      stats.byStatus[story.status] = (stats.byStatus[story.status] || 0) + 1;

      // Priority counts
      stats.byPriority[story.priority] = (stats.byPriority[story.priority] || 0) + 1;

      // Points
      if (story.storyPoints) {
        stats.totalPoints += story.storyPoints;
        if (story.status === 'done') {
          stats.completedPoints += story.storyPoints;
        }
      }

      // AI generated
      if (story.aiGenerated) {
        stats.aiGenerated++;
      }
    });

    return stats;
  }
}

export const storiesRepository = new StoriesRepository();
