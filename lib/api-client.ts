/**
 * Type-Safe API Client for SynqForge
 *
 * Centralized API client with TypeScript types for all endpoints.
 * Provides error handling, auth token management, and type-safe requests/responses.
 */

import type {
  CreateStoryInput,
  UpdateStoryInput,
  BulkCreateStoriesInput,
  MoveStoryInput,
  AssignToSprintInput,
  StoryFilters,
} from '@/lib/validations/story'

import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateEpicInput,
  UpdateEpicInput,
  CreateSprintInput,
  UpdateSprintInput,
  StoryGenerationInput,
} from '@/lib/types'

// ============================================
// API ERROR TYPES
// ============================================

export class APIError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// ============================================
// ENTITY TYPES
// ============================================

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl?: string
  settings?: Record<string, any>
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  organizationId: string
  role: 'admin' | 'member' | 'viewer'
  isActive: boolean
  preferences?: Record<string, any>
  lastActiveAt?: string
  createdAt: string
}

export interface Project {
  id: string
  organizationId: string
  name: string
  key: string
  description?: string
  slug: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
  ownerId: string
  settings?: Record<string, any>
  createdAt: string
  updatedAt: string
  // Computed fields from stats
  totalStories?: number
  completedStories?: number
  progressPercentage?: number
}

export interface Epic {
  id: string
  projectId: string
  organizationId: string
  title: string
  description?: string
  goals?: string
  color?: string
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  aiGenerated: boolean
  aiGenerationPrompt?: string
  createdBy: string
  assignedTo?: string
  startDate?: string
  targetDate?: string
  createdAt: string
  updatedAt: string
  // Computed fields
  totalStories?: number
  completedStories?: number
  progressPercentage?: number
}

export interface Story {
  id: string
  epicId?: string
  projectId: string
  title: string
  description?: string
  acceptanceCriteria?: string[]
  storyPoints?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  storyType: 'feature' | 'bug' | 'task' | 'spike'
  assignedTo?: string
  tags?: string[]
  aiGenerated: boolean
  aiPrompt?: string
  aiModelUsed?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  // Populated relations
  epic?: Epic
  assignee?: User
  project?: Project
}

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal?: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: string
  endDate: string
  capacityPoints?: number
  createdAt: string
  updatedAt: string
  // Computed fields
  totalStories?: number
  completedStories?: number
  totalPoints?: number
  completedPoints?: number
}

export interface Activity {
  id: string
  organizationId: string
  userId: string
  type: string
  metadata: Record<string, any>
  createdAt: string
  // Populated user
  user?: User
}

export interface AIGeneration {
  id: string
  organizationId: string
  userId: string
  type: 'story_generation' | 'story_validation' | 'epic_creation' | 'requirements_analysis'
  prompt: string
  response: any
  model: string
  tokensUsed: number
  status: 'pending' | 'completed' | 'failed'
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ListResponse<T> {
  data: T[]
  total: number
  page?: number
  limit?: number
}

export interface StatsResponse {
  totalStories: number
  completedStories: number
  inProgressStories: number
  backlogStories: number
  totalPoints: number
  completedPoints: number
  velocity?: number
}

export interface GenerateStoriesResponse {
  stories: Story[]
  generationId: string
  tokensUsed: number
}

export interface AnalyzeDocumentResponse {
  analysis: string
  suggestedStories: Partial<Story>[]
  extractedRequirements: string[]
  documentId: string
}

// ============================================
// BASE FETCH WRAPPER
// ============================================

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Include cookies for auth
  })

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  const isJSON = contentType?.includes('application/json')

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorDetails = undefined

    if (isJSON) {
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        errorDetails = errorData.details
      } catch {
        // If JSON parsing fails, use default message
      }
    } else {
      try {
        errorMessage = await response.text()
      } catch {
        // Use default message
      }
    }

    throw new APIError(errorMessage, response.status, errorDetails)
  }

  if (isJSON) {
    return response.json()
  }

  // For non-JSON responses, return empty object
  return {} as T
}

// ============================================
// API CLIENT
// ============================================

export const api = {
  // ============================================
  // PROJECTS
  // ============================================
  projects: {
    /**
     * List all projects for the organization
     */
    list: async (filters?: {
      organizationId?: string
      status?: Project['status']
      search?: string
    }): Promise<ListResponse<Project>> => {
      const params = new URLSearchParams()
      if (filters?.organizationId) params.append('organizationId', filters.organizationId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)

      return fetchAPI<ListResponse<Project>>(
        `/api/projects?${params.toString()}`
      )
    },

    /**
     * Get a single project by ID
     */
    getById: async (projectId: string): Promise<Project> => {
      return fetchAPI<Project>(`/api/projects/${projectId}`)
    },

    /**
     * Create a new project
     */
    create: async (data: CreateProjectInput): Promise<Project> => {
      return fetchAPI<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Update an existing project
     */
    update: async (projectId: string, data: UpdateProjectInput): Promise<Project> => {
      return fetchAPI<Project>(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    /**
     * Delete a project
     */
    delete: async (projectId: string): Promise<void> => {
      return fetchAPI<void>(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
    },

    /**
     * Get project statistics
     */
    getStats: async (projectId: string): Promise<StatsResponse> => {
      return fetchAPI<StatsResponse>(`/api/projects/${projectId}/stats`)
    },
  },

  // ============================================
  // STORIES
  // ============================================
  stories: {
    /**
     * List stories with filters
     */
    list: async (filters?: Partial<StoryFilters>): Promise<ListResponse<Story>> => {
      const params = new URLSearchParams()

      if (filters?.projectId) params.append('projectId', filters.projectId)
      if (filters?.epicId) params.append('epicId', filters.epicId)
      if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId)
      if (filters?.aiGenerated !== undefined) params.append('aiGenerated', String(filters.aiGenerated))
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))
      if (filters?.orderBy) params.append('orderBy', filters.orderBy)
      if (filters?.orderDirection) params.append('orderDirection', filters.orderDirection)

      // Handle array filters
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        statuses.forEach(s => params.append('status', s))
      }
      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        priorities.forEach(p => params.append('priority', p))
      }
      if (filters?.tags) {
        filters.tags.forEach(tag => params.append('tags', tag))
      }

      return fetchAPI<ListResponse<Story>>(
        `/api/stories?${params.toString()}`
      )
    },

    /**
     * Get a single story by ID
     */
    getById: async (storyId: string): Promise<Story> => {
      return fetchAPI<Story>(`/api/stories/${storyId}`)
    },

    /**
     * Create a new story
     */
    create: async (data: CreateStoryInput): Promise<Story> => {
      return fetchAPI<Story>('/api/stories', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Update an existing story
     */
    update: async (storyId: string, data: UpdateStoryInput): Promise<Story> => {
      return fetchAPI<Story>(`/api/stories/${storyId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    /**
     * Delete a story
     */
    delete: async (storyId: string): Promise<void> => {
      return fetchAPI<void>(`/api/stories/${storyId}`, {
        method: 'DELETE',
      })
    },

    /**
     * Bulk create stories
     */
    bulkCreate: async (data: BulkCreateStoriesInput): Promise<Story[]> => {
      return fetchAPI<Story[]>('/api/stories/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Move story to new status (Kanban)
     */
    move: async (storyId: string, data: MoveStoryInput): Promise<Story> => {
      return fetchAPI<Story>(`/api/stories/${storyId}/move`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    /**
     * Assign story to sprint
     */
    assignToSprint: async (storyId: string, data: AssignToSprintInput): Promise<Story> => {
      return fetchAPI<Story>(`/api/stories/${storyId}/sprint`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    /**
     * Get story statistics for a project
     */
    getStats: async (projectId: string): Promise<StatsResponse> => {
      return fetchAPI<StatsResponse>(`/api/stories/stats?projectId=${projectId}`)
    },
  },

  // ============================================
  // EPICS
  // ============================================
  epics: {
    /**
     * List epics for a project
     */
    list: async (filters?: {
      projectId?: string
      status?: Epic['status']
    }): Promise<ListResponse<Epic>> => {
      const params = new URLSearchParams()
      if (filters?.projectId) params.append('projectId', filters.projectId)
      if (filters?.status) params.append('status', filters.status)

      return fetchAPI<ListResponse<Epic>>(
        `/api/epics?${params.toString()}`
      )
    },

    /**
     * Get a single epic by ID
     */
    getById: async (epicId: string): Promise<Epic> => {
      return fetchAPI<Epic>(`/api/epics/${epicId}`)
    },

    /**
     * Create a new epic
     */
    create: async (data: CreateEpicInput): Promise<Epic> => {
      return fetchAPI<Epic>('/api/epics', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Update an existing epic
     */
    update: async (epicId: string, data: UpdateEpicInput): Promise<Epic> => {
      return fetchAPI<Epic>(`/api/epics/${epicId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    /**
     * Delete an epic
     */
    delete: async (epicId: string): Promise<void> => {
      return fetchAPI<void>(`/api/epics/${epicId}`, {
        method: 'DELETE',
      })
    },

    /**
     * Get epic progress statistics
     */
    getStats: async (epicId: string): Promise<StatsResponse> => {
      return fetchAPI<StatsResponse>(`/api/epics/${epicId}/stats`)
    },
  },

  // ============================================
  // SPRINTS
  // ============================================
  sprints: {
    /**
     * List sprints for a project
     */
    list: async (filters?: {
      projectId?: string
      status?: Sprint['status']
    }): Promise<ListResponse<Sprint>> => {
      const params = new URLSearchParams()
      if (filters?.projectId) params.append('projectId', filters.projectId)
      if (filters?.status) params.append('status', filters.status)

      return fetchAPI<ListResponse<Sprint>>(
        `/api/sprints?${params.toString()}`
      )
    },

    /**
     * Get a single sprint by ID
     */
    getById: async (sprintId: string): Promise<Sprint> => {
      return fetchAPI<Sprint>(`/api/sprints/${sprintId}`)
    },

    /**
     * Create a new sprint
     */
    create: async (data: CreateSprintInput): Promise<Sprint> => {
      return fetchAPI<Sprint>('/api/sprints', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Update an existing sprint
     */
    update: async (sprintId: string, data: UpdateSprintInput): Promise<Sprint> => {
      return fetchAPI<Sprint>(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    /**
     * Delete a sprint
     */
    delete: async (sprintId: string): Promise<void> => {
      return fetchAPI<void>(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      })
    },

    /**
     * Get sprint statistics
     */
    getStats: async (sprintId: string): Promise<StatsResponse> => {
      return fetchAPI<StatsResponse>(`/api/sprints/${sprintId}/stats`)
    },
  },

  // ============================================
  // AI GENERATION
  // ============================================
  ai: {
    /**
     * Generate stories from requirements
     */
    generateStories: async (data: StoryGenerationInput): Promise<GenerateStoriesResponse> => {
      return fetchAPI<GenerateStoriesResponse>('/api/ai/generate-stories', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Generate an epic from description
     */
    generateEpic: async (data: {
      projectId: string
      description: string
      goals?: string
    }): Promise<Epic> => {
      return fetchAPI<Epic>('/api/ai/generate-epic', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Analyze a document and extract requirements
     */
    analyzeDocument: async (formData: FormData): Promise<AnalyzeDocumentResponse> => {
      // For file uploads, don't set Content-Type (browser will set it with boundary)
      return fetch('/api/ai/analyze-document', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to analyze document' }))
          throw new APIError(error.error || 'Failed to analyze document', response.status, error.details)
        }
        return response.json()
      })
    },
  },

  // ============================================
  // USERS
  // ============================================
  users: {
    /**
     * Get current user
     */
    getCurrent: async (): Promise<User> => {
      return fetchAPI<User>('/api/users/me')
    },

    /**
     * Search users in organization
     */
    search: async (query: string, organizationId: string): Promise<User[]> => {
      const params = new URLSearchParams({ query, organizationId })
      return fetchAPI<User[]>(`/api/users/search?${params.toString()}`)
    },

    /**
     * Update user profile
     */
    update: async (userId: string, data: Partial<User>): Promise<User> => {
      return fetchAPI<User>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
  },

  // ============================================
  // ACTIVITIES
  // ============================================
  activities: {
    /**
     * List recent activities
     */
    list: async (filters?: {
      organizationId?: string
      userId?: string
      limit?: number
    }): Promise<ListResponse<Activity>> => {
      const params = new URLSearchParams()
      if (filters?.organizationId) params.append('organizationId', filters.organizationId)
      if (filters?.userId) params.append('userId', filters.userId)
      if (filters?.limit) params.append('limit', String(filters.limit))

      return fetchAPI<ListResponse<Activity>>(
        `/api/activities?${params.toString()}`
      )
    },
  },
}
