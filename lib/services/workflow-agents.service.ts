import { db, generateId } from '@/lib/db'
import { workflowAgents, agentActions, organizations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface WorkflowAgent {
  id: string
  name: string
  trigger: 'story_created' | 'story_updated' | 'sprint_started' | 'pr_merged'
  conditions: Record<string, any>
  actions: Array<{
    type: 'add_label' | 'assign_user' | 'send_notification' | 'update_field' | 'ai_action'
    config: Record<string, any>
  }>
  requiresReview: boolean
  isActive: boolean
}

export async function createWorkflowAgent(
  organizationId: string,
  agent: Omit<WorkflowAgent, 'id'>
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
    name: agent.name,
    trigger: agent.trigger,
    conditions: agent.conditions as any,
    actions: agent.actions as any,
    requiresReview: agent.requiresReview,
    isActive: agent.isActive,
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

  if (!agent || !agent.isActive) {
    throw new Error('Agent not found or inactive')
  }

  // Check conditions
  const conditionsMet = evaluateConditions(agent.conditions as any, context)
  if (!conditionsMet) {
    return { actionsExecuted: 0, reviewRequired: false }
  }

  // If review required, queue for approval
  if (agent.requiresReview) {
    await db.insert(agentActions).values({
      id: generateId(),
      organizationId: agent.organizationId,
      agentId: agent.id,
      status: 'pending_review',
      context: context as any,
      createdAt: new Date(),
    })
    return { actionsExecuted: 0, reviewRequired: true }
  }

  // Execute actions
  const actions = agent.actions as any
  for (const action of actions) {
    await executeAction(action, context)
  }

  return { actionsExecuted: actions.length, reviewRequired: false }
}

function evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
  // Simple condition evaluation
  for (const [key, value] of Object.entries(conditions)) {
    if (context[key] !== value) return false
  }
  return true
}

async function executeAction(action: any, context: Record<string, any>): Promise<void> {
  // Execute workflow action (add label, assign user, etc.)
  console.log('Executing action:', action.type, 'with context:', context)
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
        eq(agentActions.status, 'pending_review')
      )
    )
    .orderBy(desc(agentActions.createdAt))
}
