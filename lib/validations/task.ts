import { z } from 'zod';

// Base task validation schema
const baseTaskSchema = {
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Priority must be low, medium, high, or critical' })
  }),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked'], {
    errorMap: () => ({ message: 'Status must be todo, in_progress, done, or blocked' })
  }).optional(),
  estimatedHours: z.number().int().min(0, 'Estimated hours cannot be negative').max(1000, 'Estimated hours cannot exceed 1000').optional(),
  actualHours: z.number().int().min(0, 'Actual hours cannot be negative').max(1000, 'Actual hours cannot exceed 1000').optional(),
  assigneeId: z.string().min(1, 'Assignee ID must be valid').nullable().optional(),
  tags: z.array(z.string().max(50, 'Each tag must be less than 50 characters')).max(10, 'Maximum 10 tags').optional(),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative').optional(),
};

// Create task validation schema
export const createTaskSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  ...baseTaskSchema,
});

// Update task validation schema (all fields optional)
export const updateTaskSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required').optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Priority must be low, medium, high, or critical' })
  }).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked'], {
    errorMap: () => ({ message: 'Status must be todo, in_progress, done, or blocked' })
  }).optional(),
  estimatedHours: z.number().int().min(0, 'Estimated hours cannot be negative').max(1000, 'Estimated hours cannot exceed 1000').optional(),
  actualHours: z.number().int().min(0, 'Actual hours cannot be negative').max(1000, 'Actual hours cannot exceed 1000').optional(),
  assigneeId: z.string().min(1, 'Assignee ID must be valid').optional().nullable(),
  tags: z.array(z.string().max(50, 'Each tag must be less than 50 characters')).max(10, 'Maximum 10 tags').optional(),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative').optional(),
});

// Bulk create tasks validation schema
export const bulkCreateTasksSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  tasks: z.array(z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    estimatedHours: z.number().int().min(0).max(1000).optional(),
    assigneeId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })).min(1, 'At least one task is required').max(50, 'Maximum 50 tasks per bulk operation'),
});

// Task filters validation schema
export const taskFiltersSchema = z.object({
  storyId: z.string().optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.union([
    z.enum(['todo', 'in_progress', 'done', 'blocked']),
    z.array(z.enum(['todo', 'in_progress', 'done', 'blocked']))
  ]).optional(),
  priority: z.union([
    z.enum(['low', 'medium', 'high', 'critical']),
    z.array(z.enum(['low', 'medium', 'high', 'critical']))
  ]).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(1000, 'Limit cannot exceed 1000').default(100),
  offset: z.number().int().min(0, 'Offset must be non-negative').default(0),
  orderBy: z.enum(['createdAt', 'updatedAt', 'priority', 'orderIndex']).default('orderIndex'),
  orderDirection: z.enum(['asc', 'desc']).default('asc'),
});

// Task ID validation schema
export const taskIdSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
});

// Reorder tasks validation schema
export const reorderTasksSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
  taskIds: z.array(z.string().min(1, 'Task ID must be valid')).min(1, 'At least one task ID is required'),
});

// Type exports for TypeScript
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type TaskIdInput = z.infer<typeof taskIdSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

// Validation helper functions
export const validateCreateTask = (data: unknown) => createTaskSchema.parse(data);
export const validateUpdateTask = (data: unknown) => updateTaskSchema.parse(data);
export const validateBulkCreateTasks = (data: unknown) => bulkCreateTasksSchema.parse(data);
export const validateTaskFilters = (data: unknown) => taskFiltersSchema.parse(data);
export const validateTaskId = (data: unknown) => taskIdSchema.parse(data);
export const validateReorderTasks = (data: unknown) => reorderTasksSchema.parse(data);

// Safe validation helpers that return result objects instead of throwing
export const safeValidateCreateTask = (data: unknown) => createTaskSchema.safeParse(data);
export const safeValidateUpdateTask = (data: unknown) => updateTaskSchema.safeParse(data);
export const safeValidateBulkCreateTasks = (data: unknown) => bulkCreateTasksSchema.safeParse(data);
export const safeValidateTaskFilters = (data: unknown) => taskFiltersSchema.safeParse(data);
export const safeValidateTaskId = (data: unknown) => taskIdSchema.safeParse(data);
export const safeValidateReorderTasks = (data: unknown) => reorderTasksSchema.safeParse(data);
