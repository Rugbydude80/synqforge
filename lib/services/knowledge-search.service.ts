import { db, generateId } from '@/lib/db'
import { knowledgeSearches, stories, organizations } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkAIRateLimit } from './ai-rate-limit.service'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface SearchResult {
  id: string
  type: 'story' | 'commit' | 'spec' | 'doc'
  title: string
  content: string
  similarity: number
  citation: {
    source: string
    url?: string
    author?: string
    date: Date
  }
}

export interface KnowledgeSearchResult {
  query: string
  results: SearchResult[]
  answer: string
  citations: string[]
  tokensUsed: number
  searchedAt: Date
}

/**
 * Perform semantic search across knowledge base
 */
export async function semanticSearch(
  organizationId: string,
  query: string,
  filters?: {
    types?: Array<'story' | 'commit' | 'spec' | 'doc'>
    projectId?: string
    dateFrom?: Date
    dateTo?: Date
  }
): Promise<KnowledgeSearchResult> {
  try {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    const tier = organization.subscriptionTier || 'free'
    if (!['business', 'enterprise'].includes(tier)) {
      throw new Error('Knowledge Search requires Business plan or higher. Please upgrade to continue.')
    }

    const rateLimitCheck = await checkAIRateLimit(organizationId, tier)
    if (!rateLimitCheck.success) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds.`
      )
    }

    const estimatedTokens = 4000
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(`Insufficient AI tokens. You have ${tokenCheck.tokensAvailable} remaining.`)
    }

    // In a production system, you'd use vector embeddings with pgvector
    // For this implementation, we'll use AI to search through stories
    const searchResults = await performAISearch(query, organizationId, filters)

    // Save search
    const searchId = generateId()
    await db.insert(knowledgeSearches).values({
      id: searchId,
      organizationId,
      userId: organizationId, // Using organizationId as placeholder
      query,
      results: searchResults.results,
      resultCount: searchResults.results?.length || 0,
    })

    await recordTokenUsage(organizationId, searchResults.tokensUsed, 'knowledge_search', false)

    return {
      ...searchResults,
      searchedAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error performing semantic search:', error)
    throw error
  }
}

async function performAISearch(
  query: string,
  organizationId: string,
  filters?: any
): Promise<Omit<KnowledgeSearchResult, 'searchedAt'>> {
  // Get stories as knowledge base
  const whereConditions = [eq(stories.organizationId, organizationId)]
  if (filters?.projectId) {
    whereConditions.push(eq(stories.projectId, filters.projectId))
  }

  const knowledgeBase = await db
    .select()
    .from(stories)
    .where(and(...whereConditions))
    .limit(50)

  const context = knowledgeBase
    .map((story) => `[${story.id}] ${story.title}: ${story.description?.substring(0, 200) || ''}`)
    .join('\n')

  const prompt = `You are a knowledge search assistant. Search through the following knowledge base and answer the user's query with citations.

Query: ${query}

Knowledge Base:
${context}

Instructions:
1. Find the most relevant information to answer the query
2. Provide a comprehensive answer
3. Include citations with IDs [ID] for all sources used
4. Rank results by relevance

Respond in JSON format:
{
  "answer": "Comprehensive answer with inline citations [ID]",
  "results": [
    {
      "id": "story-id",
      "type": "story",
      "title": "Story title",
      "content": "Relevant excerpt",
      "similarity": 0.95
    }
  ],
  "citations": ["[story-id] Story title"]
}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    temperature: 0.2,
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
  } catch {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI response.')
  }

  return {
    query,
    results: parsedData.results.map((r: any) => ({
      ...r,
      citation: {
        source: r.title,
        date: new Date(),
      },
    })),
    answer: parsedData.answer,
    citations: parsedData.citations,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

export async function getSearchHistory(
  organizationId: string,
  limit: number = 20
): Promise<any[]> {
  return await db
    .select()
    .from(knowledgeSearches)
    .where(eq(knowledgeSearches.organizationId, organizationId))
    .orderBy(desc(knowledgeSearches.createdAt))
    .limit(limit)
}
