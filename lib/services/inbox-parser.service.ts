import { db } from '@/lib/db'
import { inboxParsing, organizations } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkAIRateLimit } from './ai-rate-limit.service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export interface ParsedContent {
  decisions: Array<{ decision: string; reasoning: string; participants: string[] }>
  actions: Array<{ action: string; owner?: string; dueDate?: string }>
  risks: Array<{ risk: string; severity: 'low' | 'medium' | 'high'; mitigation?: string }>
  suggestedStories: Array<{
    title: string
    description: string
    acceptanceCriteria: string[]
    priority: 'low' | 'medium' | 'high' | 'critical'
  }>
}

export async function parseInboxContent(
  organizationId: string,
  projectId: string,
  source: 'slack' | 'teams' | 'email',
  content: string,
  _metadata?: { channel?: string; threadId?: string; from?: string }
): Promise<{ parsed: ParsedContent; storiesCreated: number; tokensUsed: number }> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization || organization.subscriptionTier === 'free') {
      throw new Error('Inbox to Backlog requires Team plan or higher.')
    }

    const rateLimitCheck = await checkAIRateLimit(organizationId, organization.subscriptionTier || 'free')
    if (!rateLimitCheck.success) {
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)}s.`)
    }

    const estimatedTokens = Math.min(content.length / 2, 5000)
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(`Insufficient AI tokens.`)
    }

    const parsed = await parseWithAI(content, source)

    // TODO: Fix schema mismatch - inbox parsing insert disabled temporarily
    // const parseId = generateId()
    // await db.insert(inboxParsing).values({...})

    await recordTokenUsage(organizationId, parsed.tokensUsed, 'inbox_parsing', false)

    return {
      parsed: parsed,
      storiesCreated: 0, // Would create stories if autoCreate option is enabled
      tokensUsed: parsed.tokensUsed,
    }
  } catch (error: any) {
    console.error('Error parsing inbox content:', error)
    throw error
  }
}

async function parseWithAI(
  content: string,
  source: string
): Promise<ParsedContent & { tokensUsed: number }> {
  const prompt = `Parse the following ${source} conversation and extract:
1. Decisions made (with reasoning and participants)
2. Action items (with owners and due dates if mentioned)
3. Risks identified (with severity and mitigation if mentioned)
4. Suggested user stories based on the discussion

Content:
${content}

Respond in JSON format:
{
  "decisions": [{"decision": "...", "reasoning": "...", "participants": ["..."]}],
  "actions": [{"action": "...", "owner": "...", "dueDate": "..."}],
  "risks": [{"risk": "...", "severity": "medium", "mitigation": "..."}],
  "suggestedStories": [{
    "title": "As a ... I want ... So that ...",
    "description": "...",
    "acceptanceCriteria": ["Given... When... Then..."],
    "priority": "medium"
  }]
}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('No text content')

  const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
  const parsedData = JSON.parse(jsonString.trim())

  return {
    ...parsedData,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

export async function getParsingHistory(organizationId: string, limit: number = 20) {
  return await db
    .select()
    .from(inboxParsing)
    .where(eq(inboxParsing.organizationId, organizationId))
    .orderBy(desc(inboxParsing.createdAt))
    .limit(limit)
}
