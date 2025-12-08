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

export const subscriptionTierEnum = pgEnum('subscription_tier', ['starter', 'core', 'pro', 'team', 'enterprise', 'admin'])
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
export const addOnStatusEnum = pgEnum('addon_status', ['active', 'expired', 'cancelled', 'consumed'])
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', ['pending', 'success', 'failed', 'retrying'])
export const clientStatusEnum = pgEnum('client_status', ['active', 'archived'])
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue'])
export const prioritizationFrameworkEnum = pgEnum('prioritization_framework', ['WSJF', 'RICE', 'MoSCoW'])
export const moscowCategoryEnum = pgEnum('moscow_category', ['Must', 'Should', 'Could', 'Wont'])
export const prioritizationJobStatusEnum = pgEnum('prioritization_job_status', ['pending', 'processing', 'completed', 'failed'])
export const scoreProvenanceEnum = pgEnum('score_provenance', ['auto', 'ai', 'manual'])

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
    subscriptionTier: subscriptionTierEnum('subscription_tier').default('starter'),
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
    subscriptionStatusUpdatedAt: timestamp('subscription_status_updated_at'),
    lastStripeSync: timestamp('last_stripe_sync'),
    gracePeriodRemindersSent: integer('grace_period_reminders_sent').default(0),
    billingAnniversary: date('billing_anniversary'),
    lastInvoiceNumber: integer('last_invoice_number').default(0),
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
    sessionVersion: integer('session_version').default(1).notNull(), // CRITICAL FIX: Session invalidation
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
    clientId: varchar('client_id', { length: 36 }),
    name: varchar('name', { length: 255 }).notNull(),
    key: varchar('key', { length: 10 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 100 }).notNull(),
    status: projectStatusEnum('status').default('planning'),
    ownerId: varchar('owner_id', { length: 36 }).notNull(),
    billingRate: decimal('billing_rate', { precision: 10, scale: 2 }),
    settings: json('settings').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_projects_org').on(table.organizationId),
    statusIdx: index('idx_projects_status').on(table.organizationId, table.status),
    clientIdx: index('idx_projects_client').on(table.clientId),
    uniqueSlug: uniqueIndex('unique_project_slug').on(table.organizationId, table.slug),
  })
)

export const strategicGoals = pgTable(
  'strategic_goals',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
    goalName: varchar('goal_name', { length: 255 }).notNull(),
    description: text('description'),
    quarter: varchar('quarter', { length: 10 }),
    relatedStoryTags: json('related_story_tags').$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    projectQuarterIdx: index('idx_goals_project_quarter').on(table.projectId, table.quarter),
    uniqueGoalPerQuarter: uniqueIndex('unique_goal_per_quarter').on(table.projectId, table.goalName, table.quarter),
  })
)

// ============================================
// PROJECT MEMBERS - Project-level permissions
// ============================================

export const projectMembers = pgTable(
  'project_members',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    role: roleEnum('role').default('viewer').notNull(), // CRITICAL FIX: Project-level permissions
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    projectIdx: index('idx_project_members_project').on(table.projectId),
    userIdx: index('idx_project_members_user').on(table.userId),
    orgIdx: index('idx_project_members_org').on(table.organizationId),
    uniqueProjectUser: uniqueIndex('unique_project_user').on(table.projectId, table.userId),
  })
)

// ============================================
// CLIENTS - Consultant client management
// ============================================

export const clients = pgTable(
  'clients',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    logoUrl: text('logo_url'),
    primaryContactName: text('primary_contact_name'),
    primaryContactEmail: text('primary_contact_email'),
    contractStartDate: date('contract_start_date'),
    contractEndDate: date('contract_end_date'),
    defaultBillingRate: decimal('default_billing_rate', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
    settings: json('settings').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_clients_org').on(table.organizationId),
    statusIdx: index('idx_clients_status').on(table.status),
    contactIdx: index('idx_clients_contact').on(table.primaryContactEmail),
    uniqueClientPerOrg: uniqueIndex('unique_client_per_org').on(table.organizationId, table.name),
  })
)

// ============================================
// TIME ENTRIES - Time tracking for billing
// ============================================

export const timeEntries = pgTable(
  'time_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    clientId: varchar('client_id', { length: 36 }),
    projectId: varchar('project_id', { length: 36 }),
    storyId: varchar('story_id', { length: 36 }),
    userId: varchar('user_id', { length: 36 }).notNull(),
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    durationMinutes: integer('duration_minutes'),
    description: text('description'),
    billable: boolean('billable').notNull().default(true),
    billingRate: decimal('billing_rate', { precision: 10, scale: 2 }),
    invoiceId: varchar('invoice_id', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_time_entries_story').on(table.storyId),
    userIdx: index('idx_time_entries_user').on(table.userId, table.startedAt),
    clientIdx: index('idx_time_entries_client').on(table.clientId, table.startedAt),
    projectIdx: index('idx_time_entries_project').on(table.projectId),
    invoiceIdx: index('idx_time_entries_invoice').on(table.invoiceId),
    unbilledIdx: index('idx_time_entries_unbilled').on(table.billable, table.invoiceId),
  })
)

// ============================================
// INVOICES - Generated from time entries
// ============================================

export const invoices = pgTable(
  'invoices',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    clientId: varchar('client_id', { length: 36 }).notNull(),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
    status: text('status', { enum: ['draft', 'sent', 'paid', 'overdue'] }).notNull().default('draft'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    paidDate: date('paid_date'),
    totalHours: decimal('total_hours', { precision: 10, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    lineItems: json('line_items').$type<Array<{ description: string; hours: number; rate: number; amount: number; storyId?: string; epicId?: string }>>().notNull(),
    notes: text('notes'),
    pdfUrl: text('pdf_url'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    clientIdx: index('idx_invoices_client').on(table.clientId, table.issueDate),
    statusIdx: index('idx_invoices_status').on(table.status),
    numberIdx: index('idx_invoices_number').on(table.invoiceNumber),
    uniqueInvoiceNumber: uniqueIndex('unique_invoice_number').on(table.organizationId, table.invoiceNumber),
  })
)

// ============================================
// CLIENT PORTAL ACCESS - Token-based read-only access
// ============================================

export const clientPortalAccess = pgTable(
  'client_portal_access',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    clientId: varchar('client_id', { length: 36 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    lastAccessedAt: timestamp('last_accessed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    clientIdx: index('idx_portal_client').on(table.clientId),
    tokenIdx: index('idx_portal_token').on(table.token),
    emailIdx: index('idx_portal_email').on(table.email),
  })
)

// ============================================
// CLIENT STORY REVIEWS - Client feedback and approval workflow
// ============================================

export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'needs_revision', 'rejected'])

export const clientStoryReviews = pgTable(
  'client_story_reviews',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    clientId: varchar('client_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),

    // Business-friendly translation
    businessSummary: text('business_summary'),
    businessValue: text('business_value'),
    expectedOutcome: text('expected_outcome'),
    identifiedRisks: json('identified_risks').$type<Array<{
      category: string
      description: string
      severity: 'low' | 'medium' | 'high'
    }>>().default([]),
    clarifyingQuestions: json('clarifying_questions').$type<Array<{
      question: string
      askedAt: string
      answeredAt?: string
      answer?: string
    }>>().default([]),

    // Approval workflow
    approvalStatus: reviewStatusEnum('approval_status').default('pending').notNull(),
    approvalNotes: text('approval_notes'),
    approvedByRole: varchar('approved_by_role', { length: 50 }), // 'client_stakeholder', 'client_admin'
    approvedByEmail: varchar('approved_by_email', { length: 255 }),
    approvedAt: timestamp('approved_at'),

    // Feedback tracking
    feedbackItems: json('feedback_items').$type<Array<{
      id: string
      type: 'concern' | 'question' | 'suggestion' | 'blocker'
      description: string
      priority: 'low' | 'medium' | 'high'
      createdAt: string
      resolvedAt?: string
      resolution?: string
    }>>().default([]),
    feedbackSummary: text('feedback_summary'),

    // AI-generated insights
    aiGeneratedSummary: boolean('ai_generated_summary').default(false),
    technicalComplexityScore: smallint('technical_complexity_score'), // 0-10
    clientFriendlinessScore: smallint('client_friendliness_score'), // 0-10

    // Timestamps and tracking
    submittedForReviewAt: timestamp('submitted_for_review_at'),
    lastViewedAt: timestamp('last_viewed_at'),
    reviewCompletedAt: timestamp('review_completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 36 }).notNull(), // User who submitted for review
  },
  (table) => ({
    storyIdx: index('idx_client_reviews_story').on(table.storyId),
    clientIdx: index('idx_client_reviews_client').on(table.clientId),
    projectIdx: index('idx_client_reviews_project').on(table.projectId),
    orgIdx: index('idx_client_reviews_org').on(table.organizationId),
    statusIdx: index('idx_client_reviews_status').on(table.approvalStatus),
    submittedIdx: index('idx_client_reviews_submitted').on(table.submittedForReviewAt),
    uniqueStoryClient: uniqueIndex('unique_story_client_review').on(table.storyId, table.clientId),
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
    color: varchar('color', { length: 7 }).default('#7c5cf5'),
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
    parentId: varchar('parent_id', { length: 255 }),
    splitFromId: varchar('split_from_id', { length: 255 }),
    isEpic: boolean('is_epic').default(false).notNull(),
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

    // Version tracking for update story feature
    lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
    updateVersion: integer('update_version').default(1),

    // Template versioning - track which template version was used
    templateVersionId: varchar('template_version_id', { length: 36 }),

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

export const storyPrioritizationScores = pgTable(
  'story_prioritization_scores',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull().references(() => stories.id, { onDelete: 'cascade' }),
    projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
    framework: prioritizationFrameworkEnum('framework').notNull(),

    // WSJF fields
    businessValue: integer('business_value'),
    timeCriticality: integer('time_criticality'),
    riskReduction: integer('risk_reduction'),
    jobSize: integer('job_size'),
    wsjfScore: decimal('wsjf_score', { precision: 10, scale: 2 }),

    // RICE fields
    reach: integer('reach'),
    impact: decimal('impact', { precision: 10, scale: 2 }),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    effort: integer('effort'),
    riceScore: decimal('rice_score', { precision: 10, scale: 2 }),

    // MoSCoW
    moscowCategory: moscowCategoryEnum('moscow_category'),

    calculatedAt: timestamp('calculated_at').defaultNow(),
    calculatedBy: varchar('calculated_by', { length: 36 }).references(() => users.id),
    isManualOverride: boolean('is_manual_override').default(false),
    reasoning: text('reasoning'),
    provenance: scoreProvenanceEnum('provenance').default('auto'),
  },
  (table) => ({
    uniqueStoryFramework: uniqueIndex('unique_story_framework').on(table.storyId, table.framework),
    projectFrameworkIdx: index('idx_scores_project_framework').on(table.projectId, table.framework),
    wsjfIdx: index('idx_scores_wsjf').on(table.wsjfScore),
    riceIdx: index('idx_scores_rice').on(table.riceScore),
  })
)

export const backlogAnalysisReports = pgTable(
  'backlog_analysis_reports',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
    frameworkUsed: prioritizationFrameworkEnum('framework_used').notNull(),
    generatedAt: timestamp('generated_at').defaultNow(),
    generatedBy: varchar('generated_by', { length: 36 }).notNull().references(() => users.id),

    strategicFocus: text('strategic_focus'),
    marketSegment: text('market_segment'),
    competitivePressure: varchar('competitive_pressure', { length: 50 }),
    budgetConstraint: decimal('budget_constraint', { precision: 12, scale: 2 }),

    strategicAlignment: json('strategic_alignment').$type<Record<string, any>>(),
    priorityConflicts: json('priority_conflicts').$type<Record<string, any>>(),
    capacityAnalysis: json('capacity_analysis').$type<Record<string, any>>(),
    confidenceLevels: json('confidence_levels').$type<Record<string, any>>(),
    executiveSummary: text('executive_summary'),
    rankedStories: json('ranked_stories').$type<any[]>(),
  },
  (table) => ({
    projectGeneratedIdx: index('idx_reports_project_generated_at').on(table.projectId, table.generatedAt),
    projectFrameworkIdx: index('idx_reports_project_framework_generated').on(table.projectId, table.frameworkUsed, table.generatedAt),
  })
)

export const prioritizationJobs = pgTable(
  'prioritization_jobs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
    framework: prioritizationFrameworkEnum('framework').notNull(),
    status: prioritizationJobStatusEnum('status').default('pending').notNull(),
    reportId: varchar('report_id', { length: 36 }),
    error: text('error'),
    generatedBy: varchar('generated_by', { length: 36 }).notNull().references(() => users.id),
    requestPayload: json('request_payload').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    projectIdx: index('idx_prioritization_jobs_project').on(table.projectId, table.createdAt),
    statusIdx: index('idx_prioritization_jobs_status').on(table.status),
  })
)

// ============================================
// STORY LINKS - Relationship tracking between stories
// ============================================

export const storyLinks = pgTable(
  'story_links',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    storyId: varchar('story_id', { length: 255 }).notNull(),
    relatedStoryId: varchar('related_story_id', { length: 255 }).notNull(),
    relation: varchar('relation', { length: 50 }).notNull(), // CRITICAL FIX: 'split_child', 'split_parent', 'depends_on'
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    storyIdx: index('idx_story_links_story').on(table.storyId),
    relatedStoryIdx: index('idx_story_links_related').on(table.relatedStoryId),
    relationIdx: index('idx_story_links_relation').on(table.relation),
    uniqueStoryRelation: uniqueIndex('unique_story_relation').on(table.storyId, table.relatedStoryId, table.relation),
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
// STORY UPDATES - Audit trail for story modifications
// ============================================

export const storyUpdates = pgTable(
  'story_updates',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Changes tracking (JSON diff of what changed)
    changes: json('changes').$type<Record<string, {before: any, after: any}>>().notNull(),

    // Tier and entitlement context at time of update
    tierAtUpdate: text('tier_at_update').notNull(),

    // Version tracking
    version: integer('version').notNull(),

    // Update metadata
    updateType: varchar('update_type', { length: 50 }).default('manual'), // manual, ai_suggested, bulk, import
    correlationId: varchar('correlation_id', { length: 64 }),

    // AI metadata (if update was AI-assisted)
    aiAssisted: boolean('ai_assisted').default(false),
    aiModelUsed: varchar('ai_model_used', { length: 100 }),
    aiTokensUsed: integer('ai_tokens_used'),
    aiActionsConsumed: decimal('ai_actions_consumed', { precision: 10, scale: 2 }),

    // Audit metadata
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
  },
  (table) => ({
    storyIdx: index('idx_story_updates_story').on(table.storyId),
    userIdx: index('idx_story_updates_user').on(table.userId),
    orgIdx: index('idx_story_updates_org').on(table.organizationId),
    updatedAtIdx: index('idx_story_updates_updated_at').on(table.updatedAt),
    tierIdx: index('idx_story_updates_tier').on(table.tierAtUpdate),
    correlationIdx: index('idx_story_updates_correlation').on(table.correlationId),
    userDateIdx: index('idx_story_updates_user_date').on(table.userId, table.updatedAt),
    orgDateIdx: index('idx_story_updates_org_date').on(table.organizationId, table.updatedAt),
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
    department: varchar('department', { length: 100 }),
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
    version: integer('version').default(1).notNull(), // CRITICAL FIX: Template versioning
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_templates_org').on(table.organizationId),
    categoryIdx: index('idx_templates_category').on(table.category),
    publicIdx: index('idx_templates_public').on(table.isPublic),
    creatorIdx: index('idx_templates_creator').on(table.createdBy),
    versionIdx: index('idx_templates_version').on(table.id, table.version),
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
// TEMPLATE VERSIONS - Version history for templates
// ============================================

export const templateVersions = pgTable(
  'template_versions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    templateId: varchar('template_id', { length: 36 }).notNull(),
    version: integer('version').notNull(),
    templateName: varchar('template_name', { length: 255 }).notNull(),
    category: templateCategoryEnum('category').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    storiesSnapshot: json('stories_snapshot').$type<Record<string, any>[]>().notNull(),
    changeSummary: text('change_summary'),
    changedBy: varchar('changed_by', { length: 36 }),
  },
  (table) => ({
    templateIdx: index('idx_template_versions_template').on(table.templateId),
    versionIdx: index('idx_template_versions_version').on(table.templateId, table.version),
    uniqueTemplateVersion: uniqueIndex('unique_template_version').on(table.templateId, table.version),
  })
)

// ============================================
// CUSTOM DOCUMENT TEMPLATES - User-uploaded story format templates
// ============================================

export const customDocumentTemplates = pgTable(
  'custom_document_templates',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    templateName: varchar('template_name', { length: 255 }).notNull(),
    description: text('description'),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileType: fileTypeEnum('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    fileBytes: bytea('file_bytes').notNull(),
    extractedContent: text('extracted_content'), // Extracted text from document
    templateFormat: json('template_format').$type<Record<string, any>>(), // Parsed template structure
    usageCount: integer('usage_count').default(0),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_custom_templates_org').on(table.organizationId),
    creatorIdx: index('idx_custom_templates_creator').on(table.createdBy),
    activeIdx: index('idx_custom_templates_active').on(table.organizationId, table.isActive),
  })
)

// ============================================
// RELATIONS
// ============================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  clients: many(clients),
  invoices: many(invoices),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  passwordResetTokens: many(passwordResetTokens),
  timeEntries: many(timeEntries),
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
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  epics: many(epics),
  sprints: many(sprints),
  timeEntries: many(timeEntries),
  strategicGoals: many(strategicGoals),
  backlogAnalysisReports: many(backlogAnalysisReports),
}))

export const strategicGoalsRelations = relations(strategicGoals, ({ one }) => ({
  project: one(projects, {
    fields: [strategicGoals.projectId],
    references: [projects.id],
  }),
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
  timeEntries: many(timeEntries),
  clientReviews: many(clientStoryReviews),
  prioritizationScores: many(storyPrioritizationScores),
}))

export const storyPrioritizationScoresRelations = relations(storyPrioritizationScores, ({ one }) => ({
  story: one(stories, {
    fields: [storyPrioritizationScores.storyId],
    references: [stories.id],
  }),
  project: one(projects, {
    fields: [storyPrioritizationScores.projectId],
    references: [projects.id],
  }),
}))

export const backlogAnalysisReportsRelations = relations(backlogAnalysisReports, ({ one }) => ({
  project: one(projects, {
    fields: [backlogAnalysisReports.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [backlogAnalysisReports.generatedBy],
    references: [users.id],
  }),
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
// CONSULTANT FEATURES RELATIONS
// ============================================

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  projects: many(projects),
  timeEntries: many(timeEntries),
  invoices: many(invoices),
  portalAccess: many(clientPortalAccess),
  storyReviews: many(clientStoryReviews),
}))

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [timeEntries.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  story: one(stories, {
    fields: [timeEntries.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  invoice: one(invoices, {
    fields: [timeEntries.invoiceId],
    references: [invoices.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  timeEntries: many(timeEntries),
}))

export const clientPortalAccessRelations = relations(clientPortalAccess, ({ one }) => ({
  client: one(clients, {
    fields: [clientPortalAccess.clientId],
    references: [clients.id],
  }),
}))

export const clientStoryReviewsRelations = relations(clientStoryReviews, ({ one }) => ({
  story: one(stories, {
    fields: [clientStoryReviews.storyId],
    references: [stories.id],
  }),
  client: one(clients, {
    fields: [clientStoryReviews.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [clientStoryReviews.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [clientStoryReviews.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [clientStoryReviews.createdBy],
    references: [users.id],
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

    // Rollover tracking (Core/Pro plans)
    rolloverEnabled: boolean('rollover_enabled').default(false),
    rolloverPercentage: decimal('rollover_percentage', { precision: 3, scale: 2 }).default('0.00'),
    rolloverBalance: integer('rollover_balance').default(0),

    // Document ingestion
    docsIngested: integer('docs_ingested').notNull().default(0),
    docsLimit: integer('docs_limit').notNull().default(10),

    // Grace period tracking
    gracePeriodActive: boolean('grace_period_active').default(false),
    gracePeriodExpiresAt: timestamp('grace_period_expires_at'),
    gracePeriodStartedAt: timestamp('grace_period_started_at'),

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
// AI ACTIONS TRACKING (2025 Pricing)
// ============================================

export const aiActionUsage = pgTable(
  'ai_action_usage',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    billingPeriodStart: timestamp('billing_period_start').notNull(),
    billingPeriodEnd: timestamp('billing_period_end').notNull(),
    actionsUsed: integer('actions_used').notNull().default(0),
    allowance: integer('allowance').notNull().default(0),
    actionBreakdown: json('action_breakdown').$type<Record<string, number>>().default({}),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_ai_action_usage_org').on(table.organizationId),
    userIdx: index('idx_ai_action_usage_user').on(table.userId),
    periodIdx: index('idx_ai_action_usage_period').on(table.billingPeriodStart, table.billingPeriodEnd),
    uniqueOrgUserPeriod: uniqueIndex('idx_ai_action_usage_unique').on(table.organizationId, table.userId, table.billingPeriodStart),
  })
)

export const aiActionRollover = pgTable(
  'ai_action_rollover',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    sourcePeriodStart: timestamp('source_period_start').notNull(),
    sourcePeriodEnd: timestamp('source_period_end').notNull(),
    rolloverAmount: integer('rollover_amount').notNull().default(0),
    rolloverPercentage: integer('rollover_percentage').notNull().default(0),
    appliedToPeriodStart: timestamp('applied_to_period_start').notNull(),
    appliedAt: timestamp('applied_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_ai_action_rollover_org').on(table.organizationId),
    userIdx: index('idx_ai_action_rollover_user').on(table.userId),
    appliedPeriodIdx: index('idx_ai_action_rollover_applied_period').on(table.appliedToPeriodStart),
  })
)

// ============================================
// TOKEN ALLOWANCES (Enhanced with Add-ons)
// ============================================

export const tokenAllowances = pgTable(
  'token_allowances',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }),
    billingPeriodStart: timestamp('billing_period_start').notNull(),
    billingPeriodEnd: timestamp('billing_period_end').notNull(),
    
    // Base allowance from tier
    baseAllowance: integer('base_allowance').notNull().default(0),
    
    // Add-on credits
    addonCredits: integer('addon_credits').notNull().default(0),
    aiActionsBonus: integer('ai_actions_bonus').notNull().default(0),
    
    // Rollover credits
    rolloverCredits: integer('rollover_credits').notNull().default(0),
    
    // Usage tracking
    creditsUsed: integer('credits_used').notNull().default(0),
    creditsRemaining: integer('credits_remaining').notNull().default(0),
    
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_token_allowances_org').on(table.organizationId),
    userIdx: index('idx_token_allowances_user').on(table.userId),
    periodIdx: index('idx_token_allowances_period').on(table.billingPeriodStart, table.billingPeriodEnd),
    uniqueOrgUserPeriod: uniqueIndex('idx_token_allowances_unique').on(table.organizationId, table.userId, table.billingPeriodStart),
  })
)

export const addOnPurchases = pgTable(
  'addon_purchases',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }),
    
    // Product details
    stripeProductId: varchar('stripe_product_id', { length: 255 }).notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    
    // Add-on metadata
    addonType: varchar('addon_type', { length: 50 }).notNull(), // 'ai_actions', 'ai_booster', 'priority_support'
    addonName: varchar('addon_name', { length: 255 }).notNull(),
    
    // Credits and expiration
    creditsGranted: integer('credits_granted').default(0),
    creditsRemaining: integer('credits_remaining').default(0),
    creditsUsed: integer('credits_used').default(0),
    
    // Lifecycle
    status: addOnStatusEnum('status').notNull().default('active'),
    purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    cancelledAt: timestamp('cancelled_at'),
    
    // Pricing
    priceUsd: decimal('price_usd', { precision: 10, scale: 2 }),
    recurring: boolean('recurring').notNull().default(false),
    
    // Metadata
    metadata: json('metadata').$type<Record<string, any>>(),
    
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_addon_purchases_org').on(table.organizationId),
    userIdx: index('idx_addon_purchases_user').on(table.userId),
    typeIdx: index('idx_addon_purchases_type').on(table.addonType),
    statusIdx: index('idx_addon_purchases_status').on(table.status),
    expiresIdx: index('idx_addon_purchases_expires').on(table.expiresAt),
    stripePaymentIdx: index('idx_addon_purchases_stripe_payment').on(table.stripePaymentIntentId),
    stripeSubscriptionIdx: index('idx_addon_purchases_stripe_subscription').on(table.stripeSubscriptionId),
  })
)

export const tokensLedger = pgTable(
  'tokens_ledger',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }),
    
    // Idempotency
    correlationId: varchar('correlation_id', { length: 64 }).notNull(),
    
    // Operation details
    operationType: varchar('operation_type', { length: 50 }).notNull(), // 'split', 'refine', 'update'
    resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'story', 'epic'
    resourceId: varchar('resource_id', { length: 36 }).notNull(),
    
    // Token tracking
    tokensDeducted: decimal('tokens_deducted', { precision: 10, scale: 2 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(), // 'base_allowance', 'rollover', 'addon_pack', 'ai_booster'
    addonPurchaseId: varchar('addon_purchase_id', { length: 36 }),
    
    // Balance
    balanceAfter: integer('balance_after').notNull(),
    
    // Metadata
    metadata: json('metadata').$type<Record<string, any>>(),
    
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_tokens_ledger_org').on(table.organizationId),
    userIdx: index('idx_tokens_ledger_user').on(table.userId),
    correlationIdx: uniqueIndex('idx_tokens_ledger_correlation').on(table.correlationId),
    operationIdx: index('idx_tokens_ledger_operation').on(table.operationType),
    resourceIdx: index('idx_tokens_ledger_resource').on(table.resourceType, table.resourceId),
    addonPurchaseIdx: index('idx_tokens_ledger_addon').on(table.addonPurchaseId),
    createdIdx: index('idx_tokens_ledger_created').on(table.createdAt),
  })
)

export const featureGates = pgTable(
  'feature_gates',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tier: varchar('tier', { length: 50 }).notNull(), // 'starter', 'pro', 'team', 'enterprise'
    featureName: varchar('feature_name', { length: 100 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    limitValue: integer('limit_value'),
    metadata: json('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tierIdx: index('idx_feature_gates_tier').on(table.tier),
    featureIdx: index('idx_feature_gates_feature').on(table.featureName),
    uniqueTierFeature: uniqueIndex('idx_feature_gates_unique').on(table.tier, table.featureName),
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

export const customDocumentTemplatesRelations = relations(customDocumentTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [customDocumentTemplates.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [customDocumentTemplates.createdBy],
    references: [users.id],
  }),
}))

// ============================================
// STRIPE WEBHOOK LOGS (Idempotency & Audit Trail)
// ============================================

export const stripeWebhookLogs = pgTable(
  'stripe_webhook_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    eventId: varchar('event_id', { length: 255 }).notNull().unique(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    processedAt: timestamp('processed_at').defaultNow(),
    status: varchar('status', { length: 20 }).notNull(), // 'success', 'failed', 'pending', 'retrying'
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
    payload: json('payload'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    eventIdIdx: index('idx_webhook_event_id').on(table.eventId),
    statusIdx: index('idx_webhook_status').on(table.status),
    createdAtIdx: index('idx_webhook_created_at').on(table.createdAt),
  })
)

// ============================================
// WORKSPACE USAGE HISTORY (Archive Previous Billing Periods)
// ============================================

export const workspaceUsageHistory = pgTable(
  'workspace_usage_history',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    billingPeriodStart: timestamp('billing_period_start').notNull(),
    billingPeriodEnd: timestamp('billing_period_end').notNull(),
    billingPeriod: varchar('billing_period', { length: 7 }), // Format: YYYY-MM
    
    // Token usage
    tokensUsed: integer('tokens_used').notNull().default(0),
    tokensLimit: integer('tokens_limit').notNull().default(50000),
    
    // Document ingestion
    docsIngested: integer('docs_ingested').notNull().default(0),
    docsLimit: integer('docs_limit').notNull().default(10),
    
    // Grace period tracking
    gracePeriodActive: boolean('grace_period_active').default(false),
    gracePeriodExpiresAt: timestamp('grace_period_expires_at'),
    
    // Archival metadata
    archivedAt: timestamp('archived_at').defaultNow(),
    lastResetAt: timestamp('last_reset_at'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => ({
    orgIdx: index('idx_usage_history_org').on(table.organizationId),
    periodIdx: index('idx_usage_history_period').on(table.billingPeriodStart, table.billingPeriodEnd),
    billingPeriodIdx: index('idx_usage_history_billing_period').on(table.organizationId, table.billingPeriod),
    archivedIdx: index('idx_usage_history_archived').on(table.archivedAt),
  })
)

// ============================================
// TOKEN RESERVATIONS (Pessimistic Locking for Concurrent Requests)
// ============================================

export const tokenReservations = pgTable(
  'token_reservations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    
    // Reservation details
    estimatedTokens: integer('estimated_tokens').notNull(),
    actualTokens: integer('actual_tokens'),
    status: varchar('status', { length: 20 }).notNull(), // 'reserved', 'committed', 'released', 'expired'
    
    // Associated generation
    generationType: varchar('generation_type', { length: 50 }),
    generationId: varchar('generation_id', { length: 36 }),
    
    // Timestamps
    reservedAt: timestamp('reserved_at').defaultNow(),
    committedAt: timestamp('committed_at'),
    releasedAt: timestamp('released_at'),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => ({
    orgIdx: index('idx_token_res_org').on(table.organizationId),
    statusIdx: index('idx_token_res_status').on(table.status),
    expiresIdx: index('idx_token_res_expires').on(table.expiresAt),
    userIdx: index('idx_token_res_user').on(table.userId),
  })
)

// ============================================
// SUBSCRIPTION STATE AUDIT LOG
// ============================================

export const subscriptionStateAudit = pgTable(
  'subscription_state_audit',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    
    // State change tracking
    previousStatus: varchar('previous_status', { length: 20 }),
    newStatus: varchar('new_status', { length: 20 }).notNull(),
    previousPlan: varchar('previous_plan', { length: 50 }),
    newPlan: varchar('new_plan', { length: 50 }),
    
    // Change metadata
    changeReason: varchar('change_reason', { length: 100 }), // 'webhook', 'admin_update', 'payment_failed', 'reconciliation'
    changedBy: varchar('changed_by', { length: 36 }), // user_id or 'system'
    stripeEventId: varchar('stripe_event_id', { length: 255 }),
    
    // Timestamps
    changedAt: timestamp('changed_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_audit_org').on(table.organizationId),
    changedAtIdx: index('idx_audit_changed_at').on(table.changedAt),
    newStatusIdx: index('idx_audit_new_status').on(table.newStatus),
  })
)

// ============================================
// MONITORING ALERTS TABLE
// ============================================

export const subscriptionAlerts = pgTable(
  'subscription_alerts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }),
    
    // Alert details
    alertType: varchar('alert_type', { length: 50 }).notNull(), // 'zero_usage', 'negative_balance', 'stale_subscription', 'orphaned_usage'
    severity: varchar('severity', { length: 20 }).notNull(), // 'info', 'warning', 'error', 'critical'
    message: text('message').notNull(),
    metadata: json('metadata'),
    
    // Resolution tracking
    status: varchar('status', { length: 20 }).default('open'), // 'open', 'acknowledged', 'resolved', 'ignored'
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: varchar('resolved_by', { length: 36 }),
    
    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_alerts_org').on(table.organizationId),
    statusIdx: index('idx_alerts_status').on(table.status),
    typeIdx: index('idx_alerts_type').on(table.alertType),
    createdIdx: index('idx_alerts_created').on(table.createdAt),
  })
)

// ============================================
// DEPARTMENT BUDGETS (Enterprise Feature)
// ============================================

export const departmentBudgets = pgTable(
  'department_budgets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    departmentName: varchar('department_name', { length: 100 }).notNull(),
    actionsLimit: integer('actions_limit').notNull().default(0),
    actionsUsed: integer('actions_used').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_dept_budgets_org').on(table.organizationId),
    deptIdx: index('idx_dept_budgets_dept').on(table.departmentName),
    usageIdx: index('idx_dept_budgets_usage').on(table.organizationId, table.actionsUsed),
    uniqueOrgDept: uniqueIndex('unique_org_department').on(table.organizationId, table.departmentName),
  })
)

// ============================================
// BUDGET REALLOCATION LOG (Enterprise Audit Trail)
// ============================================

export const budgetReallocationLog = pgTable(
  'budget_reallocation_log',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    fromDepartment: varchar('from_department', { length: 100 }).notNull(),
    toDepartment: varchar('to_department', { length: 100 }).notNull(),
    amount: integer('amount').notNull(),
    reason: text('reason'),
    approvedBy: varchar('approved_by', { length: 36 }).notNull(),
    metadata: json('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('idx_realloc_org').on(table.organizationId),
    fromIdx: index('idx_realloc_from').on(table.fromDepartment),
    toIdx: index('idx_realloc_to').on(table.toDepartment),
    createdIdx: index('idx_realloc_created').on(table.createdAt),
  })
)

// ============================================
// STORY REFINEMENTS
// ============================================

export const storyRefinements = pgTable(
  'story_refinements',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    
    // Refinement instructions and content
    refinementInstructions: text('refinement_instructions').notNull(), // User's instructions (10-500 chars)
    originalContent: text('original_content').notNull(), // Original story content
    refinedContent: text('refined_content'), // AI-refined content
    
    // Status tracking
    status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'processing', 'completed', 'accepted', 'rejected', 'failed'
    
    // Change tracking
    changesSummary: json('changes_summary').$type<{
      additions?: number;
      deletions?: number;
      modifications?: number;
      totalChanges?: number;
      wordCountDelta?: number;
    }>(),
    
    // Processing metadata
    processingTimeMs: integer('processing_time_ms'),
    errorMessage: text('error_message'),
    
    // AI metadata
    aiModelUsed: varchar('ai_model_used', { length: 100 }),
    aiTokensUsed: integer('ai_tokens_used'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    
    // Legacy fields (for backward compatibility)
    refinement: text('refinement'), // AI-generated refinement analysis (deprecated, use refinedContent)
    userRequest: text('user_request'), // Optional user request/context (deprecated, use refinementInstructions)
    
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at'),
    rejectedAt: timestamp('rejected_at'),
    rejectedReason: text('rejected_reason'),
  },
  (table) => ({
    storyIdx: index('idx_story_refinements_story').on(table.storyId),
    orgIdx: index('idx_story_refinements_org').on(table.organizationId),
    userIdx: index('idx_story_refinements_user').on(table.userId),
    statusIdx: index('idx_story_refinements_status').on(table.status),
    createdIdx: index('idx_story_refinements_created').on(table.createdAt),
  })
)

// Story revisions table for tracking story history
export const storyRevisions = pgTable(
  'story_revisions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    storyId: varchar('story_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    content: text('content').notNull(), // Story content at this revision
    revisionType: varchar('revision_type', { length: 50 }).notNull(), // 'manual_edit', 'refinement', 'auto_save', 'initial'
    revisionNote: text('revision_note'), // Optional note about the revision
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
  },
  (table) => ({
    storyIdx: index('idx_story_revisions_story').on(table.storyId),
    orgIdx: index('idx_story_revisions_org').on(table.organizationId),
    createdIdx: index('idx_story_revisions_created').on(table.createdAt),
    typeIdx: index('idx_story_revisions_type').on(table.revisionType),
  })
)

// ============================================
// API KEYS
// ============================================

export const apiKeys = pgTable(
  'api_keys',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }), // Nullable for service keys (Enterprise only)
    keyHash: text('key_hash').notNull(), // bcrypt hashed API key
    keyPrefix: varchar('key_prefix', { length: 8 }).notNull(), // First 8 chars for display
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'), // Optional expiration
    isActive: boolean('is_active').default(true).notNull(),
    isServiceKey: boolean('is_service_key').default(false).notNull(), // Enterprise only
    scopes: json('scopes').$type<string[]>().default(['read', 'write']).notNull(), // ['read', 'write'] or ['read']
    rateLimitPerHour: integer('rate_limit_per_hour'), // Tier-based default, can override for Enterprise
  },
  (table) => ({
    orgIdx: index('idx_api_keys_org').on(table.organizationId),
    userIdx: index('idx_api_keys_user').on(table.userId),
    prefixIdx: index('idx_api_keys_prefix').on(table.keyPrefix),
    activeIdx: index('idx_api_keys_active').on(table.isActive),
    createdAtIdx: index('idx_api_keys_created').on(table.createdAt),
  })
)

// ============================================
// WEBHOOKS
// ============================================

export const webhooks = pgTable(
  'webhooks',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(), // Creator
    url: text('url').notNull(),
    secret: text('secret').notNull(), // Hashed webhook secret for signature verification
    events: json('events').$type<string[]>().notNull(), // Array of event types to subscribe to
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastTriggeredAt: timestamp('last_triggered_at'),
    successCount: integer('success_count').default(0).notNull(),
    failureCount: integer('failure_count').default(0).notNull(),
    headers: json('headers').$type<Record<string, string>>(), // Custom headers to include in webhook requests
  },
  (table) => ({
    orgIdx: index('idx_webhooks_org').on(table.organizationId),
    userIdx: index('idx_webhooks_user').on(table.userId),
    activeIdx: index('idx_webhooks_active').on(table.isActive),
    createdAtIdx: index('idx_webhooks_created').on(table.createdAt),
  })
)

// ============================================
// WEBHOOK DELIVERIES
// ============================================

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    webhookId: varchar('webhook_id', { length: 36 }).notNull(),
    eventId: varchar('event_id', { length: 36 }).notNull(), // Unique ID for the event
    eventType: varchar('event_type', { length: 100 }).notNull(), // e.g., 'story.created', 'epic.updated'
    payload: json('payload').notNull(), // Full event payload
    responseStatus: integer('response_status'), // HTTP status code from webhook endpoint
    responseBody: text('response_body'), // Response body from webhook endpoint
    attemptNumber: integer('attempt_number').default(1).notNull(),
    deliveredAt: timestamp('delivered_at'),
    nextRetryAt: timestamp('next_retry_at'), // When to retry if failed
    status: webhookDeliveryStatusEnum('status').default('pending').notNull(), // 'pending', 'success', 'failed', 'retrying'
    errorMessage: text('error_message'), // Error message if delivery failed
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    webhookIdx: index('idx_webhook_deliveries_webhook').on(table.webhookId),
    eventIdx: index('idx_webhook_deliveries_event').on(table.eventId),
    statusIdx: index('idx_webhook_deliveries_status').on(table.status),
    nextRetryIdx: index('idx_webhook_deliveries_next_retry').on(table.nextRetryAt),
    createdAtIdx: index('idx_webhook_deliveries_created').on(table.createdAt),
  })
)