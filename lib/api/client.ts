import type { APIResponse } from '@/lib/types'

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const data: APIResponse<T> = await response.json()

  if (!response.ok) {
    throw new APIError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details
    )
  }

  if (!data.success) {
    throw new APIError(
      500,
      'API_ERROR',
      data.error?.message || 'API returned unsuccessful response',
      data.error?.details
    )
  }

  return data.data as T
}

// Projects API
export const projectsAPI = {
  getAll: () => apiRequest('/projects'),

  getById: (id: string) => apiRequest(`/projects/${id}`),

  create: (data: {
    name: string
    description?: string
    slug: string
    ownerId?: string
  }) => apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: {
    name?: string
    description?: string
    slug?: string
    status?: string
    ownerId?: string
    settings?: any
  }) => apiRequest(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest(`/projects/${id}`, {
    method: 'DELETE',
  }),

  archive: (id: string) => apiRequest(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'archived' }),
  }),

  getStats: (id: string) => apiRequest(`/projects/${id}/stats`),
}

// Auth API
export const authAPI = {
  signup: (data: {
    name: string
    email: string
    password: string
  }) => apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// AI API
export const aiAPI = {
  generateStories: (data: {
    requirements: string
    projectId: string
    epicId?: string
    projectContext?: string
  }) => apiRequest('/ai/generate-stories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  generateEpic: (data: {
    description: string
    projectId: string
    projectContext?: string
  }) => apiRequest('/ai/generate-epic', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  validateStory: (data: {
    storyId?: string
    title: string
    description: string
    acceptanceCriteria?: string[]
  }) => apiRequest('/ai/validate-story', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  analyzeDocument: (data: {
    content: string
    documentType?: string
    projectId: string
  }) => apiRequest('/ai/analyze-document', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}


