import { db, generateId } from '@/lib/db'
import {
  testArtefacts,
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

export type ArtefactType = 'gherkin' | 'postman' | 'playwright' | 'cypress'

export interface GenerateArtefactRequest {
  storyId: string
  organizationId: string
  artefactType: ArtefactType
  options?: {
    includeEdgeCases?: boolean
    includeErrorScenarios?: boolean
    baseUrl?: string
    authentication?: 'none' | 'bearer' | 'apikey' | 'oauth'
    language?: 'typescript' | 'javascript'
  }
}

export interface GeneratedArtefact {
  id: string
  storyId: string
  artefactType: ArtefactType
  content: string
  fileName: string
  tokensUsed: number
  generatedAt: Date
  version: number
}

/**
 * Generate test artefact from story acceptance criteria
 */
export async function generateTestArtefact(
  request: GenerateArtefactRequest
): Promise<GeneratedArtefact> {
  try {
    const { storyId, organizationId, artefactType, options = {} } = request

    // Get organization to check tier and rate limits
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Check if organization has access to Test Generation
    const tier = organization.subscriptionTier
    if (tier === 'free') {
      throw new Error('Test & Artefact Generation requires Team plan or higher. Please upgrade to continue.')
    }

    // Check rate limit
    const rateLimitCheck = await checkAIRateLimit(organizationId, tier || 'free')
    if (!rateLimitCheck.success) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds before trying again.`
      )
    }

    // Get story
    const [story] = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
      .limit(1)

    if (!story) {
      throw new Error('Story not found')
    }

    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      throw new Error('Story must have acceptance criteria to generate test artefacts')
    }

    // Estimate token usage
    const estimatedTokens = 4000 // Test generation can be complex

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
        `Insufficient AI tokens. ${tokenCheck.reason || 'Please upgrade your plan or purchase additional tokens.'}`
      )
    }

    // Generate artefact based on type
    let content: string
    let tokensUsed: number
    let fileName: string

    switch (artefactType) {
      case 'gherkin':
        ({ content, tokensUsed, fileName } = await generateGherkin(story, options))
        break
      case 'postman':
        ({ content, tokensUsed, fileName } = await generatePostman(story, options))
        break
      case 'playwright':
        ({ content, tokensUsed, fileName } = await generatePlaywright(story, options))
        break
      case 'cypress':
        ({ content, tokensUsed, fileName } = await generateCypress(story, options))
        break
      default:
        throw new Error(`Unsupported artefact type: ${artefactType}`)
    }

    // Get current version for this story and type
    const existingArtefacts = await db
      .select()
      .from(testArtefacts)
      .where(
        and(
          eq(testArtefacts.storyId, storyId),
          eq(testArtefacts.artefactType, artefactType)
        )
      )
      .orderBy(desc(testArtefacts.createdAt))
      .limit(1)

    const version = existingArtefacts.length + 1

    // Save artefact
    const artefactId = generateId()
    await db.insert(testArtefacts).values({
      id: artefactId,
      organizationId,
      storyId,
      artefactType,
      content,
      fileName,
      linkedAcIds: [],
      metadata: { version },
      generatedBy: organizationId, // TODO: Pass actual userId
    })

    // Record token usage
    await recordTokenUsage(organizationId, tokensUsed, 'test_generation', false)

    // Track fair-usage token consumption
    await incrementTokenUsage(organizationId, tokensUsed)

    return {
      id: artefactId,
      storyId,
      artefactType,
      content,
      fileName,
      tokensUsed,
      generatedAt: new Date(),
      version,
    }
  } catch (error: any) {
    console.error('Error generating test artefact:', error)
    throw error
  }
}

/**
 * Generate Gherkin feature file
 */
async function generateGherkin(
  story: any,
  options: any
): Promise<{ content: string; tokensUsed: number; fileName: string }> {
  const prompt = `You are a BDD (Behaviour-Driven Development) expert. Generate a comprehensive Gherkin feature file from the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}

Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, index: number) => `${index + 1}. ${ac}`).join('\n')}

Requirements:
1. Create a Feature with clear business value description
2. Generate at least one Scenario per acceptance criterion
3. Use proper Given-When-Then format
4. ${options.includeEdgeCases ? 'Include edge case scenarios with Scenario Outline where appropriate' : 'Focus on happy path scenarios'}
5. ${options.includeErrorScenarios ? 'Include error/negative scenarios' : 'Skip error scenarios'}
6. Use realistic example data
7. Follow Gherkin best practices (declarative, business-focused language)
8. Include Background steps if there are common preconditions

Provide a complete, production-ready Gherkin feature file.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  // Extract Gherkin from code blocks if present
  const gherkinMatch = textContent.text.match(/```(?:gherkin|feature)?\s*([\s\S]*?)```/)
  const content = gherkinMatch ? gherkinMatch[1].trim() : textContent.text.trim()

  // Generate filename from story title
  const fileName = story.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + '.feature'

  return {
    content,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    fileName,
  }
}

/**
 * Generate Postman collection
 */
async function generatePostman(
  story: any,
  options: any
): Promise<{ content: string; tokensUsed: number; fileName: string }> {
  const baseUrl = options.baseUrl || '{{baseUrl}}'
  const auth = options.authentication || 'bearer'

  const prompt = `You are an API testing expert. Generate a Postman Collection v2.1 JSON from the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}

Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, index: number) => `${index + 1}. ${ac}`).join('\n')}

Requirements:
1. Create a complete Postman Collection v2.1 JSON
2. Use base URL: ${baseUrl}
3. Authentication type: ${auth}
4. Create at least one request per acceptance criterion
5. Include realistic request bodies, query parameters, and headers
6. Add test scripts to validate responses (status codes, response body)
7. ${options.includeEdgeCases ? 'Include edge case requests (boundary values, special characters)' : 'Focus on standard cases'}
8. ${options.includeErrorScenarios ? 'Include error scenarios (401, 404, 400, 500)' : 'Focus on success scenarios (200, 201)'}
9. Use Postman variables where appropriate ({{variable}})
10. Add descriptive names and documentation for each request

Provide ONLY the valid JSON for the Postman collection, no additional text.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  // Extract JSON from code blocks if present
  const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  const jsonString = jsonMatch ? jsonMatch[1] : textContent.text

  // Validate JSON
  try {
    const parsed = JSON.parse(jsonString.trim())
    const content = JSON.stringify(parsed, null, 2)

    const fileName = story.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + '.postman_collection.json'

    return {
      content,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      fileName,
    }
  } catch (error) {
    console.error('Failed to parse Postman collection JSON:', jsonString, error)
    throw new Error('Failed to generate valid Postman collection JSON')
  }
}

/**
 * Generate Playwright test
 */
async function generatePlaywright(
  story: any,
  options: any
): Promise<{ content: string; tokensUsed: number; fileName: string }> {
  const language = options.language || 'typescript'
  const baseUrl = options.baseUrl || 'http://localhost:3000'

  const prompt = `You are a Playwright testing expert. Generate a Playwright test file from the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}

Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, index: number) => `${index + 1}. ${ac}`).join('\n')}

Requirements:
1. Language: ${language}
2. Base URL: ${baseUrl}
3. Create at least one test per acceptance criterion
4. Use descriptive test names that match the AC
5. Include proper page object patterns where appropriate
6. Use modern Playwright best practices (await, expect from @playwright/test)
7. ${options.includeEdgeCases ? 'Include edge case tests' : 'Focus on happy path tests'}
8. ${options.includeErrorScenarios ? 'Include error scenario tests' : 'Skip error scenarios'}
9. Add comments explaining complex interactions
10. Use proper selectors (data-testid preferred, then role/label, avoid CSS selectors)
11. Include assertions that verify the acceptance criteria

Provide complete, runnable Playwright test code.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  // Extract code from code blocks if present
  const codeMatch = textContent.text.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/)
  const content = codeMatch ? codeMatch[1].trim() : textContent.text.trim()

  const extension = language === 'typescript' ? '.spec.ts' : '.spec.js'
  const fileName = story.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + extension

  return {
    content,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    fileName,
  }
}

/**
 * Generate Cypress test
 */
async function generateCypress(
  story: any,
  options: any
): Promise<{ content: string; tokensUsed: number; fileName: string }> {
  const language = options.language || 'javascript'
  const baseUrl = options.baseUrl || 'http://localhost:3000'

  const prompt = `You are a Cypress testing expert. Generate a Cypress test file from the following user story.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}

Acceptance Criteria:
${(story.acceptanceCriteria || []).map((ac: string, index: number) => `${index + 1}. ${ac}`).join('\n')}

Requirements:
1. Language: ${language}
2. Base URL: ${baseUrl}
3. Create at least one test per acceptance criterion
4. Use descriptive test names that match the AC
5. Use Cypress best practices (cy.get(), cy.should(), cy.intercept())
6. ${options.includeEdgeCases ? 'Include edge case tests' : 'Focus on happy path tests'}
7. ${options.includeErrorScenarios ? 'Include error scenario tests' : 'Skip error scenarios'}
8. Add comments explaining complex interactions
9. Use proper selectors (data-cy preferred, then data-testid, avoid brittle selectors)
10. Include assertions that verify the acceptance criteria
11. Use beforeEach for common setup if needed

Provide complete, runnable Cypress test code.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  // Extract code from code blocks if present
  const codeMatch = textContent.text.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/)
  const content = codeMatch ? codeMatch[1].trim() : textContent.text.trim()

  const extension = language === 'typescript' ? '.cy.ts' : '.cy.js'
  const fileName = story.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + extension

  return {
    content,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    fileName,
  }
}

/**
 * Get test artefacts for a story
 */
export async function getStoryArtefacts(
  storyId: string,
  organizationId: string,
  artefactType?: ArtefactType
): Promise<GeneratedArtefact[]> {
  try {
    const whereConditions = artefactType
      ? and(
          eq(testArtefacts.storyId, storyId),
          eq(testArtefacts.organizationId, organizationId),
          eq(testArtefacts.artefactType, artefactType)
        )
      : and(
          eq(testArtefacts.storyId, storyId),
          eq(testArtefacts.organizationId, organizationId)
        )

    const artefacts = await db
      .select()
      .from(testArtefacts)
      .where(whereConditions)
      .orderBy(desc(testArtefacts.createdAt))

    return artefacts.map((artefact) => ({
      id: artefact.id,
      storyId: artefact.storyId,
      artefactType: artefact.artefactType as ArtefactType,
      content: artefact.content,
      fileName: artefact.fileName,
      tokensUsed: (artefact.metadata as any)?.tokensUsed || 0,
      generatedAt: artefact.createdAt || new Date(),
      version: (artefact.metadata as any)?.version || 1,
    }))
  } catch (error) {
    console.error('Error fetching story artefacts:', error)
    return []
  }
}

/**
 * Get a specific artefact by ID
 */
export async function getArtefactById(
  artefactId: string,
  organizationId: string
): Promise<GeneratedArtefact | null> {
  try {
    const [artefact] = await db
      .select()
      .from(testArtefacts)
      .where(
        and(
          eq(testArtefacts.id, artefactId),
          eq(testArtefacts.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!artefact) {
      return null
    }

    return {
      id: artefact.id,
      storyId: artefact.storyId,
      artefactType: artefact.artefactType as ArtefactType,
      content: artefact.content,
      fileName: artefact.fileName,
      tokensUsed: (artefact.metadata as any)?.tokensUsed || 0,
      generatedAt: artefact.createdAt || new Date(),
      version: (artefact.metadata as any)?.version || 1,
    }
  } catch (error) {
    console.error('Error fetching artefact:', error)
    return null
  }
}

/**
 * Delete an artefact
 */
export async function deleteArtefact(
  artefactId: string,
  organizationId: string
): Promise<void> {
  await db
    .delete(testArtefacts)
    .where(
      and(
        eq(testArtefacts.id, artefactId),
        eq(testArtefacts.organizationId, organizationId)
      )
    )
}

/**
 * Generate multiple artefacts for a story (batch)
 */
export async function generateMultipleArtefacts(
  storyId: string,
  organizationId: string,
  artefactTypes: ArtefactType[],
  options: any = {}
): Promise<GeneratedArtefact[]> {
  const results: GeneratedArtefact[] = []

  for (const artefactType of artefactTypes) {
    try {
      const result = await generateTestArtefact({
        storyId,
        organizationId,
        artefactType,
        options,
      })
      results.push(result)
    } catch (error: any) {
      console.error(`Error generating ${artefactType}:`, error)
      // Continue with other artefacts
    }
  }

  return results
}

/**
 * Get generation statistics for an organization
 */
export async function getGenerationStats(
  organizationId: string
): Promise<{
  totalArtefacts: number
  byType: Record<ArtefactType, number>
  totalTokensUsed: number
}> {
  try {
    const artefacts = await db
      .select()
      .from(testArtefacts)
      .where(eq(testArtefacts.organizationId, organizationId))

    const byType: Record<ArtefactType, number> = {
      gherkin: 0,
      postman: 0,
      playwright: 0,
      cypress: 0,
    }

    let totalTokensUsed = 0

    for (const artefact of artefacts) {
      byType[artefact.artefactType as ArtefactType] =
        (byType[artefact.artefactType as ArtefactType] || 0) + 1
      totalTokensUsed += (artefact.metadata as any)?.tokensUsed || 0
    }

    return {
      totalArtefacts: artefacts.length,
      byType,
      totalTokensUsed,
    }
  } catch (error) {
    console.error('Error fetching generation stats:', error)
    return {
      totalArtefacts: 0,
      byType: { gherkin: 0, postman: 0, playwright: 0, cypress: 0 },
      totalTokensUsed: 0,
    }
  }
}
