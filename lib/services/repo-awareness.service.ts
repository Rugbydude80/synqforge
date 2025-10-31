import { db, generateId } from '@/lib/db'
import { gitIntegrations, prSummaries, stories, organizations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { openai, MODEL } from '@/lib/ai/client'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkAIRateLimit } from './ai-rate-limit.service'

/**
 * Convert model name to OpenRouter format
 */
function getOpenRouterModel(model: string): string {
  if (model.includes('/')) return model;
  if (model.startsWith('claude')) return `anthropic/${model}`;
  return model;
}

export interface PRSummary {
  prNumber: number
  title: string
  description: string
  filesChanged: number
  additions: number
  deletions: number
  summary: string
  keyChanges: string[]
  risks: string[]
  linkedStories: string[]
}

export interface DriftDetection {
  storyId: string
  storyTitle: string
  expectedBehaviour: string[]
  actualImplementation: string
  driftSeverity: 'low' | 'medium' | 'high'
  recommendations: string[]
}

/**
 * Connect GitHub/GitLab repository to organization
 */
export async function connectRepository(
  organizationId: string,
  provider: 'github' | 'gitlab',
  repoUrl: string,
  accessToken: string
): Promise<{ integrationId: string }> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization || organization.subscriptionTier !== 'enterprise') {
      throw new Error('Repo Awareness requires Enterprise plan.')
    }

    // Validate token by making a test API call
    const isValid = await validateRepoAccess(provider, repoUrl, accessToken)
    if (!isValid) {
      throw new Error('Invalid repository URL or access token.')
    }

    const integrationId = generateId()
    await db.insert(gitIntegrations).values({
      id: integrationId,
      organizationId,
      provider,
      repositoryUrl: repoUrl,
      accessToken, // In production, encrypt this!
      isActive: true,
      createdBy: organizationId, // TODO: Use actual userId
    })

    return { integrationId }
  } catch (error: any) {
    console.error('Error connecting repository:', error)
    throw error
  }
}

async function validateRepoAccess(
  provider: string,
  repoUrl: string,
  accessToken: string
): Promise<boolean> {
  // In production, make actual API calls to GitHub/GitLab
  // For now, basic validation
  return accessToken.length > 10 && (repoUrl.includes('github.com') || repoUrl.includes('gitlab.com'))
}

/**
 * Generate AI-powered PR summary
 */
export async function generatePRSummary(
  organizationId: string,
  integrationId: string,
  prData: {
    number: number
    title: string
    description: string
    diff: string
    filesChanged: string[]
    url?: string
    status?: string
  }
): Promise<PRSummary> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization || organization.subscriptionTier !== 'enterprise') {
      throw new Error('Repo Awareness requires Enterprise plan.')
    }

    const rateLimitCheck = await checkAIRateLimit(organizationId, organization.subscriptionTier)
    if (!rateLimitCheck.success) {
      throw new Error(`Rate limit exceeded.`)
    }

    const estimatedTokens = Math.min(prData.diff.length / 4, 8000)
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(`Insufficient AI tokens.`)
    }

    const summary = await generatePRSummaryWithAI(prData)

    // Save PR summary
    const summaryId = generateId()
    await db.insert(prSummaries).values({
      id: summaryId,
      organizationId,
      gitIntegrationId: integrationId,
      prNumber: prData.number,
      prTitle: prData.title,
      prUrl: prData.url || '',
      summary: summary.summary,
      filesChanged: prData.filesChanged.length,
      linesAdded: 0, // TODO: Calculate from prData.diff
      linesRemoved: 0, // TODO: Calculate from prData.diff
      status: prData.status || 'open',
      linkedStoryIds: summary.linkedStories || [],
      driftDetected: summary.risks && summary.risks.length > 0,
    })

    await recordTokenUsage(organizationId, summary.tokensUsed, 'pr_summary', false)

    return {
      prNumber: prData.number,
      title: prData.title,
      description: prData.description,
      filesChanged: prData.filesChanged.length,
      additions: 0, // Would be parsed from diff
      deletions: 0,
      summary: summary.summary,
      keyChanges: summary.keyChanges,
      risks: summary.risks,
      linkedStories: summary.linkedStories,
    }
  } catch (error: any) {
    console.error('Error generating PR summary:', error)
    throw error
  }
}

async function generatePRSummaryWithAI(prData: any): Promise<{
  summary: string
  keyChanges: string[]
  risks: string[]
  linkedStories: string[]
  tokensUsed: number
}> {
  const diffPreview = prData.diff.substring(0, 8000) // Limit for token constraints

  const prompt = `Analyze this Pull Request and provide a comprehensive summary.

PR Title: ${prData.title}
PR Description: ${prData.description}
Files Changed: ${prData.filesChanged.join(', ')}

Diff Preview:
${diffPreview}

Provide:
1. Executive summary (2-3 sentences)
2. Key changes (bullet points)
3. Potential risks or concerns
4. Related user stories (if mentioned in PR title/description)

Respond in JSON:
{
  "summary": "...",
  "keyChanges": ["..."],
  "risks": ["..."],
  "linkedStories": ["STORY-123"]
}`

  const response = await openai.chat.completions.create({
    model: getOpenRouterModel(MODEL),
    max_tokens: 2000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No text content')

  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  const jsonString = jsonMatch ? jsonMatch[1] : content
  const parsedData = JSON.parse(jsonString.trim())

  return {
    ...parsedData,
    tokensUsed: response.usage?.total_tokens || 0,
  }
}

/**
 * Detect drift between story AC and implementation
 */
export async function detectDrift(
  organizationId: string,
  storyId: string,
  commitMessages: string[],
  diffSummary: string
): Promise<DriftDetection> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization || organization.subscriptionTier !== 'enterprise') {
      throw new Error('Drift Detection requires Enterprise plan.')
    }

    const [story] = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
      .limit(1)

    if (!story) throw new Error('Story not found')

    const drift = await analyzeImplementationDrift(story, commitMessages, diffSummary)

    return drift
  } catch (error: any) {
    console.error('Error detecting drift:', error)
    throw error
  }
}

async function analyzeImplementationDrift(
  story: any,
  commitMessages: string[],
  diffSummary: string
): Promise<DriftDetection> {
  const prompt = `Analyze if the implementation drifted from the story requirements.

Story: ${story.title}
Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, i: number) => `${i + 1}. ${ac}`).join('\n')}

Implementation:
Commits: ${commitMessages.join(', ')}
Changes: ${diffSummary}

Detect:
1. Drift severity (low/medium/high)
2. Specific deviations from AC
3. Recommendations to align

Respond in JSON:
{
  "driftSeverity": "medium",
  "deviations": ["Implemented X but AC specified Y"],
  "recommendations": ["Update AC", "Modify implementation"]
}`

  const response = await openai.chat.completions.create({
    model: getOpenRouterModel(MODEL),
    max_tokens: 1500,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No text content')

  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  const jsonString = jsonMatch ? jsonMatch[1] : content
  const parsedData = JSON.parse(jsonString.trim())

  return {
    storyId: story.id,
    storyTitle: story.title,
    expectedBehaviour: story.acceptanceCriteria || [],
    actualImplementation: diffSummary,
    driftSeverity: parsedData.driftSeverity,
    recommendations: parsedData.recommendations || [],
  }
}

export async function getPRSummaries(organizationId: string, limit: number = 20) {
  return await db
    .select()
    .from(prSummaries)
    .where(eq(prSummaries.organizationId, organizationId))
    .orderBy(desc(prSummaries.createdAt))
    .limit(limit)
}
