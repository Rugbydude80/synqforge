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
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// ENUMS - Define before tables
// ============================================

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'pro', 'enterprise'])
export const roleEnum = pgEnum('role', ['admin', 'member', 'viewer'])
export const projectStatusEnum = pgEnum('project_status', ['planning', 'active', 'on_hold', 'completed', 'archived'])
export const epicStatusEnum = pgEnum('epic_status', ['draft', 'planned', 'in_progress', 'completed', 'archived'])
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical'])
export const storyStatusEnum = pgEnum('story_status', ['backlog', 'ready', 'in_progress', 'review', 'done', 'archived'])
export const storyTypeEnum = pgEnum('story_type', ['feature', 'bug', 'task', 'spike'])
export const sprintStatusEnum = pgEnum('sprint_status', ['planning', 'active', 'completed', 'cancelled'])
export const aiGenerationTypeEnum = pgEnum('ai_generation_type', ['story_generation', 'story_validation', 'epic_creation', 'requirements_analysis'])
export const generationStatusEnum = pgEnum('generation_status', ['pending', 'completed', 'failed'])
export const processingStatusEnum = pgEnum('processing_status', ['uploaded', 'processing', 'completed', 'failed'])
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'usage', 'refund', 'bonus'])

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
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_org_slug').on(table.slug),
    tierIdx: index('idx_org_tier').on(table.subscriptionTier),
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
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_epics_project').on(table.projectId),
    orgIdx: index('idx_epics_org').on(table.organizationId),
    statusIdx: index('idx_epics_status').on(table.projectId, table.status),
    assigneeIdx: index('idx_epics_assignee').on(table.assignedTo),
  })
)

export const stories = pgTable(
  'stories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    epicId: varchar('epic_id', { length: 36 }),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    acceptanceCriteria: json('acceptance_criteria').$type<string[]>(),
    storyPoints: smallint('story_points'),
    priority: priorityEnum('priority').default('medium'),
    status: storyStatusEnum('status').default('backlog'),
    tags: json('tags').$type<string[]>(),
    aiGenerated: boolean('ai_generated').default(false),
    aiPrompt: text('ai_prompt'),
    aiModelUsed: varchar('ai_model_used', { length: 100 }),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    assigneeId: varchar('assignee_id', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    epicIdx: index('idx_stories_epic').on(table.epicId),
    projectIdx: index('idx_stories_project').on(table.projectId),
    statusIdx: index('idx_stories_status').on(table.projectId, table.status),
    assigneeIdx: index('idx_stories_assignee').on(table.assigneeId),
    priorityIdx: index('idx_stories_priority').on(table.projectId, table.priority),
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
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_sprints_project').on(table.projectId),
    statusIdx: index('idx_sprints_status').on(table.projectId, table.status),
    datesIdx: index('idx_sprints_dates').on(table.startDate, table.endDate),
  })
)

export const sprintStories = pgTable(
  'sprint_stories',
  {
    sprintId: varchar('sprint_id', { length: 36 }).notNull(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    committedAt: timestamp('committed_at').defaultNow(),
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
    type: pgEnum('type', ['story_generation', 'story_validation', 'epic_creation', 'requirements_analysis']).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    promptText: text('prompt_text').notNull(),
    responseText: text('response_text'),
    tokensUsed: int('tokens_used'),
    costUsd: decimal('cost_usd', { precision: 10, scale: 4 }),
    processingTimeMs: int('processing_time_ms'),
    status: pgEnum('status', ['pending', 'completed', 'failed']).default('pending'),
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
// DOCUMENTS
// ============================================

export const documents = pgTable(
  'documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    fileSize: int('file_size').notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    storagePath: varchar('storage_path', { length: 500 }).notNull(),
    processingStatus: pgEnum('processing_status', ['uploaded', 'processing', 'completed', 'failed']).default('uploaded'),
    extractedText: text('extracted_text'),
    aiAnalysis: json('ai_analysis').$type<Record<string, any>>(),
    generatedStoriesCount: int('generated_stories_count').default(0),
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
    type: pgEnum('type', ['purchase', 'usage', 'refund', 'bonus']).notNull(),
    amount: int('amount').notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    aiGenerationId: varchar('ai_generation_id', { length: 36 }),
    stripeTransactionId: varchar('stripe_transaction_id', { length: 255 }),
    balanceAfter: int('balance_after').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_credits_org').on(table.organizationId),
    userIdx: index('idx_credits_user').on(table.userId),
    typeIdx: index('idx_credits_type').on(table.type),
    createdIdx: index('idx_credits_created').on(table.createdAt),
  })
)

// ============================================
// METRICS (Materialized View)
// ============================================

export const sprintMetrics = pgTable(
  'sprint_metrics',
  {
    sprintId: varchar('sprint_id', { length: 36 }).primaryKey(),
    totalStories: int('total_stories').default(0),
    completedStories: int('completed_stories').default(0),
    totalPoints: int('total_points').default(0),
    completedPoints: int('completed_points').default(0),
    completionPercentage: decimal('completion_percentage', { precision: 5, scale: 2 }).default('0'),
    velocity: decimal('velocity', { precision: 8, scale: 2 }).default('0'),
    lastCalculated: timestamp('last_calculated').defaultNow().onUpdateNow(),
  },
  (table) => ({
    calculatedIdx: index('idx_metrics_calculated').on(table.lastCalculated),
  })
)

// ============================================
// RELATIONS
// ============================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}))

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
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

export const storiesRelations = relations(stories, ({ one }) => ({
  epic: one(epics, {
    fields: [stories.epicId],
    references: [epics.id],
  }),
  project: one(projects, {
    fields: [stories.projectId],
    references: [projects.id],
  }),
}))
