import { z } from 'zod';

// Base story validation schema
const baseStorySchema = {
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  acceptanceCriteria: z.array(z.string().max(500, 'Each criterion must be less than 500 characters')).max(20, 'Maximum 20 acceptance criteria').optional(),
  storyPoints: z.number().int().min(0, 'Story points cannot be negative').max(100, 'Story points cannot exceed 100').optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Priority must be low, medium, high, or critical' })
  }),
  status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'], {
    errorMap: () => ({ message: 'Status must be backlog, ready, in_progress, review, done, or blocked' })
  }).optional(),
  tags: z.array(z.string().max(50, 'Each tag must be less than 50 characters')).max(10, 'Maximum 10 tags').optional(),
  aiGenerated: z.boolean().optional(),
  aiPrompt: z.string().max(1000, 'AI prompt must be less than 1000 characters').optional(),
  aiModelUsed: z.string().max(100, 'AI model name must be less than 100 characters').optional(),
};

// Create story validation schema
export const createStorySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  epicId: z.string().min(1, 'Epic ID is required').optional(),
  ...baseStorySchema,
});

// Update story validation schema (all fields optional except projectId for context)
export const updateStorySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  ...Object.fromEntries(
    Object.entries(baseStorySchema).map(([key, value]) => [key, value.optional()])
  ),
});

// Bulk create stories validation schema
export const bulkCreateStoriesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  stories: z.array(createStorySchema.omit({ projectId: true })).min(1, 'At least one story is required').max(50, 'Maximum 50 stories per bulk operation'),
});

// Sprint assignment validation schema
export const assignToSprintSchema = z.object({
  sprintId: z.string().min(1, 'Sprint ID is required'),
});

// Story move validation schema (for Kanban board)
export const moveStorySchema = z.object({
  newStatus: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'], {
    errorMap: () => ({ message: 'New status must be backlog, ready, in_progress, review, done, or blocked' })
  }),
  position: z.number().int().min(0, 'Position must be non-negative').optional(),
});

// Story filters validation schema
export const storyFiltersSchema = z.object({
  projectId: z.string().optional(),
  epicId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.union([
    z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']),
    z.array(z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']))
  ]).optional(),
  priority: z.union([
    z.enum(['low', 'medium', 'high', 'critical']),
    z.array(z.enum(['low', 'medium', 'high', 'critical']))
  ]).optional(),
  aiGenerated: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(50),
  offset: z.number().int().min(0, 'Offset must be non-negative').default(0),
  orderBy: z.enum(['createdAt', 'updatedAt', 'priority', 'storyPoints']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Project statistics query validation schema
export const projectStatsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

// Story ID validation schema
export const storyIdSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
});

// Sprint ID validation schema
export const sprintIdSchema = z.object({
  sprintId: z.string().min(1, 'Sprint ID is required'),
});

// Type exports for TypeScript
export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
export type BulkCreateStoriesInput = z.infer<typeof bulkCreateStoriesSchema>;
export type AssignToSprintInput = z.infer<typeof assignToSprintSchema>;
export type MoveStoryInput = z.infer<typeof moveStorySchema>;
export type StoryFilters = z.infer<typeof storyFiltersSchema>;
export type ProjectStatsInput = z.infer<typeof projectStatsSchema>;
export type StoryIdInput = z.infer<typeof storyIdSchema>;
export type SprintIdInput = z.infer<typeof sprintIdSchema>;

// Validation helper functions
export const validateCreateStory = (data: unknown) => createStorySchema.parse(data);
export const validateUpdateStory = (data: unknown) => updateStorySchema.parse(data);
export const validateBulkCreateStories = (data: unknown) => bulkCreateStoriesSchema.parse(data);
export const validateAssignToSprint = (data: unknown) => assignToSprintSchema.parse(data);
export const validateMoveStory = (data: unknown) => moveStorySchema.parse(data);
export const validateStoryFilters = (data: unknown) => storyFiltersSchema.parse(data);
export const validateProjectStats = (data: unknown) => projectStatsSchema.parse(data);
export const validateStoryId = (data: unknown) => storyIdSchema.parse(data);
export const validateSprintId = (data: unknown) => sprintIdSchema.parse(data);

// Safe validation helpers that return result objects instead of throwing
export const safeValidateCreateStory = (data: unknown) => createStorySchema.safeParse(data);
export const safeValidateUpdateStory = (data: unknown) => updateStorySchema.safeParse(data);
export const safeValidateBulkCreateStories = (data: unknown) => bulkCreateStoriesSchema.safeParse(data);
export const safeValidateAssignToSprint = (data: unknown) => assignToSprintSchema.safeParse(data);
export const safeValidateMoveStory = (data: unknown) => moveStorySchema.safeParse(data);
export const safeValidateStoryFilters = (data: unknown) => storyFiltersSchema.safeParse(data);
export const safeValidateProjectStats = (data: unknown) => projectStatsSchema.safeParse(data);
export const safeValidateStoryId = (data: unknown) => storyIdSchema.safeParse(data);
export const safeValidateSprintId = (data: unknown) => sprintIdSchema.safeParse(data);
