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
 * Aligned with Stripe products and pricing page (v1.0 - October 2025)
 * Pricing: Free (£0), Team (£49/mo), Business (£149/mo), Enterprise (custom)
 */
export const SUBSCRIPTION_LIMITS = {
  free: {
    // Projects & Stories
    maxProjects: 1,
    maxStoriesPerProject: 50,
    maxSeats: 2,
    includedSeats: 2,
    seatPrice: 0,

    // AI Usage (pooled tokens per workspace)
    monthlyAITokens: 20000, // 20k pooled tokens/month
    monthlyAIGenerations: 15,
    maxStoriesPerGeneration: 5,

    // Advanced AI Modules
    canUseBacklogAutopilot: false,
    canUseACValidator: false,
    canUseTestGeneration: false,
    canUsePlanningForecast: false,
    canUseEffortScoring: false,
    canUseKnowledgeSearch: false,
    canUseInboxParsing: false,
    canUseRepoAwareness: false,
    canUseWorkflowAgents: false,
    canUseGovernance: false,
    canUseModelControls: false,
    canUseAnalytics: false,

    // Features
    canExport: false,
    canUseTemplates: false,
    canUseAPI: false,
    canUseCustomFields: false,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,

    // Rate Limits
    aiActionsPerMinute: 10,
    heavyJobsPerMinute: 1,

    // Support
    supportLevel: 'community',

    // Billing
    price: 0,
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 0,

    // Display name
    displayName: 'Free',
  },
  solo: {
    // Projects & Stories
    maxProjects: 3,
    maxStoriesPerProject: Infinity,
    maxSeats: 1,
    includedSeats: 1,
    seatPrice: 0,

    // AI Usage (pooled tokens per workspace)
    monthlyAITokens: 50000, // 50k pooled tokens/month
    monthlyAIGenerations: 50,
    maxStoriesPerGeneration: 10,

    // Advanced AI Modules
    canUseBacklogAutopilot: false,
    canUseACValidator: false,
    canUseTestGeneration: false,
    canUsePlanningForecast: false,
    canUseEffortScoring: false,
    canUseKnowledgeSearch: false,
    canUseInboxParsing: false,
    canUseRepoAwareness: false,
    canUseWorkflowAgents: false,
    canUseGovernance: false,
    canUseModelControls: false,
    canUseAnalytics: false,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseAPI: false,
    canUseCustomFields: false,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,

    // Rate Limits
    aiActionsPerMinute: 20,
    heavyJobsPerMinute: 2,

    // Support
    supportLevel: 'community',

    // Billing
    price: 19, // £19/month
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 7,
    annualPrice: 190, // £190/year (save £38)

    // Display name
    displayName: 'Solo',
  },
  team: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 5,
    seatPrice: 9, // £9/seat/month

    // AI Usage (pooled tokens per workspace)
    monthlyAITokens: 300000, // 300k pooled tokens/month
    monthlyAIGenerations: 300,
    maxStoriesPerGeneration: 20,

    // Advanced AI Modules
    canUseBacklogAutopilot: true,
    canUseACValidator: true,
    canUseTestGeneration: true,
    canUsePlanningForecast: true,
    canUseEffortScoring: true,
    canUseKnowledgeSearch: true, // Basic semantic search
    canUseInboxParsing: false,
    canUseRepoAwareness: false,
    canUseWorkflowAgents: false,
    canUseGovernance: false,
    canUseModelControls: false,
    canUseAnalytics: true, // Basic analytics

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseAPI: false,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,

    // Rate Limits
    aiActionsPerMinute: 60,
    heavyJobsPerMinute: 6,

    // Support
    supportLevel: 'email',

    // Billing
    price: 29, // £29/month for 5 seats
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 7,
    annualPrice: 290, // £290/year (save £58)

    // Display name
    displayName: 'Team',
  },
  pro: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 20,
    seatPrice: 12, // £12/seat/month

    // AI Usage (pooled tokens per workspace)
    monthlyAITokens: Infinity, // Unlimited pooled tokens/month
    monthlyAIGenerations: Infinity,
    maxStoriesPerGeneration: 100,

    // Advanced AI Modules
    canUseBacklogAutopilot: true,
    canUseACValidator: true,
    canUseTestGeneration: true,
    canUsePlanningForecast: true,
    canUseEffortScoring: true,
    canUseKnowledgeSearch: true,
    canUseInboxParsing: true,
    canUseRepoAwareness: false, // Enterprise only
    canUseWorkflowAgents: false, // Enterprise only
    canUseGovernance: false, // Enterprise only
    canUseModelControls: false, // Enterprise only
    canUseAnalytics: true,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseAPI: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: true,

    // Rate Limits
    aiActionsPerMinute: 120,
    heavyJobsPerMinute: 12,

    // Support
    supportLevel: 'priority',

    // Billing
    price: 99, // £99/month for 20 seats
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 7,
    annualPrice: 990, // £990/year (save £198)

    // Display name
    displayName: 'Pro',
  },
  business: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 10,
    seatPrice: 12, // £12/seat/month

    // AI Usage (pooled tokens per workspace)
    monthlyAITokens: 1000000, // 1M pooled tokens/month
    monthlyAIGenerations: 1000,
    maxStoriesPerGeneration: 50,

    // Advanced AI Modules (1-7)
    canUseBacklogAutopilot: true,
    canUseACValidator: true,
    canUseTestGeneration: true,
    canUsePlanningForecast: true,
    canUseEffortScoring: true,
    canUseKnowledgeSearch: true,
    canUseInboxParsing: true,
    canUseRepoAwareness: false, // Enterprise only
    canUseWorkflowAgents: false, // Enterprise only
    canUseGovernance: false, // Enterprise only
    canUseModelControls: false, // Enterprise only
    canUseAnalytics: true,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseAPI: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: false,

    // Rate Limits
    aiActionsPerMinute: 60,
    heavyJobsPerMinute: 6,

    // Support
    supportLevel: 'priority',

    // Billing
    price: 149, // £149/month for 10 seats
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 14,
    annualPrice: 1490, // £1,490/year (2 months free)

    // Display name
    displayName: 'Business',
  },
  enterprise: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 20, // Negotiable
    seatPrice: 0, // Custom pricing

    // AI Usage (pooled tokens per workspace)
    monthlyAITokens: 5000000, // 5M pooled tokens/month (or custom)
    monthlyAIGenerations: Infinity,
    maxStoriesPerGeneration: 100,

    // Advanced AI Modules (All 12 modules)
    canUseBacklogAutopilot: true,
    canUseACValidator: true,
    canUseTestGeneration: true,
    canUsePlanningForecast: true,
    canUseEffortScoring: true,
    canUseKnowledgeSearch: true,
    canUseInboxParsing: true,
    canUseRepoAwareness: true, // Enterprise only
    canUseWorkflowAgents: true, // Enterprise only
    canUseGovernance: true, // Enterprise only
    canUseModelControls: true, // Enterprise only
    canUseAnalytics: true,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseAPI: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: true,
    canUseSCIM: true,
    canUseDataResidency: true,
    canUseDLP: true,

    // Rate Limits
    aiActionsPerMinute: 120, // Higher limits
    heavyJobsPerMinute: 12,

    // Support
    supportLevel: 'dedicated',

    // Billing
    price: 299, // £299/month base price
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 14,
    annualPrice: 2990, // £2,990/year (save £598)

    // Display name
    displayName: 'Enterprise',
  },
} as const

/**
 * AI Token Overage Pricing
 */
export const AI_OVERAGE = {
  pricePerUnit: 2, // £2 per 100k tokens
  unitSize: 100000, // 100k tokens
  threshold: 1.1, // Bill overage when usage exceeds 110% of pool
} as const

/**
 * Seat Add-on Pricing (per seat per month)
 */
export const SEAT_PRICING = {
  team: 9, // £9/seat/month
  business: 12, // £12/seat/month
  enterprise: 0, // Custom pricing
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
  STORY_SPLIT: 2500, // Average for splitting a story into 2-5 child stories
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
