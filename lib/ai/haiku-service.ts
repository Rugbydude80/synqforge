/**
 * Claude 4.5 Haiku Service (via OpenRouter)
 * Unified AI service with cost controls and tier-aware prompting
 */

import { openai } from '@/lib/ai/client'
import type { SubscriptionTier } from '@/lib/utils/subscription'
import {
  AI_MODEL_CONFIG,
  getSystemPrompt,
  getStoryPrompt,
  getDecomposerPrompt,
  getVelocityPrompt,
  getTokenBudget,
} from './prompts'
import type { VelocityContext } from './prompts'
import {
  checkUsageAllowance,
  checkRateLimit,
  recordUsage,
  hashPrompt,
  checkDuplicatePrompts,
} from './usage-enforcement'

/**
 * Convert model name to OpenRouter format
 */
function getOpenRouterModel(model: string): string {
  // If already in OpenRouter format, return as-is
  if (model.includes('/')) {
    return model;
  }
  // Convert Anthropic model names to OpenRouter format
  if (model.startsWith('claude')) {
    return `anthropic/${model}`;
  }
  // Return as-is for other models
  return model;
}

interface AIRequest {
  organizationId: string
  userId: string
  tier: SubscriptionTier
  userRequest: string
  taskComplexity?: 'simple' | 'medium' | 'complex'
  maxTokensOverride?: number
}

interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  model: string
  cached: boolean
  throttled: boolean
}

export class HaikuService {
  /**
   * General AI request with system prompt
   */
  static async generateCompletion(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()

    // Check rate limits
    const rateCheck = await checkRateLimit(request.userId, request.tier)
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.reason || 'Rate limit exceeded')
    }

    // Check usage allowance
    const usageCheck = await checkUsageAllowance(request.organizationId, request.tier)
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason || 'Usage limit exceeded')
    }

    // Determine max output tokens
    let maxOutputTokens = request.maxTokensOverride || getTokenBudget(request.tier, request.taskComplexity)

    if (usageCheck.throttled && usageCheck.suggestedMaxOutputTokens) {
      maxOutputTokens = Math.min(maxOutputTokens, usageCheck.suggestedMaxOutputTokens)
    }

    // Build prompt
    const systemPrompt = getSystemPrompt({
      tier: request.tier,
      maxOutputTokens,
      userRequest: request.userRequest,
    })

    const promptHash = hashPrompt(systemPrompt)

    // Check for duplicate prompts (abuse detection)
    const dupCheck = await checkDuplicatePrompts(request.organizationId, promptHash)
    if (dupCheck.isDuplicate) {
      throw new Error('Duplicate request detected. Please vary your inputs or wait before retrying.')
    }

    // Call OpenRouter API
    const openRouterModel = getOpenRouterModel(AI_MODEL_CONFIG.model);
    const response = await openai.chat.completions.create({
      model: openRouterModel,
      max_tokens: maxOutputTokens,
      temperature: AI_MODEL_CONFIG.temperature,
      messages: [
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
    })

    const latencyMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || ''

    // Record usage
    await recordUsage(
      request.organizationId,
      request.userId,
      'general',
      {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        model: AI_MODEL_CONFIG.model,
        latencyMs,
        cacheHit: false,
        promptSha256: promptHash,
      },
      {
        taskComplexity: request.taskComplexity,
        throttled: usageCheck.throttled,
      }
    )

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: AI_MODEL_CONFIG.model,
      cached: false,
      throttled: usageCheck.throttled,
    }
  }

  /**
   * Generate single perfect user story
   */
  static async generateStory(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()

    // Rate & usage checks
    const rateCheck = await checkRateLimit(request.userId, request.tier)
    if (!rateCheck.allowed) throw new Error(rateCheck.reason!)

    const usageCheck = await checkUsageAllowance(request.organizationId, request.tier)
    if (!usageCheck.allowed) throw new Error(usageCheck.reason!)

    let maxOutputTokens = request.maxTokensOverride || getTokenBudget(request.tier, 'complex')
    if (usageCheck.throttled && usageCheck.suggestedMaxOutputTokens) {
      maxOutputTokens = Math.min(maxOutputTokens, usageCheck.suggestedMaxOutputTokens)
    }

    const storyPrompt = getStoryPrompt({
      tier: request.tier,
      maxOutputTokens,
      userRequest: request.userRequest,
    })

    const promptHash = hashPrompt(storyPrompt)

    const openRouterModel = getOpenRouterModel(AI_MODEL_CONFIG.model);
    const response = await openai.chat.completions.create({
      model: openRouterModel,
      max_tokens: maxOutputTokens,
      temperature: 0.7,
      messages: [{ role: 'user', content: storyPrompt }],
    })

    const latencyMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || ''

    await recordUsage(
      request.organizationId,
      request.userId,
      'story_generation',
      {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        model: AI_MODEL_CONFIG.model,
        latencyMs,
        cacheHit: false,
        promptSha256: promptHash,
      }
    )

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: AI_MODEL_CONFIG.model,
      cached: false,
      throttled: usageCheck.throttled,
    }
  }

  /**
   * Decompose document into epics and stories
   */
  static async decomposeDocument(
    request: AIRequest & {
      docTitle: string
      docSize: number
      priorities?: string
      nonGoals?: string
      batchSize?: number
    }
  ): Promise<AIResponse> {
    const startTime = Date.now()

    const rateCheck = await checkRateLimit(request.userId, request.tier)
    if (!rateCheck.allowed) throw new Error(rateCheck.reason!)

    const usageCheck = await checkUsageAllowance(request.organizationId, request.tier, request.docSize * 2)
    if (!usageCheck.allowed) throw new Error(usageCheck.reason!)

    let maxOutputTokens = request.maxTokensOverride || getTokenBudget(request.tier, 'complex')
    if (usageCheck.throttled && usageCheck.suggestedMaxOutputTokens) {
      maxOutputTokens = Math.min(maxOutputTokens, usageCheck.suggestedMaxOutputTokens)
    }

    const decomposerPrompt = getDecomposerPrompt({
      tier: request.tier,
      maxOutputTokens,
      userRequest: request.userRequest,
      docTitle: request.docTitle,
      docSize: request.docSize,
      priorities: request.priorities,
      nonGoals: request.nonGoals,
      batchSize: request.batchSize,
    })

    const promptHash = hashPrompt(decomposerPrompt)

    const openRouterModel = getOpenRouterModel(AI_MODEL_CONFIG.model);
    const response = await openai.chat.completions.create({
      model: openRouterModel,
      max_tokens: maxOutputTokens,
      temperature: 0.7,
      messages: [{ role: 'user', content: decomposerPrompt }],
    })

    const latencyMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || ''

    await recordUsage(
      request.organizationId,
      request.userId,
      'requirements_analysis',
      {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        model: AI_MODEL_CONFIG.model,
        latencyMs,
        cacheHit: false,
        promptSha256: promptHash,
      },
      {
        docSize: request.docSize,
        docTitle: request.docTitle,
      }
    )

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: AI_MODEL_CONFIG.model,
      cached: false,
      throttled: usageCheck.throttled,
    }
  }

  /**
   * Velocity analysis and sprint planning
   */
  static async analyzeVelocity(
    request: AIRequest & Omit<VelocityContext, 'tier' | 'maxOutputTokens' | 'userRequest'>
  ): Promise<AIResponse> {
    const startTime = Date.now()

    const rateCheck = await checkRateLimit(request.userId, request.tier)
    if (!rateCheck.allowed) throw new Error(rateCheck.reason!)

    const usageCheck = await checkUsageAllowance(request.organizationId, request.tier)
    if (!usageCheck.allowed) throw new Error(usageCheck.reason!)

    let maxOutputTokens = request.maxTokensOverride || getTokenBudget(request.tier, 'complex')
    if (usageCheck.throttled && usageCheck.suggestedMaxOutputTokens) {
      maxOutputTokens = Math.min(maxOutputTokens, usageCheck.suggestedMaxOutputTokens)
    }

    const velocityPrompt = getVelocityPrompt({
      tier: request.tier,
      maxOutputTokens,
      userRequest: request.userRequest,
      pastSprints: request.pastSprints,
      capacityNotes: request.capacityNotes,
      backlog: request.backlog,
      sprintLengthDays: request.sprintLengthDays,
      numFutureSprints: request.numFutureSprints,
      bufferPct: request.bufferPct,
    })

    const promptHash = hashPrompt(velocityPrompt)

    const openRouterModel = getOpenRouterModel(AI_MODEL_CONFIG.model);
    const response = await openai.chat.completions.create({
      model: openRouterModel,
      max_tokens: maxOutputTokens,
      temperature: 0.5, // Lower for numerical planning
      messages: [{ role: 'user', content: velocityPrompt }],
    })

    const latencyMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || ''

    await recordUsage(
      request.organizationId,
      request.userId,
      'planning_forecast',
      {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        model: AI_MODEL_CONFIG.model,
        latencyMs,
        cacheHit: false,
        promptSha256: promptHash,
      },
      {
        numSprints: request.pastSprints.length,
        backlogSize: request.backlog.length,
      }
    )

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: AI_MODEL_CONFIG.model,
      cached: false,
      throttled: usageCheck.throttled,
    }
  }
}
