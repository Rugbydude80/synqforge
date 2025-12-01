/**
 * API Validation Schemas
 * Zod schemas for REST API v1 request/response validation
 */

import { z } from 'zod'

// ============================================
// COMMON SCHEMAS
// ============================================

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
})

export const listQueryParamsSchema = paginationSchema.extend({
  orderBy: z.enum(['createdAt', 'updatedAt', 'title', 'priority']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

// ============================================
// STORY SCHEMAS
// ============================================

export const createStoryRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  epicId: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  acceptanceCriteria: z.array(z.string().max(500)).max(20).optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  storyType: z.enum(['feature', 'bug', 'task', 'spike']).default('feature'),
  assigneeId: z.string().optional().nullable(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']).default('backlog'),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const updateStoryRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  acceptanceCriteria: z.array(z.string().max(500)).max(20).optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  storyType: z.enum(['feature', 'bug', 'task', 'spike']).optional(),
  assigneeId: z.string().optional().nullable(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  epicId: z.string().optional().nullable(),
})

export const listStoriesQuerySchema = listQueryParamsSchema.extend({
  projectId: z.string().optional(),
  epicId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.union([
    z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']),
    z.array(z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'])),
  ]).optional(),
  priority: z.union([
    z.enum(['low', 'medium', 'high', 'critical']),
    z.array(z.enum(['low', 'medium', 'high', 'critical'])),
  ]).optional(),
  tags: z.array(z.string()).optional(),
})

export type CreateStoryRequest = z.infer<typeof createStoryRequestSchema>
export type UpdateStoryRequest = z.infer<typeof updateStoryRequestSchema>
export type ListStoriesQuery = z.infer<typeof listStoriesQuerySchema>

// ============================================
// PROJECT SCHEMAS
// ============================================

export const createProjectRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(2000).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  key: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, 'Project key must be uppercase letters and numbers only').optional(),
})

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
})

export const listProjectsQuerySchema = listQueryParamsSchema.extend({
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
})

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>

// ============================================
// EPIC SCHEMAS
// ============================================

export const createEpicRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  goals: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assigneeId: z.string().optional().nullable(),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
})

export const updateEpicRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  goals: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published', 'planned', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
})

export const listEpicsQuerySchema = listQueryParamsSchema.extend({
  projectId: z.string().optional(),
  status: z.enum(['draft', 'published', 'planned', 'in_progress', 'completed', 'archived']).optional(),
})

export type CreateEpicRequest = z.infer<typeof createEpicRequestSchema>
export type UpdateEpicRequest = z.infer<typeof updateEpicRequestSchema>
export type ListEpicsQuery = z.infer<typeof listEpicsQuerySchema>

// ============================================
// SPRINT SCHEMAS
// ============================================

export const createSprintRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  goal: z.string().max(1000).optional(),
})

export const updateSprintRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  goal: z.string().max(1000).optional(),
})

export const listSprintsQuerySchema = listQueryParamsSchema.extend({
  projectId: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
})

export const addStoryToSprintRequestSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
})

export type CreateSprintRequest = z.infer<typeof createSprintRequestSchema>
export type UpdateSprintRequest = z.infer<typeof updateSprintRequestSchema>
export type ListSprintsQuery = z.infer<typeof listSprintsQuerySchema>
export type AddStoryToSprintRequest = z.infer<typeof addStoryToSprintRequestSchema>

// ============================================
// WEBHOOK SCHEMAS
// ============================================

export const webhookEventTypeSchema = z.enum([
  'story.created',
  'story.updated',
  'story.deleted',
  'story.moved',
  'epic.created',
  'epic.updated',
  'epic.completed',
  'sprint.started',
  'sprint.completed',
  'story.added_to_sprint',
  'project.created',
  'project.updated',
])

export const createWebhookRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  events: z.array(webhookEventTypeSchema).min(1, 'At least one event type is required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').max(255),
  headers: z.record(z.string()).optional(),
})

export const updateWebhookRequestSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(webhookEventTypeSchema).optional(),
  secret: z.string().min(16).max(255).optional(),
  isActive: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
})

export type CreateWebhookRequest = z.infer<typeof createWebhookRequestSchema>
export type UpdateWebhookRequest = z.infer<typeof updateWebhookRequestSchema>

// ============================================
// ERROR RESPONSE SCHEMA
// ============================================

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  details: z.any().optional(),
})

// ============================================
// SUCCESS RESPONSE SCHEMAS
// ============================================

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    meta: z.object({
      page: z.number(),
      total: z.number(),
      hasMore: z.boolean(),
    }),
  })

export const singleResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  })

