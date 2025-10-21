import { db, generateId } from '@/lib/db'
import { aiModelPolicies, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface ModelPolicy {
  id: string
  organizationId: string
  preferredModel: string
  fallbackModels: string[]
  maxTokensPerRequest: number
  temperature: number
  customSystemPrompt?: string
  enabledFeatures: string[]
  rateOverrides: Record<string, number>
}

/**
 * Set organization-level model policy
 */
export async function setModelPolicy(
  organizationId: string,
  policy: Omit<ModelPolicy, 'id' | 'organizationId'>
): Promise<{ policyId: string }> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!organization || organization.subscriptionTier !== 'enterprise') {
    throw new Error('Model Controls require Enterprise plan.')
  }

  // Delete existing policy
  await db.delete(aiModelPolicies).where(eq(aiModelPolicies.organizationId, organizationId))

  // Create new policy
  const policyId = generateId()
  await db.insert(aiModelPolicies).values({
    id: policyId,
    organizationId,
    createdBy: organizationId, // Using organizationId as placeholder
    featureType: 'autopilot',
    modelTier: 'balanced',
    modelName: policy.preferredModel || 'claude-3-5-sonnet-latest',
    maxTokensPerRequest: policy.maxTokensPerRequest || 10000,
    enableContextOptimization: true,
    customInstructions: policy.customSystemPrompt,
  })

  return { policyId }
}

/**
 * Get model policy for organization
 */
export async function getModelPolicy(organizationId: string): Promise<ModelPolicy | null> {
  const [policy] = await db
    .select()
    .from(aiModelPolicies)
    .where(eq(aiModelPolicies.organizationId, organizationId))
    .limit(1)

  if (!policy) return null

  return {
    id: policy.id,
    organizationId: policy.organizationId,
    preferredModel: policy.modelName || 'claude-3-5-sonnet-latest',
    fallbackModels: [],
    maxTokensPerRequest: policy.maxTokensPerRequest || 10000,
    temperature: 0.7,
    customSystemPrompt: policy.customInstructions || undefined,
    enabledFeatures: [],
    rateOverrides: {},
  }
}

/**
 * Optimize context for token efficiency
 */
export async function optimizeContext(
  content: string,
  maxTokens: number
): Promise<{ optimized: string; tokensRemoved: number }> {
  // Simple optimization: truncate to max tokens (4 chars per token estimate)
  const maxChars = maxTokens * 4
  if (content.length <= maxChars) {
    return { optimized: content, tokensRemoved: 0 }
  }

  const optimized = content.substring(0, maxChars) + '...[truncated]'
  const tokensRemoved = Math.ceil((content.length - maxChars) / 4)

  return { optimized, tokensRemoved }
}

/**
 * Get available models for organization
 */
export function getAvailableModels(tier: string): string[] {
  const baseModels = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']

  if (tier === 'enterprise') {
    return [...baseModels, 'claude-3-opus-20240229', 'claude-3-5-opus-20241022']
  }

  return baseModels
}
