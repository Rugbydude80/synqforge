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

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'pro', 'enterprise'])
export const roleEnum = pgEnum('role', ['admin', 'member', 'viewer'])
export const projectStatusEnum = pgEnum('project_status', ['planning', 'active', 'on_hold', 'completed', 'archived'])
export const epicStatusEnum = pgEnum('epic_status', ['draft', 'planned', 'in_progress', 'completed', 'archived'])
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical'])
export const storyStatusEnum = pgEnum('story_status', ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'])
export const storyTypeEnum = pgEnum('story_type', ['feature', 'bug', 'task', 'spike'])
export const sprintStatusEnum = pgEnum('sprint_status', ['planning', 'active', 'completed', 'cancelled'])
export const aiGenerationTypeEnum = pgEnum('ai_generation_type', ['story_generation', 'story_validation', 'epic_creation', 'requirements_analysis'])
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
