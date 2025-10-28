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
 * NEW 2025 Per-User Pricing Structure (GBP)
 * Pricing: Starter (£0), Core (£10.99), Pro (£19.99), Team (£16.99), Enterprise (custom)
 * Benchmarked against Jira, Linear, ClickUp, Shortcut, Asana
 */
export const SUBSCRIPTION_LIMITS = {
  // Legacy tiers (for backward compatibility)
  free: {
    maxProjects: 1,
    maxStoriesPerProject: 50,
    maxSeats: 5,
    includedSeats: 5,
    seatPrice: 0,
    monthlyAIActions: 15,
    aiActionsPoolingEnabled: false,
    aiActionsRolloverPercent: 0,
    maxChildrenPerSplit: 3,
    monthlyAITokens: 20000,
    monthlyAIGenerations: 15,
    maxStoriesPerGeneration: 5,
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
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseBulkSplit: false,
    canUseSplitPreflightEstimates: true,
    canExport: false,
    canUseTemplates: false,
    canUseAPI: false,
    canUseCustomFields: false,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,
    aiActionsPerMinute: 5,
    heavyJobsPerMinute: 1,
    supportLevel: 'community' as const,
    price: 0,
    currency: 'USD' as const,
    billingInterval: 'monthly' as const,
    trialDays: 0,
    perUser: false,
    displayName: 'Free',
    displayPrice: 'Free',
  },
  solo: {
    maxProjects: 3,
    maxStoriesPerProject: 200,
    maxSeats: 1,
    includedSeats: 1,
    seatPrice: 0,
    monthlyAIActions: 150,
    aiActionsPoolingEnabled: false,
    aiActionsRolloverPercent: 0,
    maxChildrenPerSplit: 3,
    monthlyAITokens: 300000,
    monthlyAIGenerations: 50,
    maxStoriesPerGeneration: 10,
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
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseBulkSplit: false,
    canUseSplitPreflightEstimates: true,
    canExport: true,
    canUseTemplates: true,
    canUseAPI: false,
    canUseCustomFields: false,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,
    aiActionsPerMinute: 10,
    heavyJobsPerMinute: 1,
    supportLevel: 'email' as const,
    price: 9,
    currency: 'USD' as const,
    billingInterval: 'monthly' as const,
    trialDays: 14,
    perUser: false,
    displayName: 'Solo',
    displayPrice: '$9/month',
  },
  business: {
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 5,
    seatPrice: 15,
    monthlyAIActions: 5000,
    aiActionsPerSeat: 0,
    softPerUserCap: 1500,
    aiActionsPoolingEnabled: true,
    aiActionsRolloverPercent: 0,
    maxChildrenPerSplit: 7,
    monthlyAITokens: 10000000,
    monthlyAIGenerations: 500,
    maxStoriesPerGeneration: 50,
    canUseBacklogAutopilot: true,
    canUseACValidator: true,
    canUseTestGeneration: true,
    canUsePlanningForecast: true,
    canUseEffortScoring: true,
    canUseKnowledgeSearch: true,
    canUseInboxParsing: true,
    canUseRepoAwareness: true,
    canUseWorkflowAgents: true,
    canUseGovernance: true,
    canUseModelControls: true,
    canUseAnalytics: true,
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseBulkSplit: true,
    canUseSplitPreflightEstimates: true,
    canExport: true,
    canUseTemplates: true,
    canUseAPI: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: true,
    aiActionsPerMinute: 60,
    heavyJobsPerMinute: 5,
    supportLevel: 'priority' as const,
    price: 99,
    currency: 'USD' as const,
    billingInterval: 'monthly' as const,
    trialDays: 14,
    perUser: false,
    displayName: 'Business',
    displayPrice: '$99/month + $15/user',
  },
  starter: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: 1,
    includedSeats: 1,
    seatPrice: 0,

    // AI Actions (per-user allowance, no pooling)
    monthlyAIActions: 25, // 25 AI actions per user/month
    aiActionsPoolingEnabled: false, // Individual allowances only
    aiActionsRolloverPercent: 0, // No rollover
    maxChildrenPerSplit: 3, // Max 3 children when splitting stories
    
    // Legacy token tracking (for transition)
    monthlyAITokens: 20000, // 20k tokens/month per user
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

    // Story Split Features
    canUseSingleStorySplit: true, // Can use Split story feature
    canUseStorySplitINVEST: true, // INVEST gating enabled
    canUseStorySplitSPIDR: true, // SPIDR hints enabled
    canUseStoryUpdate: true, // Can use Propose update feature
    canUseStoryUpdateDiff: true, // Side-by-side diff enabled
    canUseBulkSplit: false, // No bulk operations
    canUseSplitPreflightEstimates: true, // Shows preflight cost estimates

    // Features
    canExport: false,
    canUseTemplates: false,
    canUseAPI: false,
    canUseCustomFields: false,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,

    // Rate Limits
    aiActionsPerMinute: 5,
    heavyJobsPerMinute: 1,

    // Support
    supportLevel: 'community',

    // Billing
    price: 0,
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 0,
    perUser: true,

    // Display name
    displayName: 'Starter',
    displayPrice: 'Free',
  },
  core: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: 1,
    includedSeats: 1,
    seatPrice: 10.99, // £10.99/user/month

    // AI Actions (per-user allowance with 20% rollover)
    monthlyAIActions: 400, // 400 AI actions per user/month
    aiActionsPoolingEnabled: false, // Individual allowances
    aiActionsRolloverPercent: 20, // 20% rollover of unused actions
    maxChildrenPerSplit: 3, // Max 3 children when splitting stories
    
    // Legacy token tracking
    monthlyAITokens: 50000, // 50k tokens/month per user
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

    // Story Split Features
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseStoryUpdateSectionAccept: true, // Per-section accept/reject
    canUseBulkSplit: false,
    canUseSplitPreflightEstimates: true,

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
    supportLevel: 'email',

    // Billing
    price: 10.99, // £10.99/user/month
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 14,
    annualPrice: 109.90, // £109.90/user/year (saves ~17%)
    perUser: true,

    // Display name
    displayName: 'Core',
    displayPrice: '£10.99',
  },
  pro: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: 4,
    includedSeats: 3,
    seatPrice: 19.99, // £19.99/user/month

    // AI Actions (per-user allowance with 20% rollover)
    monthlyAIActions: 800, // 800 AI actions per user/month
    aiActionsPoolingEnabled: false, // Individual allowances
    aiActionsRolloverPercent: 20, // 20% rollover of unused actions
    maxChildrenPerSplit: 3, // Max 3 children when splitting stories
    
    // Legacy token tracking
    monthlyAITokens: 80000, // 80k tokens/month per user
    monthlyAIGenerations: 80,
    maxStoriesPerGeneration: 15,

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

    // Story Split Features
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseStoryUpdateSectionAccept: true, // Per-section accept/reject
    canUseBulkSplit: true, // Bulk split (up to 3)
    canUseSplitPreflightEstimates: true,

    // Features
    canExport: true,
    canUseTemplates: true,
    canUseAPI: false,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: false,
    canUseSSO: false,

    // Rate Limits
    aiActionsPerMinute: 30,
    heavyJobsPerMinute: 3,

    // Support
    supportLevel: 'email',

    // Billing
    price: 19.99, // £19.99/user/month
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 14,
    annualPrice: 199.90, // £199.90/user/year (saves ~17%)
    perUser: true,

    // Display name
    displayName: 'Pro (Collaborative)',
    displayPrice: '£19.99',
  },
  team: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 5, // Minimum 5 seats
    seatPrice: 16.99, // £16.99/user/month (15% off vs Pro)

    // AI Actions (workspace pool + per-seat allocation)
    monthlyAIActions: 10000, // Base pool of 10,000 AI actions
    aiActionsPerSeat: 1000, // Plus 1,000 per seat
    aiActionsPoolingEnabled: true, // Pooled allowances across workspace
    aiActionsRolloverPercent: 20, // 20% rollover
    softPerUserCap: 2000, // Soft cap per user to prevent abuse
    maxChildrenPerSplit: 7, // Max 7 children when splitting stories
    
    // Legacy token tracking
    monthlyAITokens: 300000, // 300k tokens/month
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

    // Story Split Features
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStorySplitPlaybooks: true, // SPIDR playbooks
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseStoryUpdateSectionAccept: true,
    canUseStoryUpdateStructuredPatching: true, // Structured patching
    canUseBulkSplit: true, // Bulk Split from backlog
    canUseBulkUpdate: true, // Bulk Update-from-note
    canUseSplitPreflightEstimates: true,
    canUseSplitApprovals: true, // Approval flows for Done items
    canUsePolicyRules: true, // Max children, max actions per note
    canUseAuditTrail: true, // Audit trail with revision links

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
    supportLevel: 'priority',

    // Billing
    price: 16.99, // £16.99/user/month (15% discount applied)
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 14,
    annualPrice: 169.90, // £169.90/user/year (saves ~17%)
    perUser: true,

    // Display name
    displayName: 'Team (5+)',
    displayPrice: '£16.99',
  },
  enterprise: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: 20, // Negotiable
    seatPrice: 0, // Custom pricing

    // AI Actions (custom pools with department allocations)
    monthlyAIActions: 50000, // Base custom pool
    aiActionsPerSeat: 2000, // Plus per seat
    aiActionsPoolingEnabled: true, // Pooled with department allocations
    aiActionsRolloverPercent: 0, // Custom policy
    aiActionsBudgetCeiling: true, // Hard budget enforcement
    aiActionsConcurrencyReservations: true, // Concurrency guarantees
    softPerUserCap: 5000, // Soft cap per user
    maxChildrenPerSplit: Infinity, // No limit with templates
    
    // Legacy token tracking
    monthlyAITokens: 5000000, // 5M tokens/month (or custom)
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

    // Story Split Features (Full suite)
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStorySplitPlaybooks: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseStoryUpdateSectionAccept: true,
    canUseStoryUpdateStructuredPatching: true,
    canUseBulkSplit: true,
    canUseBulkUpdate: true,
    canUseBulkOperationsAtScale: true, // Bulk at scale
    canUseSplitPreflightEstimates: true,
    canUseSplitApprovals: true,
    canUsePolicyRules: true,
    canUseAuditTrail: true,
    canUseOrgWideTemplates: true, // Org-wide templates
    canUseEnforcedINVEST: true, // Enforced INVEST checklists
    canUseAdminCostPolicies: true, // Admin-only cost policies
    canUseDepartmentAllocations: true, // Department budget allocations

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
    price: 0, // Custom pricing (starts at £25/user/month)
    priceStarting: 25, // Starts at £25/user/month
    currency: 'GBP',
    billingInterval: 'annual',
    trialDays: 14,
    perUser: false,

    // Display name
    displayName: 'Enterprise',
    displayPrice: 'Custom',
  },
  admin: {
    // Projects & Stories
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxSeats: Infinity,
    includedSeats: Infinity,
    seatPrice: 0,

    // AI Actions (unlimited for admin)
    monthlyAIActions: Infinity,
    aiActionsPerSeat: Infinity,
    aiActionsPoolingEnabled: true,
    aiActionsRolloverPercent: 100,
    aiActionsBudgetCeiling: false,
    aiActionsConcurrencyReservations: true,
    softPerUserCap: Infinity,
    maxChildrenPerSplit: Infinity,
    
    // Legacy token tracking
    monthlyAITokens: Infinity,
    monthlyAIGenerations: Infinity,
    maxStoriesPerGeneration: Infinity,

    // Advanced AI Modules (All enabled)
    canUseBacklogAutopilot: true,
    canUseACValidator: true,
    canUseTestGeneration: true,
    canUsePlanningForecast: true,
    canUseEffortScoring: true,
    canUseKnowledgeSearch: true,
    canUseInboxParsing: true,
    canUseRepoAwareness: true,
    canUseWorkflowAgents: true,
    canUseGovernance: true,
    canUseModelControls: true,
    canUseAnalytics: true,

    // Story Split Features (All enabled)
    canUseSingleStorySplit: true,
    canUseStorySplitINVEST: true,
    canUseStorySplitSPIDR: true,
    canUseStorySplitPlaybooks: true,
    canUseStoryUpdate: true,
    canUseStoryUpdateDiff: true,
    canUseStoryUpdateSectionAccept: true,
    canUseStoryUpdateStructuredPatching: true,
    canUseBulkSplit: true,
    canUseBulkUpdate: true,
    canUseBulkOperationsAtScale: true,
    canUseSplitPreflightEstimates: true,
    canUseSplitApprovals: true,
    canUsePolicyRules: true,
    canUseAuditTrail: true,
    canUseOrgWideTemplates: true,
    canUseEnforcedINVEST: true,
    canUseAdminCostPolicies: true,
    canUseDepartmentAllocations: true,

    // Features (All enabled)
    canExport: true,
    canUseTemplates: true,
    canUseAPI: true,
    canUseCustomFields: true,
    canUseAdvancedAnalytics: true,
    canUseSSO: true,
    canUseSCIM: true,
    canUseDataResidency: true,
    canUseDLP: true,

    // Rate Limits (No limits)
    aiActionsPerMinute: Infinity,
    heavyJobsPerMinute: Infinity,

    // Support
    supportLevel: 'dedicated',

    // Billing
    price: 0,
    currency: 'GBP',
    billingInterval: 'monthly',
    trialDays: 0,
    perUser: false,

    // Display name
    displayName: 'Admin (Internal)',
    displayPrice: 'Internal Use Only',
  },
} as const

/**
 * Feature Gate - Coming Soon Features
 * Features planned for Q2 2026
 */
export const COMING_SOON_FEATURES = {
  API_INTEGRATIONS: {
    releaseQuarter: '2026-Q2',
    message: 'API Integrations will be available from Q2 2026',
    features: ['REST API', 'Webhooks', 'Jira Sync', 'Linear Sync', 'Slack Integration']
  },
  ADVANCED_INTEGRATIONS: {
    releaseQuarter: '2026-Q2',
    message: 'Advanced integrations coming Q2 2026',
    features: ['GitHub Integration', 'GitLab Integration', 'Azure DevOps']
  }
} as const

/**
 * AI Action Costs
 * One AI action = one analyze+suggest cycle
 */
export const AI_ACTION_COSTS = {
  STORY_SPLIT: 1, // 1 action per split operation
  STORY_UPDATE: 1, // 1 action per update operation
  STORY_GENERATION: 1, // 1 action per story generated
  STORY_VALIDATION: 1, // 1 action per validation
  EPIC_CREATION: 1, // 1 action per epic
  DOCUMENT_ANALYSIS: 2, // 2 actions per document (heavier operation)
  BACKLOG_AUTOPILOT: 3, // 3 actions per autopilot run
  BULK_SPLIT: 2, // 2 actions per bulk split operation
  BULK_UPDATE: 2, // 2 actions per bulk update operation
} as const

/**
 * AI Token Costs (legacy - for token-to-action conversion)
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
 * AI Action Overage Pricing (2025 GBP)
 */
export const AI_ACTION_OVERAGE = {
  pricePerPack: 20, // £20 per pack
  actionsPerPack: 1000, // 1,000 actions per pack
  expiryDays: 90, // 90-day expiry
  maxActivePacks: 5, // Max 5 active packs
  availableFor: ['core', 'pro', 'team', 'enterprise'], // Core, Pro, Team, Enterprise can buy
} as const

/**
 * AI Booster Add-on (for Starter tier)
 */
export const AI_BOOSTER_ADDON = {
  price: 5, // £5/user/month
  aiActions: 200, // Adds 200 AI actions per user
  tierRestriction: 'starter', // Only available for Starter tier
  recurring: true, // Monthly subscription
} as const

/**
 * Priority Support Pack (for Pro tiers)
 */
export const PRIORITY_SUPPORT_ADDON = {
  price: 15, // £15/month
  supportLevel: 'priority_24h', // Upgrades to 24h priority support
  availableFor: ['core', 'pro'], // Only Core and Pro users
  recurring: true, // Monthly subscription
} as const

/**
 * Seat Add-on Pricing (2025 GBP per-user pricing)
 */
export const SEAT_PRICING = {
  core: 10.99, // £10.99/user/month
  pro: 19.99, // £19.99/user/month
  team: 16.99, // £16.99/user/month (15% discount for 5+)
  enterprise: 0, // Custom pricing
} as const

/**
 * Token Top-up Packages (legacy - transitioning to AI actions)
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
