import { db, generateId } from '@/lib/db'
import {
  effortScores,
  impactScores,
  stories,
  organizations,
} from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkAIRateLimit } from './ai-rate-limit.service'
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface RICEScore {
  reach: number // 0-10 scale
  impact: number // 0-3 scale (minimal=0.25, low=0.5, medium=1, high=2, massive=3)
  confidence: number // 0-100 percentage
  effort: number // person-months or story points
  riceScore: number // (Reach × Impact × Confidence) / Effort
  explanation: {
    reachReasoning: string
    impactReasoning: string
    confidenceReasoning: string
    effortReasoning: string
  }
}

export interface WSJFScore {
  costOfDelay: number // Business value + Time criticality + Risk reduction
  jobSize: number // Effort estimate
  wsjfScore: number // Cost of Delay / Job Size
  breakdown: {
    businessValue: number // 1-10
    timeCriticality: number // 1-10
    riskReduction: number // 1-10
  }
  explanation: {
    businessValueReasoning: string
    timeCriticalityReasoning: string
    riskReductionReasoning: string
    jobSizeReasoning: string
  }
}

export interface EffortEstimate {
  storyPoints: number
  confidence: 'low' | 'medium' | 'high'
  complexityFactors: string[]
  similarStories: Array<{
    storyId: string
    title: string
    effort: number
    similarity: number
  }>
  explanation: string
}

export interface ScoringResult {
  storyId: string
  storyTitle: string
  rice?: RICEScore
  wsjf?: WSJFScore
  effort?: EffortEstimate
  tokensUsed: number
  scoredAt: Date
}

/**
 * Generate RICE score for a story
 */
export async function generateRICEScore(
  storyId: string,
  organizationId: string,
  context?: {
    targetAudience?: string
    businessGoals?: string[]
    marketSize?: number
  }
): Promise<ScoringResult> {
  try {
    // Standard validation and setup
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    const tier = organization.subscriptionTier
    if (tier === 'free') {
      throw new Error('Effort & Impact Scoring requires Team plan or higher. Please upgrade to continue.')
    }

    const rateLimitCheck = await checkAIRateLimit(organizationId, tier)
    if (!rateLimitCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds before trying again.`
      )
    }

    const [story] = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
      .limit(1)

    if (!story) {
      throw new Error('Story not found')
    }

    const estimatedTokens = 3000

    // Check fair-usage AI token limit (HARD BLOCK)
    const aiCheck = await canUseAI(organizationId, estimatedTokens)
    if (!aiCheck.allowed) {
      throw new Error(
        aiCheck.reason || 'AI token limit reached. Please upgrade your plan or wait until next month.'
      )
    }

    // Show 90% warning if approaching limit
    if (aiCheck.isWarning && aiCheck.reason) {
      console.warn(`Fair-usage warning for org ${organizationId}: ${aiCheck.reason}`)
    }

    // Legacy token check (keep for backward compatibility)
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(
        `Insufficient AI tokens. You have ${tokenCheck.tokensRemaining} tokens remaining. ${tokenCheck.requiresUpgrade ? 'Please upgrade your plan or purchase additional tokens.' : 'Your tokens will reset at the start of the next billing period.'}`
      )
    }

    // Generate RICE score using AI
    const riceScore = await calculateRICEWithAI(story, context)

    // Save score
    const scoreId = generateId()
    await db.insert(impactScores).values({
      id: scoreId,
      organizationId,
      storyId,
      scoringMethod: 'rice',
      reach: riceScore.reach,
      impact: riceScore.impact,
      confidence: riceScore.confidence,
      riceScore: riceScore.riceScore,
      explanation: riceScore.explanation as any,
      tokensUsed: riceScore.tokensUsed,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await recordTokenUsage(organizationId, riceScore.tokensUsed, 'rice_scoring', false)

    // Track fair-usage token consumption
    await incrementTokenUsage(organizationId, riceScore.tokensUsed)

    return {
      storyId: story.id,
      storyTitle: story.title,
      rice: riceScore,
      tokensUsed: riceScore.tokensUsed,
      scoredAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error generating RICE score:', error)
    throw error
  }
}

/**
 * Calculate RICE score using AI
 */
async function calculateRICEWithAI(
  story: any,
  context?: any
): Promise<RICEScore & { tokensUsed: number }> {
  const prompt = `You are a product management expert. Calculate a RICE score for the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}
Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, i: number) => `${i + 1}. ${ac}`).join('\n') || 'N/A'}

${context?.targetAudience ? `Target Audience: ${context.targetAudience}` : ''}
${context?.businessGoals ? `Business Goals: ${context.businessGoals.join(', ')}` : ''}
${context?.marketSize ? `Market Size: ${context.marketSize} users` : ''}

RICE Scoring Framework:
- **Reach**: How many people will this impact per time period? (0-10 scale)
  - Consider: user base size, feature adoption rate, frequency of use
- **Impact**: How much will this impact each person? (0.25=minimal, 0.5=low, 1=medium, 2=high, 3=massive)
  - Consider: user satisfaction, business value, strategic importance
- **Confidence**: How confident are you in your estimates? (0-100%)
  - Consider: data availability, assumptions, market research
- **Effort**: How much work will this take? (person-months or story points)
  - Consider: development complexity, testing, deployment, technical debt

Calculate: RICE Score = (Reach × Impact × Confidence) / Effort

Respond in JSON format:
{
  "reach": 7,
  "impact": 2,
  "confidence": 80,
  "effort": 3,
  "riceScore": 37.3,
  "explanation": {
    "reachReasoning": "Detailed explanation of reach estimate",
    "impactReasoning": "Detailed explanation of impact assessment",
    "confidenceReasoning": "Detailed explanation of confidence level",
    "effortReasoning": "Detailed explanation of effort estimate"
  }
}

Provide realistic, data-driven estimates with clear reasoning.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  let parsedData
  try {
    const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
    parsedData = JSON.parse(jsonString.trim())
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI response. Please try again.')
  }

  return {
    ...parsedData,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

/**
 * Generate WSJF score for a story
 */
export async function generateWSJFScore(
  storyId: string,
  organizationId: string,
  context?: {
    quarterGoals?: string[]
    dependencies?: string[]
    regulatoryDeadlines?: string[]
  }
): Promise<ScoringResult> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    const tier = organization.subscriptionTier
    if (tier === 'free') {
      throw new Error('Effort & Impact Scoring requires Team plan or higher. Please upgrade to continue.')
    }

    const rateLimitCheck = await checkAIRateLimit(organizationId, tier)
    if (!rateLimitCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds before trying again.`
      )
    }

    const [story] = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
      .limit(1)

    if (!story) {
      throw new Error('Story not found')
    }

    const estimatedTokens = 3000

    // Check fair-usage AI token limit (HARD BLOCK)
    const aiCheck = await canUseAI(organizationId, estimatedTokens)
    if (!aiCheck.allowed) {
      throw new Error(
        aiCheck.reason || 'AI token limit reached. Please upgrade your plan or wait until next month.'
      )
    }

    // Show 90% warning if approaching limit
    if (aiCheck.isWarning && aiCheck.reason) {
      console.warn(`Fair-usage warning for org ${organizationId}: ${aiCheck.reason}`)
    }

    // Legacy token check (keep for backward compatibility)
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(
        `Insufficient AI tokens. You have ${tokenCheck.tokensRemaining} tokens remaining.`
      )
    }

    // Generate WSJF score using AI
    const wsjfScore = await calculateWSJFWithAI(story, context)

    // Save score
    const scoreId = generateId()
    await db.insert(impactScores).values({
      id: scoreId,
      organizationId,
      storyId,
      scoringMethod: 'wsjf',
      businessValue: wsjfScore.breakdown.businessValue,
      timeCriticality: wsjfScore.breakdown.timeCriticality,
      riskReduction: wsjfScore.breakdown.riskReduction,
      wsjfScore: wsjfScore.wsjfScore,
      explanation: wsjfScore.explanation as any,
      tokensUsed: wsjfScore.tokensUsed,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await recordTokenUsage(organizationId, wsjfScore.tokensUsed, 'wsjf_scoring', false)

    // Track fair-usage token consumption
    await incrementTokenUsage(organizationId, wsjfScore.tokensUsed)

    return {
      storyId: story.id,
      storyTitle: story.title,
      wsjf: wsjfScore,
      tokensUsed: wsjfScore.tokensUsed,
      scoredAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error generating WSJF score:', error)
    throw error
  }
}

/**
 * Calculate WSJF score using AI
 */
async function calculateWSJFWithAI(
  story: any,
  context?: any
): Promise<WSJFScore & { tokensUsed: number }> {
  const prompt = `You are a SAFe Agile expert. Calculate a WSJF (Weighted Shortest Job First) score for the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}
Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, i: number) => `${i + 1}. ${ac}`).join('\n') || 'N/A'}

${context?.quarterGoals ? `Quarter Goals: ${context.quarterGoals.join(', ')}` : ''}
${context?.dependencies ? `Dependencies: ${context.dependencies.join(', ')}` : ''}
${context?.regulatoryDeadlines ? `Regulatory Deadlines: ${context.regulatoryDeadlines.join(', ')}` : ''}

WSJF Framework:
Cost of Delay = Business Value + Time Criticality + Risk Reduction (each 1-10)
Job Size = Effort estimate (1-10)
WSJF Score = Cost of Delay / Job Size

**Business Value (1-10)**: Revenue impact, customer satisfaction, market position
**Time Criticality (1-10)**: Time sensitivity, deadlines, competitive pressure
**Risk Reduction (1-10)**: Technical debt, compliance, security, operational risks
**Job Size (1-10)**: Complexity, dependencies, unknowns

Respond in JSON format:
{
  "breakdown": {
    "businessValue": 8,
    "timeCriticality": 6,
    "riskReduction": 4
  },
  "jobSize": 5,
  "costOfDelay": 18,
  "wsjfScore": 3.6,
  "explanation": {
    "businessValueReasoning": "Detailed explanation",
    "timeCriticalityReasoning": "Detailed explanation",
    "riskReductionReasoning": "Detailed explanation",
    "jobSizeReasoning": "Detailed explanation"
  }
}

Provide realistic, strategic assessments with clear reasoning.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  let parsedData
  try {
    const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
    parsedData = JSON.parse(jsonString.trim())
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI response. Please try again.')
  }

  return {
    ...parsedData,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

/**
 * Suggest story point estimate with AI
 */
export async function suggestEffortEstimate(
  storyId: string,
  organizationId: string
): Promise<ScoringResult> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    const tier = organization.subscriptionTier
    if (tier === 'free') {
      throw new Error('Effort & Impact Scoring requires Team plan or higher.')
    }

    const rateLimitCheck = await checkAIRateLimit(organizationId, tier)
    if (!rateLimitCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds.`
      )
    }

    const [story] = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
      .limit(1)

    if (!story) {
      throw new Error('Story not found')
    }

    const estimatedTokens = 2500

    // Check fair-usage AI token limit (HARD BLOCK)
    const aiCheck = await canUseAI(organizationId, estimatedTokens)
    if (!aiCheck.allowed) {
      throw new Error(
        aiCheck.reason || 'AI token limit reached. Please upgrade your plan or wait until next month.'
      )
    }

    // Show 90% warning if approaching limit
    if (aiCheck.isWarning && aiCheck.reason) {
      console.warn(`Fair-usage warning for org ${organizationId}: ${aiCheck.reason}`)
    }

    // Legacy token check (keep for backward compatibility)
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(`Insufficient AI tokens. You have ${tokenCheck.tokensRemaining} remaining.`)
    }

    // Get similar stories for comparison
    const similarStories = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.organizationId, organizationId),
          eq(stories.projectId, story.projectId)
        )
      )
      .limit(20)

    // Generate effort estimate
    const effortEstimate = await estimateEffortWithAI(story, similarStories)

    // Save estimate
    const scoreId = generateId()
    await db.insert(effortScores).values({
      id: scoreId,
      organizationId,
      storyId,
      storyPoints: effortEstimate.storyPoints,
      confidence: effortEstimate.confidence,
      complexityFactors: effortEstimate.complexityFactors,
      similarStories: effortEstimate.similarStories as any,
      explanation: effortEstimate.explanation,
      tokensUsed: effortEstimate.tokensUsed,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await recordTokenUsage(organizationId, effortEstimate.tokensUsed, 'effort_estimation', false)

    // Track fair-usage token consumption
    await incrementTokenUsage(organizationId, effortEstimate.tokensUsed)

    return {
      storyId: story.id,
      storyTitle: story.title,
      effort: effortEstimate,
      tokensUsed: effortEstimate.tokensUsed,
      scoredAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error suggesting effort estimate:', error)
    throw error
  }
}

/**
 * Estimate effort using AI with similar story comparison
 */
async function estimateEffortWithAI(
  story: any,
  similarStories: any[]
): Promise<EffortEstimate & { tokensUsed: number }> {
  const similarStoriesContext = similarStories
    .filter((s) => s.estimatedEffort && s.estimatedEffort > 0)
    .slice(0, 10)
    .map((s) => `- "${s.title}": ${s.estimatedEffort} points`)
    .join('\n')

  const prompt = `You are an Agile estimation expert. Suggest a story point estimate for the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}
Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, i: number) => `${i + 1}. ${ac}`).join('\n') || 'N/A'}

Similar Stories (for reference):
${similarStoriesContext || 'No similar stories available'}

Story Point Scale (Fibonacci):
- 1: Trivial task, <1 hour
- 2: Simple task, 1-2 hours
- 3: Small story, 2-4 hours
- 5: Medium story, 1 day
- 8: Large story, 2-3 days
- 13: Very large story, ~1 week
- 21: Epic-sized, needs breakdown

Consider:
- Technical complexity
- Uncertainty and unknowns
- Dependencies
- Testing requirements
- Number and complexity of acceptance criteria

Respond in JSON format:
{
  "storyPoints": 5,
  "confidence": "medium",
  "complexityFactors": [
    "Multiple API integrations required",
    "Complex validation logic",
    "Extensive test coverage needed"
  ],
  "explanation": "Detailed reasoning for the estimate"
}

Be conservative with estimates. When in doubt, estimate higher.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  let parsedData
  try {
    const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
    parsedData = JSON.parse(jsonString.trim())
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI response. Please try again.')
  }

  return {
    ...parsedData,
    similarStories: [],
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

/**
 * Get scoring history for a story
 */
export async function getScoringHistory(
  storyId: string,
  organizationId: string
): Promise<any[]> {
  try {
    const impactHistory = await db
      .select()
      .from(impactScores)
      .where(
        and(
          eq(impactScores.storyId, storyId),
          eq(impactScores.organizationId, organizationId)
        )
      )
      .orderBy(desc(impactScores.createdAt))

    const effortHistory = await db
      .select()
      .from(effortScores)
      .where(
        and(
          eq(effortScores.storyId, storyId),
          eq(effortScores.organizationId, organizationId)
        )
      )
      .orderBy(desc(effortScores.createdAt))

    return [...impactHistory, ...effortHistory].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    console.error('Error fetching scoring history:', error)
    return []
  }
}
