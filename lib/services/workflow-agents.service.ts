import { db, generateId } from '@/lib/db'
import { workflowAgents, agentActions, organizations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

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

async function executeAction(action: AgentActionDefinition, context: Record<string, any>): Promise<void> {
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
        eq(agentActions.status, 'pending')
      )
    )
    .orderBy(desc(agentActions.createdAt))
}
