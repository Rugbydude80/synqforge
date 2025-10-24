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
import { eq, and, desc, asc, sql, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateStoryInput {
  projectId: string;
  epicId?: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  storyPoints?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  storyType?: 'feature' | 'bug' | 'task' | 'spike';
  assigneeId?: string;
  status?: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  tags?: string[];
  labels?: string[];
  aiGenerated?: boolean;
  aiPrompt?: string;
  aiModelUsed?: string;
  aiValidationScore?: number;
  aiSuggestions?: string[];
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
  organizationId?: string;
}

export interface StoryWithRelations {
  id: string;
  projectId: string;
  epicId: string | null;
  title: string;
  description: string | null;
  acceptanceCriteria: string[] | null;
  storyPoints: number | null;
  storyType: 'feature' | 'bug' | 'task' | 'spike' | null;
  priority: 'low' | 'medium' | 'high' | 'critical' | null;
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked' | null;
  assigneeId: string | null;
  tags: string[] | null;
  aiGenerated: boolean | null;
  aiPrompt: string | null;
  aiModelUsed: string | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastUpdatedAt: Date | null;
  updateVersion: number | null;
  project?: {
    id: string;
    name: string;
    key: string;
  };
  epic?: {
    id: string;
    title: string;
    color: string | null;
  } | null;
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
      organizationId: project.organizationId,
      projectId: input.projectId,
      epicId: input.epicId || null,
      title: input.title,
      description: input.description || null,
      acceptanceCriteria: input.acceptanceCriteria || null,
      storyPoints: input.storyPoints || null,
      priority: input.priority,
      status: input.status || 'backlog',
      storyType: input.storyType || 'feature',
      assigneeId: input.assigneeId || null,
      tags: input.tags || null,
      labels: input.labels || null,
      aiGenerated: input.aiGenerated || false,
      aiPrompt: input.aiPrompt || null,
      aiModelUsed: input.aiModelUsed || null,
      aiValidationScore: input.aiValidationScore || null,
      aiSuggestions: input.aiSuggestions || null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Log activity
    await db.insert(activities).values({
      id: nanoid(),
      organizationId: project.organizationId,
      userId,
      projectId: input.projectId,
      action: 'story_created',
      resourceType: 'story',
      resourceId: storyId,
      newValues: {
        title: input.title,
        priority: input.priority,
        status: input.status || 'backlog',
        aiGenerated: input.aiGenerated || false
      },
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
    try {
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
      let currentSprintRelation;
      try {
        currentSprintRelation = await db.query.sprintStories.findFirst({
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
      } catch (sprintError) {
        console.error('Error fetching sprint relation for story:', storyId, sprintError);
        // Continue without sprint data
        currentSprintRelation = null;
      }

      return {
        ...story,
        currentSprint: currentSprintRelation?.sprint?.status === 'active'
          ? {
              id: currentSprintRelation.sprint.id,
              name: currentSprintRelation.sprint.name,
              startDate: new Date(currentSprintRelation.sprint.startDate),
              endDate: new Date(currentSprintRelation.sprint.endDate)
            }
          : null
      };
    } catch (error) {
      console.error('Error in getById for story:', storyId, error);
      throw error;
    }
  }

  /**
   * Update story
   */
  async update(
    storyId: string,
    input: UpdateStoryInput,
    userId: string
  ): Promise<StoryWithRelations> {
    try {
      console.log('Updating story:', storyId, 'with input:', JSON.stringify(input));

      // Verify story exists
      const existingStory = await db.query.stories.findFirst({
        where: eq(stories.id, storyId)
      });

      if (!existingStory) {
        throw new Error('Story not found');
      }

      console.log('Existing story found:', existingStory.id);

      // Verify epic if provided
      if (input.epicId !== undefined) {
        if (input.epicId) {
          console.log('Verifying epic:', input.epicId, 'for project:', existingStory.projectId);
          const epic = await db.query.epics.findFirst({
            where: and(
              eq(epics.id, input.epicId),
              eq(epics.projectId, existingStory.projectId)
            )
          });

          if (!epic) {
            console.error('Epic not found or wrong project. Epic ID:', input.epicId, 'Project ID:', existingStory.projectId);
            throw new Error('Epic not found or does not belong to this project');
          }
          console.log('Epic verified:', epic.id);
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

    // Update story with version increment
    const currentVersion = existingStory.updateVersion || 1;
    await db.update(stories)
      .set({
        ...input,
        updatedAt: new Date(),
        lastUpdatedAt: new Date(),
        updateVersion: currentVersion + 1,
      })
      .where(eq(stories.id, storyId));

    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      // Get the organization ID from the project
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, existingStory.projectId))
        .limit(1);

      if (project) {
        await db.insert(activities).values({
          id: nanoid(),
          organizationId: project.organizationId,
          userId,
          projectId: existingStory.projectId,
          action: 'story_updated',
          resourceType: 'story',
          resourceId: storyId,
          newValues: changes,
          metadata: {
            storyTitle: existingStory.title,
            changes
          },
          createdAt: new Date()
        });
      }
    }

      console.log('Story updated successfully, fetching updated story...');
      const updatedStory = await this.getById(storyId);
      console.log('Updated story fetched successfully');
      return updatedStory;
    } catch (error) {
      console.error('Error in update method for story:', storyId, error);
      throw error;
    }
  }

  /**
   * Delete story (hard delete from database)
   */
  async delete(storyId: string, userId: string): Promise<void> {
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId)
    });

    if (!story) {
      throw new Error('Story not found');
    }

    // Get project for activity logging before deletion
    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, story.projectId))
      .limit(1);

    // Log activity BEFORE deletion
    if (project) {
      await db.insert(activities).values({
        id: nanoid(),
        organizationId: project.organizationId,
        userId,
        projectId: story.projectId,
        action: 'story_deleted',
        resourceType: 'story',
        resourceId: storyId,
        oldValues: {
          title: story.title,
          status: story.status,
          priority: story.priority
        },
        metadata: {
          storyTitle: story.title,
          storyStatus: story.status,
          storyPriority: story.priority
        },
        createdAt: new Date()
      });
    }

    // Remove from any sprints
    await db.delete(sprintStories)
      .where(eq(sprintStories.storyId, storyId));

    // Hard delete the story
    await db.delete(stories)
      .where(eq(stories.id, storyId));
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

    // Always filter by organizationId if provided (for security)
    if (filters.organizationId) {
      conditions.push(eq(stories.organizationId, filters.organizationId));
    }

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
      stories: storiesData.map(story => {
        const sprint = sprintMap.get(story.id);
        return {
          ...story,
          currentSprint: sprint ? {
            id: sprint.id,
            name: sprint.name,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate)
          } : null
        };
      }),
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
      currentSprint: {
        id: relation.sprint.id,
        name: relation.sprint.name,
        startDate: new Date(relation.sprint.startDate),
        endDate: new Date(relation.sprint.endDate)
      }
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
    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, story.projectId))
      .limit(1);

    if (project) {
      await db.insert(activities).values({
        id: nanoid(),
        organizationId: project.organizationId,
        userId,
        projectId: story.projectId,
        action: 'story_sprint_assigned',
        resourceType: 'story',
        resourceId: storyId,
        metadata: {
          storyTitle: story.title,
          sprintName: sprint.name
        },
        createdAt: new Date()
      });
    }
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
    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, story.projectId))
      .limit(1);

    if (project) {
      await db.insert(activities).values({
        id: nanoid(),
        organizationId: project.organizationId,
        userId,
        projectId: story.projectId,
        action: 'story_sprint_removed',
        resourceType: 'story',
        resourceId: storyId,
        metadata: {
          storyTitle: story.title
        },
        createdAt: new Date()
      });
    }
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
      if (story.status) {
        stats.byStatus[story.status] = (stats.byStatus[story.status] || 0) + 1;
      }

      // Priority counts
      if (story.priority) {
        stats.byPriority[story.priority] = (stats.byPriority[story.priority] || 0) + 1;
      }

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
