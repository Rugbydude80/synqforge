import { z } from 'zod'

// ============================================
// STORY TYPES
// ============================================

export const CreateStorySchema = z.object({
  epicId: z.union([z.string().uuid(), z.literal(''), z.undefined()]).optional().transform(val => val === '' ? undefined : val),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  storyType: z.enum(['feature', 'bug', 'task', 'spike']).default('feature'),
  assignedTo: z.string().uuid().optional(),
  labels: z.array(z.string()).optional(),
  aiGenerated: z.boolean().optional(),
})

export const UpdateStorySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'archived']).optional(),
  storyType: z.enum(['feature', 'bug', 'task', 'spike']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
  priorityRank: z.number().optional(),
})

export const StoryFiltersSchema = z.object({
  status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'archived']).optional(),
  assignedTo: z.string().uuid().optional(),
  epicId: z.union([z.string().uuid(), z.literal(''), z.undefined()]).optional().transform(val => val === '' ? undefined : val),
  storyType: z.enum(['feature', 'bug', 'task', 'spike']).optional(),
  labels: z.array(z.string()).optional(),
})

export type CreateStoryInput = z.infer<typeof CreateStorySchema>
export type UpdateStoryInput = z.infer<typeof UpdateStorySchema>
export type StoryFilters = z.infer<typeof StoryFiltersSchema>

// ============================================
// EPIC TYPES
// ============================================

export const CreateEpicSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goals: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedTo: z.string().uuid().optional(),
  startDate: z.string().date().optional(),
  targetDate: z.string().date().optional(),
  aiGenerated: z.boolean().optional(),
  aiGenerationPrompt: z.string().optional(),
})

export const UpdateEpicSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  goals: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['draft', 'planned', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  startDate: z.string().date().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
})

export type CreateEpicInput = z.infer<typeof CreateEpicSchema>
export type UpdateEpicInput = z.infer<typeof UpdateEpicSchema>

// ============================================
// PROJECT TYPES
// ============================================

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  key: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, 'Project key must be uppercase letters and numbers only'),
  description: z.string().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  ownerId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  settings: z.record(z.any()).optional(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  ownerId: z.string().uuid().optional(),
  settings: z.record(z.any()).optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>

// ============================================
// USER TYPES
// ============================================

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar: z.string().url().nullable().optional(),
  preferences: z.record(z.any()).optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// ============================================
// SPRINT TYPES
// ============================================

export const CreateSprintSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  goal: z.string().optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  capacityPoints: z.number().int().min(0).optional(),
})

export const UpdateSprintSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  goal: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  capacityPoints: z.number().int().min(0).optional(),
})

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>
export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>

// ============================================
// AI TYPES
// ============================================

export const AIGenerationRequestSchema = z.object({
  type: z.enum(['story_generation', 'story_validation', 'epic_creation', 'requirements_analysis']),
  prompt: z.string().min(10),
  model: z.string().optional(),
  maxTokens: z.number().int().min(100).max(4000).optional(),
  metadata: z.record(z.any()).optional(),
})

export const StoryGenerationInputSchema = z.object({
  requirements: z.string().min(10),
  projectContext: z.string().optional(),
  targetUsers: z.string().optional(),
  businessGoals: z.string().optional(),
  epicId: z.union([z.string().uuid(), z.literal(''), z.undefined()]).optional().transform(val => val === '' ? undefined : val),
  projectId: z.string().uuid(),
  model: z.string().optional(),
  promptTemplate: z.string().optional(),
  customTemplateId: z.string().optional(), // Custom document template ID
})

export type AIGenerationRequest = z.infer<typeof AIGenerationRequestSchema>
export type StoryGenerationInput = z.infer<typeof StoryGenerationInputSchema>

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
})

// ============================================
// ERROR TYPES
// ============================================

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}
