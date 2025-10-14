/**
 * Application-wide constants
 * Centralized location for all magic numbers and strings
 */

export const LIMITS = {
  // Pagination
  STORIES_PER_PAGE: 50,
  STORIES_MAX: 1000,
  PROJECTS_PER_PAGE: 20,
  EPICS_PER_PAGE: 50,

  // File uploads
  FILE_UPLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],

  // AI Generation
  AI_STORY_BATCH_MIN: 1,
  AI_STORY_BATCH_MAX: 20,
  AI_DESCRIPTION_MIN_LENGTH: 20,
  AI_DESCRIPTION_MAX_LENGTH: 5000,

  // Rate limiting
  RATE_LIMIT_AI_REQUESTS: 10,
  RATE_LIMIT_AI_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_API_REQUESTS: 100,
  RATE_LIMIT_API_WINDOW: 60 * 1000, // 1 minute

  // Story points
  STORY_POINTS_MIN: 0,
  STORY_POINTS_MAX: 100,

  // Sprint duration
  SPRINT_MIN_DAYS: 1,
  SPRINT_MAX_DAYS: 30,
} as const

/**
 * Subscription Tier Limits
 * Aligned with Stripe products and pricing page
 */
export const SUBSCRIPTION_LIMITS = {
  free: {
    // Projects & Stories
    maxProjects: 1,
    maxStoriesPerProject: 50,
    maxUsers: 1,

    // AI Usage
    monthlyAITokens: 10000, // ~10-15 story generations
    monthlyAIGenerations: 10,
    maxStoriesPerGeneration: 5,
    canUseAdvancedAI: false,
    canUseDocumentAnalysis: false,

    // Features
    canExport: false,
    canUseTemplates: false,
    canUseCustomFields: false,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,

    // Support
    supportLevel: 'community',

    // Display name
    displayName: 'Free',
  },
  pro: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxUsers: 10,

    // AI Usage
    monthlyAITokens: 500000, // ~500-750 story generations
    monthlyAIGenerations: 500,
    maxStoriesPerGeneration: 20,
    canUseAdvancedAI: true,
    canUseDocumentAnalysis: true,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: false,

    // Support
    supportLevel: 'priority',

    // Display name
    displayName: 'Pro',
  },
  enterprise: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxUsers: Infinity,

    // AI Usage
    monthlyAITokens: Infinity, // Unlimited
    monthlyAIGenerations: Infinity,
    maxStoriesPerGeneration: 50,
    canUseAdvancedAI: true,
    canUseDocumentAnalysis: true,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: true,

    // Support
    supportLevel: 'dedicated',

    // Display name
    displayName: 'Enterprise',
  },
} as const

/**
 * AI Token Costs (in tokens)
 * Based on average usage patterns
 */
export const AI_TOKEN_COSTS = {
  STORY_GENERATION: 1000, // Average per story generated
  STORY_VALIDATION: 500,
  EPIC_CREATION: 1500,
  DOCUMENT_ANALYSIS: 2000,
} as const

/**
 * Token Top-up Packages (for pay-as-you-go)
 */
export const TOKEN_PACKAGES = {
  small: {
    tokens: 50000,
    price: 5, // $5
    displayName: '50K Tokens',
    description: '~50 story generations',
  },
  medium: {
    tokens: 150000,
    price: 12, // $12 (20% discount)
    displayName: '150K Tokens',
    description: '~150 story generations',
  },
  large: {
    tokens: 500000,
    price: 35, // $35 (30% discount)
    displayName: '500K Tokens',
    description: '~500 story generations',
  },
} as const

export const EXAMPLE_PROMPTS = [
  'Create a user authentication system with email/password login, OAuth (Google/GitHub), password reset, and 2FA support.',
  'Build a real-time chat feature with typing indicators, read receipts, file attachments, and emoji reactions.',
  'Design an admin dashboard with user management, analytics charts, export functionality, and activity logs.',
  'Implement a payment system with Stripe integration, subscription management, invoice generation, and webhook handling.',
  'Create a task management system with drag-and-drop boards, priority sorting, due dates, and team assignments.',
] as const

export const STORY_STATUSES = [
  'backlog',
  'ready',
  'in_progress',
  'review',
  'done',
  'blocked',
] as const

export const STORY_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const

export const STORY_TYPES = [
  'feature',
  'bug',
  'task',
  'spike',
] as const

export const EPIC_STATUSES = [
  'planned',
  'in_progress',
  'completed',
  'cancelled',
] as const

export const SPRINT_STATUSES = [
  'planning',
  'active',
  'completed',
  'cancelled',
] as const

export const USER_ROLES = [
  'admin',
  'member',
  'viewer',
] as const

export const TEMPLATE_CATEGORIES = [
  'authentication',
  'crud',
  'payments',
  'notifications',
  'admin',
  'api',
  'custom',
] as const

/**
 * UI Constants
 */
export const UI = {
  SIDEBAR_WIDTH: 256, // 64 * 4 (w-64 in Tailwind)
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768, // md breakpoint
  TABLET_BREAKPOINT: 1024, // lg breakpoint
  
  // Animation durations (in ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,

  // Toast durations (in ms)
  TOAST_SHORT: 3000,
  TOAST_NORMAL: 5000,
  TOAST_LONG: 7000,
} as const

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  PROJECTS: '/api/projects',
  STORIES: '/api/stories',
  EPICS: '/api/epics',
  SPRINTS: '/api/sprints',
  TEMPLATES: '/api/templates',
  AI_GENERATE: '/api/ai/generate',
  AI_VALIDATE: '/api/ai/validate',
  DOCUMENTS: '/api/documents',
  NOTIFICATIONS: '/api/notifications',
  COMMENTS: '/api/comments',
} as const

/**
 * External URLs
 */
export const EXTERNAL_URLS = {
  DOCS: 'https://docs.synqforge.com',
  SUPPORT: 'https://support.synqforge.com',
  GITHUB: 'https://github.com/synqforge/synqforge',
  TWITTER: 'https://twitter.com/synqforge',
  DISCORD: 'https://discord.gg/synqforge',
} as const

/**
 * Feature flags
 */
export const FEATURES = {
  REALTIME_COLLABORATION: true,
  AI_STORY_GENERATION: true,
  DOCUMENT_PROCESSING: true,
  ANALYTICS: true,
  TEMPLATES: true,
  NOTIFICATIONS: true,
  COMMENTS: true,
} as const

/**
 * Environment checks
 */
export const ENV = {
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
  IS_BROWSER: typeof window !== 'undefined',
  IS_SERVER: typeof window === 'undefined',
} as const
