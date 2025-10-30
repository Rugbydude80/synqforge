import { db, generateId } from '@/lib/db'
import { workflowAgents, agentActions, organizations, stories, users, projects } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { StoriesRepository } from '@/lib/repositories/stories.repository'
import { NotificationsRepository } from '@/lib/repositories/notifications.repository'
import { storyGenerationService } from '@/lib/ai/story-generation.service'

type AgentStatus = 'enabled' | 'paused' | 'disabled'

export interface AgentActionDefinition {
  type: 'add_label' | 'assign_user' | 'send_notification' | 'update_field' | 'ai_action'
  config: Record<string, any>
}

export interface AgentActionConfig {
  conditions?: Record<string, any>
  actions?: AgentActionDefinition[]
}

export interface CreateWorkflowAgentInput {
  agentName: string
  description?: string
  triggerEvent: string
  scope?: Record<string, any>
  rateLimitPerHour?: number
  tokenCapPerAction?: number
  requiresApproval?: boolean
  actionConfig?: AgentActionConfig
  createdBy: string
  status?: AgentStatus
}

export async function createWorkflowAgent(
  organizationId: string,
  input: CreateWorkflowAgentInput
): Promise<{ agentId: string }> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!organization || organization.subscriptionTier !== 'enterprise') {
    throw new Error('Workflow Agents require Enterprise plan.')
  }

  const agentId = generateId()
  await db.insert(workflowAgents).values({
    id: agentId,
    organizationId,
    agentName: input.agentName,
    description: input.description ?? null,
    triggerEvent: input.triggerEvent,
    scope: input.scope ?? {},
    rateLimitPerHour: input.rateLimitPerHour ?? 60,
    tokenCapPerAction: input.tokenCapPerAction ?? 5000,
    requiresApproval: input.requiresApproval ?? true,
    actionConfig: (input.actionConfig ?? {}) as any,
    status: (input.status ?? 'enabled') as any,
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return { agentId }
}

export async function executeAgent(
  agentId: string,
  context: Record<string, any>
): Promise<{ actionsExecuted: number; reviewRequired: boolean }> {
  const [agent] = await db
    .select()
    .from(workflowAgents)
    .where(eq(workflowAgents.id, agentId))
    .limit(1)

  if (!agent || agent.status !== 'enabled') {
    throw new Error('Agent not found or inactive')
  }

  const actionConfig = (agent.actionConfig ?? {}) as AgentActionConfig

  // Check conditions
  const conditionsMet = evaluateConditions(actionConfig.conditions ?? {}, context)
  if (!conditionsMet) {
    return { actionsExecuted: 0, reviewRequired: false }
  }

  // If review required, queue for approval
  if (agent.requiresApproval) {
    await db.insert(agentActions).values({
      id: generateId(),
      organizationId: agent.organizationId,
      agentId: agent.id,
      status: 'pending',
      actionType: 'review',
      actionData: { context } as any,
      createdAt: new Date(),
    })
    return { actionsExecuted: 0, reviewRequired: true }
  }

  // Execute actions
  const actions = actionConfig.actions ?? []
  let executed = 0
  for (const action of actions) {
    await executeAction(action, context)
    executed++

    await db.insert(agentActions).values({
      id: generateId(),
      organizationId: agent.organizationId,
      agentId: agent.id,
      actionType: action.type,
      status: 'executed',
      actionData: { context, config: action.config } as any,
      executedAt: new Date(),
      createdAt: new Date(),
    })
  }

  return { actionsExecuted: executed, reviewRequired: false }
}

function evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
  // Simple condition evaluation
  for (const [key, value] of Object.entries(conditions)) {
    if (context[key] !== value) return false
  }
  return true
}

/**
 * Execute workflow action
 * 
 * Implements all 5 action types:
 * - add_label: Add label to story
 * - assign_user: Assign user to story with validation
 * - send_notification: Create notification using NotificationRepository
 * - update_field: Update story field with validation
 * - ai_action: Trigger AI service with context
 * 
 * @param action - Action definition with type and config
 * @param context - Execution context (storyId, organizationId, userId, etc.)
 * @throws Error if action fails or validation fails
 */
export async function executeAction(action: AgentActionDefinition, context: Record<string, any>): Promise<void> {
  const { type, config } = action
  const { storyId, organizationId } = context

  console.log(`[Workflow Agent] Executing action: ${type}`, {
    storyId,
    organizationId,
    config,
  })

  try {
    switch (type) {
      case 'add_label':
        await handleAddLabel(config, context)
        break

      case 'assign_user':
        await handleAssignUser(config, context)
        break

      case 'send_notification':
        await handleSendNotification(config, context)
        break

      case 'update_field':
        await handleUpdateField(config, context)
        break

      case 'ai_action':
        await handleAIAction(config, context)
        break

      default:
        throw new Error(`Unknown action type: ${type}`)
    }

    console.log(`[Workflow Agent] Action ${type} executed successfully`)
  } catch (error) {
    console.error(`[Workflow Agent] Action ${type} failed:`, error)
    throw error // Re-throw to allow caller to handle
  }
}

/**
 * Handle add_label action
 * Adds a label to a story's labels array
 */
async function handleAddLabel(config: Record<string, any>, context: Record<string, any>): Promise<void> {
  const { storyId, label } = config

  if (!storyId || !label) {
    throw new Error('add_label action requires storyId and label')
  }

  // Verify story exists and belongs to organization
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (!story) {
    throw new Error(`Story not found: ${storyId}`)
  }

  if (story.organizationId !== context.organizationId) {
    throw new Error('Story does not belong to organization')
  }

  // Get current labels
  const currentLabels = Array.isArray(story.labels) ? [...story.labels] : []

  // Add label if not already present
  if (!currentLabels.includes(label)) {
    currentLabels.push(label)

    // Update story
    await db
      .update(stories)
      .set({
        labels: currentLabels,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, storyId))

    console.log(`[Workflow Agent] Added label "${label}" to story ${storyId}`)
  } else {
    console.log(`[Workflow Agent] Label "${label}" already exists on story ${storyId}`)
  }
}

/**
 * Handle assign_user action
 * Assigns a user to a story with validation
 */
async function handleAssignUser(config: Record<string, any>, context: Record<string, any>): Promise<void> {
  const { storyId, userId: assigneeId } = config

  if (!storyId || !assigneeId) {
    throw new Error('assign_user action requires storyId and userId')
  }

  // Verify story exists and belongs to organization
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (!story) {
    throw new Error(`Story not found: ${storyId}`)
  }

  if (story.organizationId !== context.organizationId) {
    throw new Error('Story does not belong to organization')
  }

  // Verify assignee exists and belongs to organization
  const [assignee] = await db
    .select()
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1)

  if (!assignee) {
    throw new Error(`Assignee not found: ${assigneeId}`)
  }

  if (assignee.organizationId !== context.organizationId) {
    throw new Error('Assignee does not belong to organization')
  }

  if (!assignee.isActive) {
    throw new Error('Assignee is not active')
  }

  // Update story
  await db
    .update(stories)
    .set({
      assigneeId,
      updatedAt: new Date(),
    })
    .where(eq(stories.id, storyId))

  console.log(`[Workflow Agent] Assigned user ${assigneeId} to story ${storyId}`)
}

/**
 * Handle send_notification action
 * Creates a notification using NotificationRepository
 */
async function handleSendNotification(config: Record<string, any>, context: Record<string, any>): Promise<void> {
  const { userId, type, entityType, entityId, message, actionUrl, emailData } = config

  if (!userId || !type || !entityType || !entityId || !message) {
    throw new Error('send_notification action requires userId, type, entityType, entityId, and message')
  }

  // Verify user exists and belongs to organization
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  if (user.organizationId !== context.organizationId) {
    throw new Error('User does not belong to organization')
  }

  // Create notification
  const notificationsRepo = new NotificationsRepository()
  await notificationsRepo.create({
    userId,
    type,
    entityType,
    entityId,
    message,
    actionUrl,
    emailData,
  })

  console.log(`[Workflow Agent] Created notification for user ${userId}`)
}

/**
 * Handle update_field action
 * Updates story field(s) with validation
 */
async function handleUpdateField(config: Record<string, any>, context: Record<string, any>): Promise<void> {
  const { storyId, field, value, updates } = config

  if (!storyId) {
    throw new Error('update_field action requires storyId')
  }

  // Verify story exists and belongs to organization
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (!story) {
    throw new Error(`Story not found: ${storyId}`)
  }

  if (story.organizationId !== context.organizationId) {
    throw new Error('Story does not belong to organization')
  }

  // Use stories repository for proper validation
  const storiesRepo = new StoriesRepository()

  // Build update input
  const updateInput: Record<string, any> = {}

  if (updates) {
    // Multiple fields update
    const allowedFields = [
      'title',
      'description',
      'acceptanceCriteria',
      'storyPoints',
      'priority',
      'status',
      'storyType',
      'tags',
      'labels',
      'assigneeId',
      'epicId',
    ]

    for (const [key, val] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateInput[key] = val
      } else {
        throw new Error(`Invalid field for update: ${key}`)
      }
    }
  } else if (field && value !== undefined) {
    // Single field update
    const allowedFields = [
      'title',
      'description',
      'acceptanceCriteria',
      'storyPoints',
      'priority',
      'status',
      'storyType',
      'tags',
      'labels',
      'assigneeId',
      'epicId',
    ]

    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field for update: ${field}`)
    }

    updateInput[field] = value
  } else {
    throw new Error('update_field action requires either (field, value) or updates object')
  }

  // Validate assignee if updating assigneeId
  if (updateInput.assigneeId !== undefined) {
    const [assignee] = await db
      .select()
      .from(users)
      .where(eq(users.id, updateInput.assigneeId))
      .limit(1)

    if (!assignee) {
      throw new Error(`Assignee not found: ${updateInput.assigneeId}`)
    }

    if (assignee.organizationId !== context.organizationId) {
      throw new Error('Assignee does not belong to organization')
    }
  }

  // Update story using repository
  await storiesRepo.update(storyId, updateInput, context.userId || story.createdBy)

  console.log(`[Workflow Agent] Updated story ${storyId} fields:`, Object.keys(updateInput))
}

/**
 * Handle ai_action action
 * Triggers AI service with context
 */
async function handleAIAction(config: Record<string, any>, context: Record<string, any>): Promise<void> {
  const { action, storyId, prompt, ...aiConfig } = config

  if (!action || !storyId) {
    throw new Error('ai_action requires action and storyId')
  }

  // Verify story exists and belongs to organization
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (!story) {
    throw new Error(`Story not found: ${storyId}`)
  }

  if (story.organizationId !== context.organizationId) {
    throw new Error('Story does not belong to organization')
  }

  // Get project to verify organization
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, story.projectId))
    .limit(1)

  if (!project || project.organizationId !== context.organizationId) {
    throw new Error('Project does not belong to organization')
  }

  // Execute AI action based on action type
  switch (action) {
    case 'generate_description':
      if (!prompt) {
        throw new Error('generate_description requires prompt')
      }

      // Call AI service to generate description
      const aiResponse = await storyGenerationService.generateStory({
        projectId: story.projectId,
        capability: {
          key: `ai_generated_${storyId}`,
          title: story.title,
          description: prompt,
          hasUI: false,
          themes: ['data-entry'],
          requiresWCAG: false,
          requiresPersistence: false,
          acceptanceCriteria: [
            {
              given: 'A user',
              when: 'they access the story',
              then: 'they see the description',
              is_interactive: false,
              themes: [],
            },
          ],
          estimate: 3,
        },
        projectContext: undefined,
        requestId: generateId(),
        model: aiConfig.model || 'claude-3-5-sonnet-20241022',
        qualityThreshold: 0.7,
      })

      // Update story description with AI-generated content
      if (aiResponse.story?.description) {
        await db
          .update(stories)
          .set({
            description: aiResponse.story.description,
            updatedAt: new Date(),
          })
          .where(eq(stories.id, storyId))

        console.log(`[Workflow Agent] Generated description for story ${storyId}`)
      }
      break

    case 'validate_story':
      // Use validation service to validate story
      const { validationService } = await import('@/lib/ai/validation.service')
      
      // Convert acceptanceCriteria to AcceptanceCriterion[] format if needed
      let acArray: Array<{ given: string; when: string; then: string; is_interactive: boolean; themes: string[] }> = []
      
      if (Array.isArray(story.acceptanceCriteria)) {
        acArray = story.acceptanceCriteria.map((ac: any) => {
          if (typeof ac === 'string') {
            // Parse string format "Given X When Y Then Z"
            const parts = ac.split(/When|Then/i)
            return {
              given: parts[0]?.replace(/Given/i, '').trim() || 'A user',
              when: parts[1]?.trim() || 'they perform an action',
              then: parts[2]?.trim() || 'they see a result',
              is_interactive: false,
              themes: [],
            }
          } else if (ac.given && ac.when && ac.then) {
            return {
              given: ac.given,
              when: ac.when,
              then: ac.then,
              is_interactive: ac.is_interactive || false,
              themes: ac.themes || [],
            }
          } else {
            return {
              given: `${ac.given || ''}`.trim() || 'A user',
              when: `${ac.when || ''}`.trim() || 'they perform an action',
              then: `${ac.then || ''}`.trim() || 'they see a result',
              is_interactive: false,
              themes: [],
            }
          }
        })
      }
      
      const validation = await validationService.validateStory(
        acArray as any,
        false,
        [],
        0.7
      )

      // Update story with validation results
      if (validation.acceptanceCriteria && Array.isArray(validation.acceptanceCriteria)) {
        // Convert to string array format expected by database
        const acStrings = validation.acceptanceCriteria.map((ac: any) => 
          typeof ac === 'string' ? ac : `${ac.given || ''} ${ac.when || ''} ${ac.then || ''}`.trim()
        ).filter(Boolean)
        
        await db
          .update(stories)
          .set({
            acceptanceCriteria: acStrings,
            updatedAt: new Date(),
          })
          .where(eq(stories.id, storyId))
      }

      console.log(`[Workflow Agent] Validated story ${storyId}`)
      break

    default:
      throw new Error(`Unknown AI action: ${action}`)
  }
}

export async function getWorkflowAgents(organizationId: string) {
  return await db
    .select()
    .from(workflowAgents)
    .where(eq(workflowAgents.organizationId, organizationId))
    .orderBy(desc(workflowAgents.createdAt))
}

export async function getPendingActions(organizationId: string) {
  return await db
    .select()
    .from(agentActions)
    .where(
      and(
        eq(agentActions.organizationId, organizationId),
        eq(agentActions.status, 'pending')
      )
    )
    .orderBy(desc(agentActions.createdAt))
}
