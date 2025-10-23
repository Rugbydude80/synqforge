import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  json,
  decimal,
  integer,
  date,
  smallint,
  index,
  uniqueIndex,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Custom bytea type for binary data storage
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

// ============================================
// ENUMS - Define before tables
// ============================================

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'solo', 'team', 'pro', 'business', 'enterprise'])
export const roleEnum = pgEnum('role', ['owner', 'admin', 'member', 'viewer'])
export const projectStatusEnum = pgEnum('project_status', ['planning', 'active', 'on_hold', 'completed', 'archived'])
export const epicStatusEnum = pgEnum('epic_status', ['draft', 'published', 'planned', 'in_progress', 'completed', 'archived'])
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical'])
export const storyStatusEnum = pgEnum('story_status', ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'])
export const storyTypeEnum = pgEnum('story_type', ['feature', 'bug', 'task', 'spike'])
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done', 'blocked'])
export const sprintStatusEnum = pgEnum('sprint_status', ['planning', 'active', 'completed', 'cancelled'])
export const aiGenerationTypeEnum = pgEnum('ai_generation_type', [
  'story_generation',
  'story_validation',
  'epic_creation',
  'requirements_analysis',
  'backlog_autopilot',
  'ac_validation',
  'test_generation',
  'planning_forecast',
  'effort_scoring',
  'impact_scoring',
  'knowledge_search',
  'inbox_parsing',
  'repo_analysis',
  'pr_summary'
])
export const autopilotJobStatusEnum = pgEnum('autopilot_job_status', ['pending', 'processing', 'review', 'completed', 'failed', 'cancelled'])
export const validationRuleTypeEnum = pgEnum('validation_rule_type', ['uk_spelling', 'atomic_criteria', 'max_ands', 'max_lines', 'required_fields'])
export const artefactTypeEnum = pgEnum('artefact_type', ['gherkin', 'postman', 'playwright', 'cypress', 'unit_test'])
export const agentStatusEnum = pgEnum('agent_status', ['enabled', 'paused', 'disabled'])
export const agentActionStatusEnum = pgEnum('agent_action_status', ['pending', 'approved', 'rejected', 'executed'])
export const piiTypeEnum = pgEnum('pii_type', ['email', 'phone', 'ssn', 'credit_card', 'address', 'name'])
export const aiModelTierEnum = pgEnum('ai_model_tier', ['fast', 'balanced', 'quality'])
export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'annual'])
export const generationStatusEnum = pgEnum('generation_status', ['pending', 'completed', 'failed'])
export const processingStatusEnum = pgEnum('processing_status', ['uploaded', 'processing', 'completed', 'failed'])
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'usage', 'refund', 'bonus'])
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'docx', 'txt', 'md'])
export const notificationTypeEnum = pgEnum('notification_type', ['story_assigned', 'comment_mention', 'sprint_starting', 'story_blocked', 'epic_completed', 'comment_reply'])
export const notificationEntityEnum = pgEnum('notification_entity', ['story', 'epic', 'sprint', 'comment', 'project'])
export const digestFrequencyEnum = pgEnum('digest_frequency', ['real_time', 'daily', 'weekly'])
export const templateCategoryEnum = pgEnum('template_category', [
  'authentication',
  'crud',
  'payments',
  'notifications',
  'admin',
  'api',
  'custom'
])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'trialing',
  'unpaid'
])
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'rejected', 'expired'])

// ============================================
// ORGANIZATIONS & USERS
// ============================================

export const organizations = pgTable(
  'organizations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    logoUrl: text('logo_url'),
    settings: json('settings').$type<Record<string, any>>(),
    subscriptionTier: subscriptionTierEnum('subscription_tier').default('free'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    // Entitlements Model - Flexible subscription limits
    plan: text('plan').notNull().default('solo'),
    planCycle: text('plan_cycle').notNull().default('monthly'),
    seatsIncluded: integer('seats_included').notNull().default(1),
    projectsIncluded: integer('projects_included').notNull().default(1),
    storiesPerMonth: integer('stories_per_month').notNull().default(2000), // Legacy, kept for compatibility
    aiTokensIncluded: integer('ai_tokens_included').notNull().default(50000),
    advancedAi: boolean('advanced_ai').notNull().default(false),
    exportsEnabled: boolean('exports_enabled').notNull().default(true),
    templatesEnabled: boolean('templates_enabled').notNull().default(true),
    rbacLevel: text('rbac_level').notNull().default('none'),
    auditLevel: text('audit_level').notNull().default('none'),
    ssoEnabled: boolean('sso_enabled').notNull().default(false),
    supportTier: text('support_tier').notNull().default('community'),
    fairUse: boolean('fair_use').notNull().default(true),

    // Fair-Usage Limits
    docsPerMonth: integer('docs_per_month').notNull().default(10),
    throughputSpm: integer('throughput_spm').notNull().default(5),
    bulkStoryLimit: integer('bulk_story_limit').notNull().default(20),
    maxPagesPerUpload: integer('max_pages_per_upload').notNull().default(50),

    // Stripe Integration
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),
    subscriptionStatus: text('subscription_status').notNull().default('inactive'),
    subscriptionRenewalAt: timestamp('subscription_renewal_at'),
    trialEndsAt: timestamp('trial_ends_at'),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_org_slug').on(table.slug),
    tierIdx: index('idx_org_tier').on(table.subscriptionTier),
    stripeCustomerIdx: index('idx_org_stripe_customer').on(table.stripeCustomerId),
    stripeSubscriptionIdx: index('idx_organizations_stripe_subscription').on(table.stripeSubscriptionId),
  })
)

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    password: varchar('password', { length: 255 }),
    avatar: text('avatar'),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    role: roleEnum('role').default('member'),
    isActive: boolean('is_active').default(true),
    preferences: json('preferences').$type<Record<string, any>>(),
    lastActiveAt: timestamp('last_active_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_users_org').on(table.organizationId),
    emailIdx: uniqueIndex('idx_users_email').on(table.email),
    roleIdx: index('idx_users_role').on(table.organizationId, table.role),
  })
)

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_reset_tokens_user').on(table.userId),
    tokenIdx: uniqueIndex('idx_reset_tokens_token').on(table.token),
    expiresIdx: index('idx_reset_tokens_expires').on(table.expiresAt),
  })
)

export const teamInvitations = pgTable(
  'team_invitations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: roleEnum('role').default('member'),
    invitedBy: varchar('invited_by', { length: 36 }).notNull(),
    status: invitationStatusEnum('status').default('pending'),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    rejectedAt: timestamp('rejected_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_invitations_org').on(table.organizationId),
    emailIdx: index('idx_invitations_email').on(table.email),
    tokenIdx: uniqueIndex('idx_invitations_token').on(table.token),
    statusIdx: index('idx_invitations_status').on(table.status),
    expiresIdx: index('idx_invitations_expires').on(table.expiresAt),
  })
)

// ============================================
// PROJECTS
// ============================================

export const projects = pgTable(
  'projects',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    key: varchar('key', { length: 10 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 100 }).notNull(),
    status: projectStatusEnum('status').default('planning'),
    ownerId: varchar('owner_id', { length: 36 }).notNull(),
    settings: json('settings').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_projects_org').on(table.organizationId),
    statusIdx: index('idx_projects_status').on(table.organizationId, table.status),
    uniqueSlug: uniqueIndex('unique_project_slug').on(table.organizationId, table.slug),
  })
)

// ============================================
// EPICS & STORIES
// ============================================

export const epics = pgTable(
  'epics',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    goals: text('goals'),
    color: varchar('color', { length: 7 }).default('#a855f7'),
    status: epicStatusEnum('status').default('draft'),
    priority: priorityEnum('priority').default('medium'),
    aiGenerated: boolean('ai_generated').default(false),
    aiGenerationPrompt: text('ai_generation_prompt'),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    assignedTo: varchar('assigned_to', { length: 36 }),
    startDate: date('start_date'),
    targetDate: date('target_date'),

    // Epic linkage for split epics
    parentEpicId: varchar('parent_epic_id', { length: 36 }),
    siblingEpicIds: json('sibling_epic_ids').$type<string[]>(),
    
    // Idempotency support
    correlationKey: varchar('correlation_key', { length: 64 }),
    requestId: varchar('request_id', { length: 36 }),

    // Aggregate fields (maintained by triggers)
    totalStories: integer('total_stories').notNull().default(0),
    completedStories: integer('completed_stories').notNull().default(0),
    totalPoints: integer('total_points').notNull().default(0),
    completedPoints: integer('completed_points').notNull().default(0),
    progressPct: decimal('progress_pct', { precision: 5, scale: 1 }).notNull().default('0'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_epics_project').on(table.projectId),
    orgIdx: index('idx_epics_org').on(table.organizationId),
    statusIdx: index('idx_epics_status').on(table.projectId, table.status),
    assigneeIdx: index('idx_epics_assignee').on(table.assignedTo),
    progressIdx: index('idx_epics_progress').on(table.progressPct),
    orgStatusIdx: index('idx_epics_org_status').on(table.organizationId, table.status),
    parentEpicIdx: index('idx_epics_parent').on(table.parentEpicId),
    correlationKeyIdx: uniqueIndex('idx_epics_correlation_key').on(table.correlationKey),
    requestIdIdx: index('idx_epics_request_id').on(table.requestId),
  })
)

export const stories = pgTable(
  'stories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    epicId: varchar('epic_id', { length: 36 }),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    acceptanceCriteria: json('acceptance_criteria').$type<string[]>(),
    storyPoints: smallint('story_points'),
    priority: priorityEnum('priority').default('medium'),
    status: storyStatusEnum('status').default('backlog'),
    storyType: storyTypeEnum('story_type').default('feature'),
    tags: json('tags').$type<string[]>(),
    labels: json('labels').$type<string[]>(),
    aiGenerated: boolean('ai_generated').default(false),
    aiPrompt: text('ai_prompt'),
    aiModelUsed: varchar('ai_model_used', { length: 100 }),
    aiValidationScore: smallint('ai_validation_score'),
    aiSuggestions: json('ai_suggestions').$type<string[]>(),
    sourceDocumentId: varchar('source_document_id', { length: 36 }),
    aiConfidenceScore: smallint('ai_confidence_score'),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    assigneeId: varchar('assignee_id', { length: 36 }),

    // Idempotency support
    correlationKey: varchar('correlation_key', { length: 64 }),
    requestId: varchar('request_id', { length: 36 }),
    capabilityKey: varchar('capability_key', { length: 100 }),

    // Enhanced AC tracking
    technicalHints: json('technical_hints').$type<string[]>(),
    manualReviewRequired: boolean('manual_review_required').default(false),
    readyForSprint: boolean('ready_for_sprint').default(false),

    // Completion tracking
    doneAt: timestamp('done_at'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_stories_org').on(table.organizationId),
    epicIdx: index('idx_stories_epic').on(table.epicId),
    projectIdx: index('idx_stories_project').on(table.projectId),
    statusIdx: index('idx_stories_status').on(table.projectId, table.status),
    assigneeIdx: index('idx_stories_assignee').on(table.assigneeId),
    priorityIdx: index('idx_stories_priority').on(table.projectId, table.priority),
    sourceDocIdx: index('idx_stories_source_doc').on(table.sourceDocumentId),
    doneAtIdx: index('idx_stories_done_at').on(table.doneAt),
    sprintDoneIdx: index('idx_stories_sprint_done').on(table.organizationId, table.doneAt, table.status),
    correlationKeyIdx: uniqueIndex('idx_stories_correlation_key').on(table.correlationKey),
    requestIdIdx: index('idx_stories_request_id').on(table.requestId),
    capabilityKeyIdx: index('idx_stories_capability_key').on(table.capabilityKey),
  })
)

// ============================================
// TASKS - Agile methodology tasks linked to stories
// ============================================

export const tasks = pgTable(
  'tasks',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').default('todo'),
    priority: priorityEnum('priority').default('medium'),
    estimatedHours: smallint('estimated_hours'),
    actualHours: smallint('actual_hours'),
    assigneeId: varchar('assignee_id', { length: 36 }),
    tags: json('tags').$type<string[]>(),

    // Ordering within a story
    orderIndex: integer('order_index').default(0),

    // Completion tracking
    completedAt: timestamp('completed_at'),

    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_tasks_org').on(table.organizationId),
    storyIdx: index('idx_tasks_story').on(table.storyId),
    projectIdx: index('idx_tasks_project').on(table.projectId),
    statusIdx: index('idx_tasks_status').on(table.storyId, table.status),
    assigneeIdx: index('idx_tasks_assignee').on(table.assigneeId),
    orderIdx: index('idx_tasks_order').on(table.storyId, table.orderIndex),
  })
)

// ============================================
// SPRINTS
// ============================================

export const sprints = pgTable(
  'sprints',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    goal: text('goal'),
    status: sprintStatusEnum('status').default('planning'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    capacityPoints: integer('capacity_points'),
    plannedPoints: integer('planned_points').default(0),
    completedPoints: integer('completed_points').default(0),
    velocity: integer('velocity'),
    completionPercentage: smallint('completion_percentage').default(0),

    // Cached velocity for performance
    velocityCached: integer('velocity_cached').notNull().default(0),

    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_sprints_project').on(table.projectId),
    statusIdx: index('idx_sprints_status').on(table.projectId, table.status),
    datesIdx: index('idx_sprints_dates').on(table.startDate, table.endDate),
    velocityIdx: index('idx_sprints_velocity').on(table.projectId, table.velocityCached),
  })
)

export const sprintStories = pgTable(
  'sprint_stories',
  {
    sprintId: varchar('sprint_id', { length: 36 }).notNull(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    addedAt: timestamp('added_at').defaultNow(),
    addedBy: varchar('added_by', { length: 36 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sprintId, table.storyId] }),
    storyIdx: index('idx_sprint_stories_story').on(table.storyId),
  })
)

// ============================================
// AI TRACKING
// ============================================

export const aiGenerations = pgTable(
  'ai_generations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    type: aiGenerationTypeEnum('type').notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    promptText: text('prompt_text').notNull(),
    responseText: text('response_text'),
    tokensUsed: integer('tokens_used'),
    costUsd: decimal('cost_usd', { precision: 10, scale: 4 }),
    processingTimeMs: integer('processing_time_ms'),
    status: generationStatusEnum('status').default('pending'),
    errorMessage: text('error_message'),
    metadata: json('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_ai_org').on(table.organizationId),
    userIdx: index('idx_ai_user').on(table.userId),
    typeIdx: index('idx_ai_type').on(table.type),
    createdIdx: index('idx_ai_created').on(table.createdAt),
    costTrackingIdx: index('idx_ai_cost_tracking').on(table.organizationId, table.createdAt),
  })
)

// ============================================
// DOCUMENTS - Project-scoped with binary storage
// ============================================

export const projectDocuments = pgTable(
  'project_documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileType: fileTypeEnum('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    fileBytes: bytea('file_bytes').notNull(),
    extractedContent: text('extracted_content'),
    generatedStoryIds: json('generated_story_ids').$type<string[]>().default([]),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_project_docs_project').on(table.projectId),
    uploaderIdx: index('idx_project_docs_uploader').on(table.uploadedBy),
    typeIdx: index('idx_project_docs_type').on(table.fileType),
  })
)

// Keep old documents table for backward compatibility (deprecated)
export const documents = pgTable(
  'documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    fileSize: integer('file_size').notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    storagePath: varchar('storage_path', { length: 500 }).notNull(),
    processingStatus: processingStatusEnum('processing_status').default('uploaded'),
    extractedText: text('extracted_text'),
    aiAnalysis: json('ai_analysis').$type<Record<string, any>>(),
    generatedStoriesCount: integer('generated_stories_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_docs_org').on(table.organizationId),
    userIdx: index('idx_docs_user').on(table.uploadedBy),
    statusIdx: index('idx_docs_status').on(table.processingStatus),
  })
)

// ============================================
// ACTIVITY LOG
// ============================================

export const activities = pgTable(
  'activities',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }),
    userId: varchar('user_id', { length: 36 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: varchar('resource_id', { length: 36 }).notNull(),
    oldValues: json('old_values').$type<Record<string, any>>(),
    newValues: json('new_values').$type<Record<string, any>>(),
    metadata: json('metadata').$type<Record<string, any>>(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_activities_org').on(table.organizationId),
    projectIdx: index('idx_activities_project').on(table.projectId),
    userIdx: index('idx_activities_user').on(table.userId),
    resourceIdx: index('idx_activities_resource').on(table.resourceType, table.resourceId),
    createdIdx: index('idx_activities_created').on(table.createdAt),
  })
)

// ============================================
// USER SESSIONS
// ============================================

export const userSessions = pgTable(
  'user_sessions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    lastActivity: timestamp('last_activity').defaultNow(),
    metadata: json('metadata').$type<Record<string, any>>(),
  },
  (table) => ({
    userIdx: index('idx_sessions_user').on(table.userId),
    orgIdx: index('idx_sessions_org').on(table.organizationId),
    tokenIdx: uniqueIndex('idx_sessions_token').on(table.sessionToken),
    activityIdx: index('idx_sessions_activity').on(table.lastActivity),
  })
)

// ============================================
// BILLING
// ============================================

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }),
    type: transactionTypeEnum('type').notNull(),
    amount: integer('amount').notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    aiGenerationId: varchar('ai_generation_id', { length: 36 }),
    stripeTransactionId: varchar('stripe_transaction_id', { length: 255 }),
    balanceAfter: integer('balance_after').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_credits_org').on(table.organizationId),
    userIdx: index('idx_credits_user').on(table.userId),
    typeIdx: index('idx_credits_type').on(table.type),
    createdIdx: index('idx_credits_created').on(table.createdAt),
  })
)

export const tokenBalances = pgTable(
  'token_balances',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull().unique(),
    purchasedTokens: integer('purchased_tokens').default(0).notNull(),
    usedTokens: integer('used_tokens').default(0).notNull(),
    bonusTokens: integer('bonus_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(), // purchasedTokens + bonusTokens - usedTokens
    lastPurchaseAt: timestamp('last_purchase_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: uniqueIndex('idx_token_balances_org').on(table.organizationId),
  })
)

// ============================================
// COMMENTS & COLLABORATION
// ============================================

export const storyComments = pgTable(
  'story_comments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    content: text('content').notNull(),
    parentCommentId: varchar('parent_comment_id', { length: 36 }),
    mentions: json('mentions').$type<string[]>().default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_comments_story').on(table.storyId),
    userIdx: index('idx_comments_user').on(table.userId),
    parentIdx: index('idx_comments_parent').on(table.parentCommentId),
    createdIdx: index('idx_comments_created').on(table.createdAt),
  })
)

export const commentReactions = pgTable(
  'comment_reactions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    commentId: varchar('comment_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    emoji: varchar('emoji', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    commentIdx: index('idx_reactions_comment').on(table.commentId),
    userIdx: index('idx_reactions_user').on(table.userId),
    uniqueReaction: uniqueIndex('idx_unique_reaction').on(table.commentId, table.userId, table.emoji),
  })
)

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications = pgTable(
  'notifications',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    type: notificationTypeEnum('type').notNull(),
    entityType: notificationEntityEnum('entity_type').notNull(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    message: text('message').notNull(),
    read: boolean('read').default(false),
    actionUrl: text('action_url'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_notifications_user').on(table.userId),
    readIdx: index('idx_notifications_read').on(table.userId, table.read),
    typeIdx: index('idx_notifications_type').on(table.type),
    createdIdx: index('idx_notifications_created').on(table.createdAt),
  })
)

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: varchar('user_id', { length: 36 }).primaryKey(),
    emailEnabled: boolean('email_enabled').default(true),
    inAppEnabled: boolean('in_app_enabled').default(true),
    notifyOnMention: boolean('notify_on_mention').default(true),
    notifyOnAssignment: boolean('notify_on_assignment').default(true),
    notifyOnSprintChanges: boolean('notify_on_sprint_changes').default(true),
    digestFrequency: digestFrequencyEnum('digest_frequency').default('real_time'),
  }
)

// ============================================
// ANALYTICS
// ============================================

export const sprintAnalytics = pgTable(
  'sprint_analytics',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    sprintId: varchar('sprint_id', { length: 36 }).notNull(),
    dayNumber: smallint('day_number').notNull(),
    remainingPoints: integer('remaining_points').notNull(),
    completedPoints: integer('completed_points').notNull(),
    scopeChanges: integer('scope_changes').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    sprintIdx: index('idx_analytics_sprint').on(table.sprintId),
    dayIdx: index('idx_analytics_day').on(table.sprintId, table.dayNumber),
    uniqueDay: uniqueIndex('idx_unique_sprint_day').on(table.sprintId, table.dayNumber),
  })
)

// Keep old sprint_metrics for backward compatibility (deprecated)
export const sprintMetrics = pgTable(
  'sprint_metrics',
  {
    sprintId: varchar('sprint_id', { length: 36 }).primaryKey(),
    totalStories: integer('total_stories').default(0),
    completedStories: integer('completed_stories').default(0),
    totalPoints: integer('total_points').default(0),
    completedPoints: integer('completed_points').default(0),
    completionPercentage: decimal('completion_percentage', { precision: 5, scale: 2 }).default('0'),
    velocity: decimal('velocity', { precision: 8, scale: 2 }).default('0'),
    lastCalculated: timestamp('last_calculated').defaultNow(),
  },
  (table) => ({
    calculatedIdx: index('idx_metrics_calculated').on(table.lastCalculated),
  })
)

// ============================================
// STORY TEMPLATES - Consultant productivity
// ============================================

export const storyTemplates = pgTable(
  'story_templates',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    templateName: varchar('template_name', { length: 255 }).notNull(),
    category: templateCategoryEnum('category').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false),
    usageCount: integer('usage_count').default(0),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_templates_org').on(table.organizationId),
    categoryIdx: index('idx_templates_category').on(table.category),
    publicIdx: index('idx_templates_public').on(table.isPublic),
    creatorIdx: index('idx_templates_creator').on(table.createdBy),
  })
)

export const templateStories = pgTable(
  'template_stories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    templateId: varchar('template_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    acceptanceCriteria: json('acceptance_criteria').$type<string[]>(),
    storyPoints: smallint('story_points'),
    storyType: storyTypeEnum('story_type').default('feature'),
    tags: json('tags').$type<string[]>(),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    templateIdx: index('idx_template_stories_template').on(table.templateId),
    orderIdx: index('idx_template_stories_order').on(table.templateId, table.order),
  })
)

// ============================================
// RELATIONS
// ============================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  passwordResetTokens: many(passwordResetTokens),
}))

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}))

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamInvitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [teamInvitations.invitedBy],
    references: [users.id],
  }),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  epics: many(epics),
  sprints: many(sprints),
}))

export const epicsRelations = relations(epics, ({ one, many }) => ({
  project: one(projects, {
    fields: [epics.projectId],
    references: [projects.id],
  }),
  stories: many(stories),
}))

export const storiesRelations = relations(stories, ({ one, many }) => ({
  epic: one(epics, {
    fields: [stories.epicId],
    references: [epics.id],
  }),
  project: one(projects, {
    fields: [stories.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [stories.createdBy],
    references: [users.id],
    relationName: 'storyCreator'
  }),
  assignee: one(users, {
    fields: [stories.assigneeId],
    references: [users.id],
    relationName: 'storyAssignee'
  }),
  tasks: many(tasks),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  story: one(stories, {
    fields: [tasks.storyId],
    references: [stories.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: 'taskCreator'
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'taskAssignee'
  }),
}))

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  stories: many(sprintStories),
}))

export const sprintStoriesRelations = relations(sprintStories, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintStories.sprintId],
    references: [sprints.id],
  }),
  story: one(stories, {
    fields: [sprintStories.storyId],
    references: [stories.id],
  }),
}))

export const projectDocumentsRelations = relations(projectDocuments, ({ one }) => ({
  project: one(projects, {
    fields: [projectDocuments.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [projectDocuments.uploadedBy],
    references: [users.id],
  }),
}))

export const storyCommentsRelations = relations(storyComments, ({ one, many }) => ({
  story: one(stories, {
    fields: [storyComments.storyId],
    references: [stories.id],
  }),
  author: one(users, {
    fields: [storyComments.userId],
    references: [users.id],
  }),
  parentComment: one(storyComments, {
    fields: [storyComments.parentCommentId],
    references: [storyComments.id],
    relationName: 'commentThread',
  }),
  replies: many(storyComments, {
    relationName: 'commentThread',
  }),
  reactions: many(commentReactions),
}))

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  comment: one(storyComments, {
    fields: [commentReactions.commentId],
    references: [storyComments.id],
  }),
  user: one(users, {
    fields: [commentReactions.userId],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}))

export const sprintAnalyticsRelations = relations(sprintAnalytics, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintAnalytics.sprintId],
    references: [sprints.id],
  }),
}))

// ============================================
// STRIPE SUBSCRIPTIONS
// ============================================

export const stripeSubscriptions = pgTable(
  'stripe_subscriptions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    canceledAt: timestamp('canceled_at'),
    trialStart: timestamp('trial_start'),
    trialEnd: timestamp('trial_end'),
    billingInterval: billingIntervalEnum('billing_interval').default('monthly'),
    includedSeats: integer('included_seats').default(0),
    addonSeats: integer('addon_seats').default(0),
    metadata: json('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_stripe_subs_org').on(table.organizationId),
    customerIdx: index('idx_stripe_subs_customer').on(table.stripeCustomerId),
    subscriptionIdx: uniqueIndex('idx_stripe_subs_subscription').on(table.stripeSubscriptionId),
  })
)

// ============================================
// SEAT MANAGEMENT
// ============================================

export const organizationSeats = pgTable(
  'organization_seats',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    includedSeats: integer('included_seats').default(0).notNull(),
    addonSeats: integer('addon_seats').default(0).notNull(),
    activeSeats: integer('active_seats').default(0).notNull(),
    pendingInvites: integer('pending_invites').default(0).notNull(),
    lastSeatUpdate: timestamp('last_seat_update').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: uniqueIndex('idx_org_seats_org').on(table.organizationId),
  })
)

// ============================================
// AI USAGE METERING & POOLED TOKENS
// ============================================

export const aiUsageMetering = pgTable(
  'ai_usage_metering',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    billingPeriodStart: timestamp('billing_period_start').notNull(),
    billingPeriodEnd: timestamp('billing_period_end').notNull(),
    tokenPool: integer('token_pool').default(0).notNull(),
    tokensUsed: integer('tokens_used').default(0).notNull(),
    tokensRemaining: integer('tokens_remaining').default(0).notNull(),
    overageTokens: integer('overage_tokens').default(0).notNull(),
    overageCharges: decimal('overage_charges', { precision: 10, scale: 2 }).default('0').notNull(),
    aiActionsCount: integer('ai_actions_count').default(0).notNull(),
    heavyJobsCount: integer('heavy_jobs_count').default(0).notNull(),
    lastResetAt: timestamp('last_reset_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_ai_usage_org').on(table.organizationId),
    periodIdx: index('idx_ai_usage_period').on(table.billingPeriodStart, table.billingPeriodEnd),
    uniqueOrgPeriod: uniqueIndex('idx_unique_org_period').on(table.organizationId, table.billingPeriodStart),
  })
)

export const aiUsageAlerts = pgTable(
  'ai_usage_alerts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    alertType: varchar('alert_type', { length: 50 }).notNull(), // '50_percent', '80_percent', '95_percent', '100_percent'
    threshold: integer('threshold').notNull(),
    triggered: boolean('triggered').default(false),
    triggeredAt: timestamp('triggered_at'),
    notificationSent: boolean('notification_sent').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_usage_alerts_org').on(table.organizationId),
    triggeredIdx: index('idx_usage_alerts_triggered').on(table.triggered),
  })
)

// ============================================
// FAIR-USAGE TRACKING
// ============================================

export const workspaceUsage = pgTable(
  'workspace_usage',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    billingPeriodStart: timestamp('billing_period_start').notNull(),
    billingPeriodEnd: timestamp('billing_period_end').notNull(),

    // Token usage (primary fair-usage metric)
    tokensUsed: integer('tokens_used').notNull().default(0),
    tokensLimit: integer('tokens_limit').notNull().default(50000),

    // Document ingestion
    docsIngested: integer('docs_ingested').notNull().default(0),
    docsLimit: integer('docs_limit').notNull().default(10),

    // Timestamps
    lastResetAt: timestamp('last_reset_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_workspace_usage_org').on(table.organizationId),
    periodIdx: index('idx_workspace_usage_period').on(table.billingPeriodStart, table.billingPeriodEnd),
    uniqueOrgPeriod: uniqueIndex('unique_org_period').on(table.organizationId, table.billingPeriodStart),
  })
)

// ============================================
// ADVANCED AI: BACKLOG AUTOPILOT
// ============================================

export const autopilotJobs = pgTable(
  'autopilot_jobs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    sourceDocumentId: varchar('source_document_id', { length: 36 }),
    inputText: text('input_text').notNull(),
    status: autopilotJobStatusEnum('status').default('pending'),
    requiresReview: boolean('requires_review').default(true),
    generatedEpicIds: json('generated_epic_ids').$type<string[]>().default([]),
    generatedStoryIds: json('generated_story_ids').$type<string[]>().default([]),
    detectedDuplicates: json('detected_duplicates').$type<any[]>().default([]),
    detectedDependencies: json('detected_dependencies').$type<any[]>().default([]),
    tokensUsed: integer('tokens_used').default(0),
    processingTimeMs: integer('processing_time_ms'),
    errorMessage: text('error_message'),
    reviewedBy: varchar('reviewed_by', { length: 36 }),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_autopilot_org').on(table.organizationId),
    projectIdx: index('idx_autopilot_project').on(table.projectId),
    statusIdx: index('idx_autopilot_status').on(table.status),
    userIdx: index('idx_autopilot_user').on(table.userId),
  })
)

// ============================================
// ADVANCED AI: AC VALIDATOR
// ============================================

export const acValidationRules = pgTable(
  'ac_validation_rules',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    ruleName: varchar('rule_name', { length: 255 }).notNull(),
    ruleType: validationRuleTypeEnum('rule_type').notNull(),
    ruleConfig: json('rule_config').$type<Record<string, any>>(),
    isActive: boolean('is_active').default(true),
    priority: integer('priority').default(0),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_ac_rules_org').on(table.organizationId),
    typeIdx: index('idx_ac_rules_type').on(table.ruleType),
    activeIdx: index('idx_ac_rules_active').on(table.isActive),
  })
)

export const acValidationResults = pgTable(
  'ac_validation_results',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    overallScore: integer('overall_score').notNull(), // 0-100
    passedRules: json('passed_rules').$type<string[]>().default([]),
    failedRules: json('failed_rules').$type<any[]>().default([]),
    suggestions: json('suggestions').$type<string[]>().default([]),
    autoFixAvailable: boolean('auto_fix_available').default(false),
    autoFixProposal: json('auto_fix_proposal').$type<Record<string, any>>(),
    appliedBy: varchar('applied_by', { length: 36 }),
    appliedAt: timestamp('applied_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_ac_validation_story').on(table.storyId),
    orgIdx: index('idx_ac_validation_org').on(table.organizationId),
    scoreIdx: index('idx_ac_validation_score').on(table.overallScore),
  })
)

// ============================================
// ADVANCED AI: TEST & ARTEFACT GENERATION
// ============================================

export const testArtefacts = pgTable(
  'test_artefacts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    artefactType: artefactTypeEnum('artefact_type').notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    content: text('content').notNull(),
    linkedAcIds: json('linked_ac_ids').$type<string[]>().default([]),
    metadata: json('metadata').$type<Record<string, any>>(),
    generatedBy: varchar('generated_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_test_artefacts_story').on(table.storyId),
    orgIdx: index('idx_test_artefacts_org').on(table.organizationId),
    typeIdx: index('idx_test_artefacts_type').on(table.artefactType),
  })
)

// ============================================
// ADVANCED AI: PLANNING & FORECASTING
// ============================================

export const sprintForecasts = pgTable(
  'sprint_forecasts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    forecastDate: timestamp('forecast_date').notNull(),
    averageVelocity: decimal('average_velocity', { precision: 8, scale: 2 }),
    suggestedCapacity: integer('suggested_capacity'),
    spilloverProbability: integer('spillover_probability'), // 0-100
    confidence50Date: date('confidence_50_date'),
    confidence75Date: date('confidence_75_date'),
    confidence90Date: date('confidence_90_date'),
    forecastData: json('forecast_data').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_forecasts_project').on(table.projectId),
    orgIdx: index('idx_forecasts_org').on(table.organizationId),
    dateIdx: index('idx_forecasts_date').on(table.forecastDate),
  })
)

// ============================================
// ADVANCED AI: EFFORT & IMPACT SCORING
// ============================================

export const effortScores = pgTable(
  'effort_scores',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    suggestedPoints: integer('suggested_points').notNull(),
    confidence: integer('confidence').notNull(), // 0-100
    reasoning: text('reasoning'),
    similarStoryIds: json('similar_story_ids').$type<string[]>().default([]),
    approvedBy: varchar('approved_by', { length: 36 }),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_effort_scores_story').on(table.storyId),
    orgIdx: index('idx_effort_scores_org').on(table.organizationId),
  })
)

export const impactScores = pgTable(
  'impact_scores',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    reach: integer('reach'),
    impact: integer('impact'),
    confidence: integer('confidence'),
    effort: integer('effort'),
    riceScore: decimal('rice_score', { precision: 10, scale: 2 }),
    wsjfScore: decimal('wsjf_score', { precision: 10, scale: 2 }),
    reasoning: text('reasoning'),
    lockedBy: varchar('locked_by', { length: 36 }),
    lockedAt: timestamp('locked_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_impact_scores_story').on(table.storyId),
    orgIdx: index('idx_impact_scores_org').on(table.organizationId),
    riceIdx: index('idx_impact_scores_rice').on(table.riceScore),
  })
)

// ============================================
// ADVANCED AI: KNOWLEDGE SEARCH (RAG)
// ============================================

export const knowledgeEmbeddings = pgTable(
  'knowledge_embeddings',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    sourceType: varchar('source_type', { length: 50 }).notNull(), // 'story', 'epic', 'document', 'commit'
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    content: text('content').notNull(),
    embedding: json('embedding').$type<number[]>(), // Vector storage (will use pgvector in production)
    metadata: json('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_knowledge_org').on(table.organizationId),
    sourceIdx: index('idx_knowledge_source').on(table.sourceType, table.sourceId),
  })
)

export const knowledgeSearches = pgTable(
  'knowledge_searches',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    query: text('query').notNull(),
    results: json('results').$type<any[]>(),
    resultCount: integer('result_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_knowledge_searches_org').on(table.organizationId),
    userIdx: index('idx_knowledge_searches_user').on(table.userId),
  })
)

// ============================================
// ADVANCED AI: INBOX TO BACKLOG
// ============================================

export const inboxParsing = pgTable(
  'inbox_parsing',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    sourceType: varchar('source_type', { length: 50 }).notNull(), // 'slack', 'teams', 'email'
    rawContent: text('raw_content').notNull(),
    extractedDecisions: json('extracted_decisions').$type<string[]>().default([]),
    extractedActions: json('extracted_actions').$type<any[]>().default([]),
    extractedRisks: json('extracted_risks').$type<string[]>().default([]),
    proposedStories: json('proposed_stories').$type<any[]>().default([]),
    piiDetected: boolean('pii_detected').default(false),
    piiRedacted: text('pii_redacted'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_inbox_org').on(table.organizationId),
    userIdx: index('idx_inbox_user').on(table.userId),
    typeIdx: index('idx_inbox_type').on(table.sourceType),
  })
)

// ============================================
// ADVANCED AI: REPO AWARENESS
// ============================================

export const gitIntegrations = pgTable(
  'git_integrations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }),
    provider: varchar('provider', { length: 50 }).notNull(), // 'github', 'gitlab', 'bitbucket'
    repositoryUrl: varchar('repository_url', { length: 500 }).notNull(),
    accessToken: text('access_token'), // Encrypted
    webhookSecret: text('webhook_secret'),
    isActive: boolean('is_active').default(true),
    lastSyncAt: timestamp('last_sync_at'),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_git_integrations_org').on(table.organizationId),
    projectIdx: index('idx_git_integrations_project').on(table.projectId),
    activeIdx: index('idx_git_integrations_active').on(table.isActive),
  })
)

export const prSummaries = pgTable(
  'pr_summaries',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    storyId: varchar('story_id', { length: 36 }),
    gitIntegrationId: varchar('git_integration_id', { length: 36 }).notNull(),
    prNumber: integer('pr_number').notNull(),
    prUrl: varchar('pr_url', { length: 500 }),
    prTitle: varchar('pr_title', { length: 255 }),
    summary: text('summary'),
    filesChanged: integer('files_changed'),
    linesAdded: integer('lines_added'),
    linesRemoved: integer('lines_removed'),
    status: varchar('status', { length: 50 }), // 'open', 'merged', 'closed'
    linkedStoryIds: json('linked_story_ids').$type<string[]>().default([]),
    driftDetected: boolean('drift_detected').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_pr_summaries_org').on(table.organizationId),
    storyIdx: index('idx_pr_summaries_story').on(table.storyId),
    integrationIdx: index('idx_pr_summaries_integration').on(table.gitIntegrationId),
    driftIdx: index('idx_pr_summaries_drift').on(table.driftDetected),
  })
)

// ============================================
// ADVANCED AI: WORKFLOW AGENTS
// ============================================

export const workflowAgents = pgTable(
  'workflow_agents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    agentName: varchar('agent_name', { length: 255 }).notNull(),
    description: text('description'),
    status: agentStatusEnum('status').default('enabled'),
    triggerEvent: varchar('trigger_event', { length: 100 }).notNull(),
    scope: json('scope').$type<Record<string, any>>(), // Project IDs, story types, etc.
    rateLimitPerHour: integer('rate_limit_per_hour').default(60),
    tokenCapPerAction: integer('token_cap_per_action').default(5000),
    requiresApproval: boolean('requires_approval').default(true),
    actionConfig: json('action_config').$type<Record<string, any>>(),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_agents_org').on(table.organizationId),
    statusIdx: index('idx_agents_status').on(table.status),
  })
)

export const agentActions = pgTable(
  'agent_actions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    agentId: varchar('agent_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    triggeredBy: varchar('triggered_by', { length: 255 }),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: varchar('target_id', { length: 36 }),
    status: agentActionStatusEnum('status').default('pending'),
    actionData: json('action_data').$type<Record<string, any>>(),
    result: json('result').$type<Record<string, any>>(),
    tokensUsed: integer('tokens_used').default(0),
    reviewedBy: varchar('reviewed_by', { length: 36 }),
    reviewedAt: timestamp('reviewed_at'),
    executedAt: timestamp('executed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    agentIdx: index('idx_agent_actions_agent').on(table.agentId),
    orgIdx: index('idx_agent_actions_org').on(table.organizationId),
    statusIdx: index('idx_agent_actions_status').on(table.status),
  })
)

// ============================================
// ADVANCED AI: GOVERNANCE & COMPLIANCE
// ============================================

export const piiDetections = pgTable(
  'pii_detections',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'story', 'comment', 'document'
    resourceId: varchar('resource_id', { length: 36 }).notNull(),
    piiType: piiTypeEnum('pii_type').notNull(),
    detectedValue: text('detected_value'), // Encrypted
    maskedValue: text('masked_value'),
    position: json('position').$type<Record<string, any>>(), // Line/character position
    handledBy: varchar('handled_by', { length: 36 }),
    handledAt: timestamp('handled_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_pii_org').on(table.organizationId),
    resourceIdx: index('idx_pii_resource').on(table.resourceType, table.resourceId),
    typeIdx: index('idx_pii_type').on(table.piiType),
  })
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: varchar('resource_id', { length: 36 }),
    changes: json('changes').$type<Record<string, any>>(),
    metadata: json('metadata').$type<Record<string, any>>(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_audit_logs_org').on(table.organizationId),
    userIdx: index('idx_audit_logs_user').on(table.userId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    resourceIdx: index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
    createdIdx: index('idx_audit_logs_created').on(table.createdAt),
  })
)

// ============================================
// ADVANCED AI: MODEL CONTROLS
// ============================================

export const aiModelPolicies = pgTable(
  'ai_model_policies',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    featureType: varchar('feature_type', { length: 100 }).notNull(), // 'autopilot', 'validator', etc.
    modelTier: aiModelTierEnum('model_tier').default('balanced'),
    modelName: varchar('model_name', { length: 255 }),
    maxTokensPerRequest: integer('max_tokens_per_request').default(10000),
    enableContextOptimization: boolean('enable_context_optimization').default(true),
    customInstructions: text('custom_instructions'),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_model_policies_org').on(table.organizationId),
    featureIdx: index('idx_model_policies_feature').on(table.featureType),
  })
)

// ============================================
// RELATIONS
// ============================================

export const storyTemplatesRelations = relations(storyTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [storyTemplates.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [storyTemplates.createdBy],
    references: [users.id],
  }),
  stories: many(templateStories),
}))

export const templateStoriesRelations = relations(templateStories, ({ one }) => ({
  template: one(storyTemplates, {
    fields: [templateStories.templateId],
    references: [storyTemplates.id],
  }),
}))
