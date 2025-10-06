import { db, generateId } from '@/lib/db'
import { storyTemplates, templateStories, stories } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export type TemplateCategory =
  | 'authentication'
  | 'crud'
  | 'payments'
  | 'notifications'
  | 'admin'
  | 'api'
  | 'custom'

export interface TemplateStory {
  title: string
  description: string
  acceptanceCriteria: string[]
  storyPoints?: number
  storyType?: 'feature' | 'bug' | 'task' | 'spike'
  tags?: string[]
}

export interface CreateTemplateInput {
  organizationId: string
  createdBy: string
  templateName: string
  category: TemplateCategory
  description?: string
  stories: TemplateStory[]
  isPublic?: boolean
}

export interface ApplyTemplateInput {
  projectId: string
  epicId?: string
  createdBy: string
  variables?: Record<string, string> // e.g., {entity: "Product"}
}

export class StoryTemplatesRepository {
  /**
   * Create a custom template
   */
  async createTemplate(input: CreateTemplateInput) {
    try {
      const templateId = generateId()

      // Create template
      const [template] = await db
        .insert(storyTemplates)
        .values({
          id: templateId,
          organizationId: input.organizationId,
          templateName: input.templateName,
          category: input.category,
          description: input.description || null,
          isPublic: input.isPublic || false,
          usageCount: 0,
          createdBy: input.createdBy,
        })
        .returning()

      // Create template stories
      const templateStoriesData = input.stories.map((story, index) => ({
        id: generateId(),
        templateId,
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        storyPoints: story.storyPoints || null,
        storyType: story.storyType || 'feature',
        tags: story.tags || [],
        order: index + 1,
      }))

      await db.insert(templateStories).values(templateStoriesData)

      return template
    } catch (error) {
      console.error('Create template error:', error)
      throw new Error('Failed to create template')
    }
  }

  /**
   * Get template by ID with stories
   */
  async getTemplateById(templateId: string) {
    try {
      const [template] = await db
        .select()
        .from(storyTemplates)
        .where(eq(storyTemplates.id, templateId))
        .limit(1)

      if (!template) {
        return null
      }

      const stories = await db
        .select()
        .from(templateStories)
        .where(eq(templateStories.templateId, templateId))
        .orderBy(templateStories.order)

      return {
        ...template,
        stories,
      }
    } catch (error) {
      console.error('Get template error:', error)
      throw new Error('Failed to get template')
    }
  }

  /**
   * List templates for organization
   */
  async listTemplates(organizationId: string, category?: TemplateCategory) {
    try {
      const whereConditions = category
        ? and(
            eq(storyTemplates.organizationId, organizationId),
            eq(storyTemplates.category, category)
          )
        : eq(storyTemplates.organizationId, organizationId)

      const templates = await db
        .select({
          id: storyTemplates.id,
          templateName: storyTemplates.templateName,
          category: storyTemplates.category,
          description: storyTemplates.description,
          isPublic: storyTemplates.isPublic,
          usageCount: storyTemplates.usageCount,
          createdBy: storyTemplates.createdBy,
          createdAt: storyTemplates.createdAt,
          storyCount: sql<number>`(
            SELECT COUNT(*)::integer
            FROM ${templateStories}
            WHERE ${templateStories.templateId} = ${storyTemplates.id}
          )`,
        })
        .from(storyTemplates)
        .where(whereConditions)
        .orderBy(desc(storyTemplates.usageCount))

      return templates
    } catch (error) {
      console.error('List templates error:', error)
      throw new Error('Failed to list templates')
    }
  }

  /**
   * Apply template to project (create real stories from template)
   */
  async applyTemplate(templateId: string, input: ApplyTemplateInput) {
    try {
      // Get template with stories
      const template = await this.getTemplateById(templateId)

      if (!template) {
        throw new Error('Template not found')
      }

      // Increment usage count
      await db
        .update(storyTemplates)
        .set({
          usageCount: sql`${storyTemplates.usageCount} + 1`,
        })
        .where(eq(storyTemplates.id, templateId))

      // Create actual stories from template
      const createdStories = []

      for (const templateStory of template.stories) {
        // Replace variables in title/description
        let title = templateStory.title
        let description = templateStory.description || ''

        if (input.variables) {
          Object.entries(input.variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g')
            title = title.replace(regex, value)
            description = description.replace(regex, value)
          })
        }

        const [story] = await db
          .insert(stories)
          .values({
            id: generateId(),
            organizationId: template.organizationId,
            projectId: input.projectId,
            epicId: input.epicId || null,
            title,
            description,
            acceptanceCriteria: templateStory.acceptanceCriteria,
            storyPoints: templateStory.storyPoints,
            storyType: templateStory.storyType,
            tags: templateStory.tags,
            status: 'backlog',
            priority: 'medium',
            aiGenerated: false,
            createdBy: input.createdBy,
            assigneeId: null,
          })
          .returning()

        createdStories.push(story)
      }

      return createdStories
    } catch (error) {
      console.error('Apply template error:', error)
      throw new Error('Failed to apply template')
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string) {
    try {
      // Delete template stories first
      await db.delete(templateStories).where(eq(templateStories.templateId, templateId))

      // Delete template
      const [deleted] = await db
        .delete(storyTemplates)
        .where(and(eq(storyTemplates.id, templateId), eq(storyTemplates.createdBy, userId)))
        .returning()

      return deleted || null
    } catch (error) {
      console.error('Delete template error:', error)
      throw new Error('Failed to delete template')
    }
  }

  /**
   * Seed built-in templates for organization
   */
  async seedBuiltInTemplates(organizationId: string, userId: string) {
    try {
      const builtInTemplates: CreateTemplateInput[] = [
        {
          organizationId,
          createdBy: userId,
          templateName: 'User Authentication',
          category: 'authentication',
          description: 'Complete user authentication flow with email/password',
          isPublic: true,
          stories: [
            {
              title: 'User Registration',
              description: 'As a new user, I want to create an account with email and password',
              acceptanceCriteria: [
                'Email validation (valid format)',
                'Password strength requirements (min 8 chars, uppercase, number)',
                'Duplicate email check',
                'Send welcome email',
                'Auto-login after registration',
              ],
              storyPoints: 5,
              tags: ['auth', 'backend', 'frontend'],
            },
            {
              title: 'User Login',
              description: 'As a registered user, I want to log in with my credentials',
              acceptanceCriteria: [
                'Email/password validation',
                'Wrong credentials error message',
                'Session management',
                'Remember me functionality',
                'Redirect to dashboard on success',
              ],
              storyPoints: 3,
              tags: ['auth', 'backend', 'frontend'],
            },
            {
              title: 'Password Reset',
              description: 'As a user, I want to reset my password if I forget it',
              acceptanceCriteria: [
                'Request reset link via email',
                'Secure token generation (expires in 1 hour)',
                'Reset password form',
                'Update password in database',
                'Invalidate old tokens',
              ],
              storyPoints: 5,
              tags: ['auth', 'backend', 'email'],
            },
            {
              title: 'Email Verification',
              description: 'As a registered user, I need to verify my email address',
              acceptanceCriteria: [
                'Send verification email on registration',
                'Verification link with secure token',
                'Mark email as verified',
                'Resend verification email option',
                'Block unverified users from sensitive actions',
              ],
              storyPoints: 3,
              tags: ['auth', 'backend', 'email'],
            },
          ],
        },
        {
          organizationId,
          createdBy: userId,
          templateName: 'CRUD for {entity}',
          category: 'crud',
          description: 'Standard CRUD operations (Create, Read, Update, Delete)',
          isPublic: true,
          stories: [
            {
              title: 'Create {entity}',
              description: 'As a user, I want to create a new {entity}',
              acceptanceCriteria: [
                'Form with all required fields',
                'Validation for required fields',
                'Save to database',
                'Success confirmation message',
                'Redirect to {entity} list',
              ],
              storyPoints: 3,
              tags: ['crud', 'backend', 'frontend'],
            },
            {
              title: 'List {entity}',
              description: 'As a user, I want to see all {entity} items',
              acceptanceCriteria: [
                'Display all {entity} in table/list',
                'Pagination (25 per page)',
                'Search/filter functionality',
                'Sort by date, name, etc.',
                'Empty state message',
              ],
              storyPoints: 5,
              tags: ['crud', 'backend', 'frontend'],
            },
            {
              title: 'View {entity} Details',
              description: 'As a user, I want to view details of a single {entity}',
              acceptanceCriteria: [
                'Display all {entity} fields',
                'Handle not found (404)',
                'Back to list button',
                'Edit/Delete action buttons',
              ],
              storyPoints: 2,
              tags: ['crud', 'frontend'],
            },
            {
              title: 'Update {entity}',
              description: 'As a user, I want to edit an existing {entity}',
              acceptanceCriteria: [
                'Pre-fill form with current values',
                'Validation for required fields',
                'Update database',
                'Success confirmation',
                'Handle concurrent edits',
              ],
              storyPoints: 3,
              tags: ['crud', 'backend', 'frontend'],
            },
            {
              title: 'Delete {entity}',
              description: 'As a user, I want to delete a {entity}',
              acceptanceCriteria: [
                'Confirmation dialog before delete',
                'Soft delete (mark as deleted)',
                'Remove from database',
                'Success confirmation',
                'Handle foreign key constraints',
              ],
              storyPoints: 2,
              tags: ['crud', 'backend'],
            },
          ],
        },
        {
          organizationId,
          createdBy: userId,
          templateName: 'Stripe Payment Integration',
          category: 'payments',
          description: 'Accept payments via Stripe with subscriptions',
          isPublic: true,
          stories: [
            {
              title: 'Stripe Account Setup',
              description: 'As a developer, I need to integrate Stripe SDK and webhooks',
              acceptanceCriteria: [
                'Install Stripe SDK',
                'Configure API keys (test/prod)',
                'Set up webhook endpoint',
                'Verify webhook signatures',
                'Create Stripe customer on signup',
              ],
              storyPoints: 5,
              tags: ['payments', 'backend', 'infrastructure'],
            },
            {
              title: 'Checkout Flow',
              description: 'As a user, I want to purchase a subscription plan',
              acceptanceCriteria: [
                'Display pricing plans',
                'Stripe Checkout integration',
                'Handle successful payment',
                'Handle payment failures',
                'Redirect after payment',
              ],
              storyPoints: 8,
              tags: ['payments', 'backend', 'frontend'],
            },
            {
              title: 'Subscription Management',
              description: 'As a user, I want to manage my subscription',
              acceptanceCriteria: [
                'View current plan and billing date',
                'Upgrade/downgrade plan',
                'Cancel subscription',
                'Reactivate cancelled subscription',
                'Prorate billing on changes',
              ],
              storyPoints: 8,
              tags: ['payments', 'backend', 'frontend'],
            },
            {
              title: 'Invoice & Receipt Generation',
              description: 'As a user, I want to receive invoices for payments',
              acceptanceCriteria: [
                'Generate PDF invoices',
                'Send invoice email after payment',
                'View invoice history',
                'Download invoices',
                'Include tax information',
              ],
              storyPoints: 5,
              tags: ['payments', 'backend', 'email'],
            },
          ],
        },
        {
          organizationId,
          createdBy: userId,
          templateName: 'Admin Dashboard',
          category: 'admin',
          description: 'Admin panel for user/system management',
          isPublic: true,
          stories: [
            {
              title: 'Admin User Management',
              description: 'As an admin, I want to manage user accounts',
              acceptanceCriteria: [
                'List all users with pagination',
                'Search users by email/name',
                'View user details',
                'Suspend/unsuspend users',
                'Change user roles',
              ],
              storyPoints: 5,
              tags: ['admin', 'backend', 'frontend'],
            },
            {
              title: 'System Metrics Dashboard',
              description: 'As an admin, I want to see system health metrics',
              acceptanceCriteria: [
                'Total users count',
                'Active users (last 7 days)',
                'Revenue charts',
                'Error rate monitoring',
                'Database query performance',
              ],
              storyPoints: 8,
              tags: ['admin', 'backend', 'frontend', 'analytics'],
            },
            {
              title: 'Activity Logs',
              description: 'As an admin, I want to view system activity logs',
              acceptanceCriteria: [
                'List all user actions',
                'Filter by user, action type, date',
                'View log details',
                'Export logs to CSV',
                'Retention policy (90 days)',
              ],
              storyPoints: 5,
              tags: ['admin', 'backend', 'frontend'],
            },
          ],
        },
        {
          organizationId,
          createdBy: userId,
          templateName: 'REST API for {entity}',
          category: 'api',
          description: 'RESTful API endpoints with authentication',
          isPublic: true,
          stories: [
            {
              title: 'GET /api/{entity}',
              description: 'List all {entity} with pagination and filtering',
              acceptanceCriteria: [
                'Return JSON array of {entity}',
                'Pagination query params (?page=1&limit=25)',
                'Filter/search query params',
                'Rate limiting (100 req/min)',
                'API key authentication',
              ],
              storyPoints: 3,
              tags: ['api', 'backend'],
            },
            {
              title: 'GET /api/{entity}/:id',
              description: 'Get single {entity} by ID',
              acceptanceCriteria: [
                'Return {entity} JSON',
                '404 if not found',
                '401 if unauthorized',
                'Include related resources',
              ],
              storyPoints: 2,
              tags: ['api', 'backend'],
            },
            {
              title: 'POST /api/{entity}',
              description: 'Create new {entity}',
              acceptanceCriteria: [
                'Accept JSON body',
                'Validate required fields',
                '201 status on success',
                'Return created {entity}',
                '400 for validation errors',
              ],
              storyPoints: 3,
              tags: ['api', 'backend'],
            },
            {
              title: 'PUT /api/{entity}/:id',
              description: 'Update existing {entity}',
              acceptanceCriteria: [
                'Accept JSON body',
                'Partial updates supported',
                '200 status on success',
                '404 if not found',
                'Return updated {entity}',
              ],
              storyPoints: 3,
              tags: ['api', 'backend'],
            },
            {
              title: 'DELETE /api/{entity}/:id',
              description: 'Delete {entity}',
              acceptanceCriteria: [
                '204 No Content on success',
                '404 if not found',
                '401 if unauthorized',
                'Soft delete option',
              ],
              storyPoints: 2,
              tags: ['api', 'backend'],
            },
          ],
        },
      ]

      const createdTemplates = []

      for (const templateData of builtInTemplates) {
        const template = await this.createTemplate(templateData)
        createdTemplates.push(template)
      }

      return createdTemplates
    } catch (error) {
      console.error('Seed templates error:', error)
      throw new Error('Failed to seed templates')
    }
  }
}

// Export singleton instance
export const storyTemplatesRepository = new StoryTemplatesRepository()
