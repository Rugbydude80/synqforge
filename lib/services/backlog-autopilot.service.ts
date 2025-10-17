import { db, generateId } from '@/lib/db'
import {
  autopilotJobs,
  epics,
  stories,
  organizations
} from '@/lib/db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkHeavyJobRateLimit } from './ai-rate-limit.service'
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Supported file types for ingestion
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
]

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export interface AutopilotJobInput {
  organizationId: string
  projectId: string
  userId: string
  documentContent: string
  documentName: string
  mimeType: string
  requireReview: boolean
}

export interface AutopilotJobResult {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  epicsCreated: number
  storiesCreated: number
  tasksCreated: number
  duplicatesDetected: number
  dependenciesDetected: number
  error?: string
}

export interface DuplicateDetection {
  existingStoryId: string
  existingTitle: string
  similarity: number
  mergeAction: 'skip' | 'merge' | 'create_new'
  diff?: {
    titleDiff: string
    descriptionDiff: string
  }
}

export interface DependencyMapping {
  sourceStoryId: string
  targetStoryId: string
  dependencyType: 'blocks' | 'relates_to' | 'implements'
  description: string
}

/**
 * Create a new Autopilot job
 */
export async function createAutopilotJob(
  input: AutopilotJobInput
): Promise<AutopilotJobResult> {
  try {
    // Validate file size and type
    if (input.mimeType && !SUPPORTED_MIME_TYPES.includes(input.mimeType)) {
      throw new Error('Unsupported file type. Please upload PDF, DOCX, Markdown, or plain text.')
    }

    // Get organization to check tier and rate limits
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Check if organization has access to Backlog Autopilot
    const tier = organization.subscriptionTier || 'free'
    if (tier === 'free') {
      throw new Error('Backlog Autopilot requires Team plan or higher. Please upgrade to continue.')
    }

    // Check heavy job rate limit
    const rateLimitCheck = await checkHeavyJobRateLimit(input.organizationId, tier)
    if (!rateLimitCheck.success) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds before trying again.`
      )
    }

    // Estimate token usage (rough estimate: 1 token per 4 chars)
    const estimatedTokens = Math.ceil(input.documentContent.length / 4) + 4000 // +4000 for response

    // Check fair-usage AI token limit (HARD BLOCK)
    const aiCheck = await canUseAI(input.organizationId, estimatedTokens)
    if (!aiCheck.allowed) {
      throw new Error(
        aiCheck.reason || 'AI token limit reached. Please upgrade your plan or wait until next month.'
      )
    }

    // Show 90% warning if approaching limit
    if (aiCheck.isWarning && aiCheck.reason) {
      console.warn(`Fair-usage warning for org ${input.organizationId}: ${aiCheck.reason}`)
    }

    // Legacy token check (keep for backward compatibility)
    const tokenCheck = await checkTokenAvailability(input.organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(
        tokenCheck.reason || `Insufficient AI tokens. This action requires approximately ${estimatedTokens} tokens. Please upgrade your plan or purchase additional tokens.`
      )
    }

    // Create job record
    const jobId = generateId()
    await db.insert(autopilotJobs).values({
      id: jobId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      userId: input.userId,
      status: 'queued',
      documentName: input.documentName,
      documentContent: input.documentContent,
      requireReview: input.requireReview,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Process job asynchronously
    processAutopilotJob(jobId).catch((error) => {
      console.error('Error processing autopilot job:', error)
    })

    return {
      jobId,
      status: 'queued',
      epicsCreated: 0,
      storiesCreated: 0,
      tasksCreated: 0,
      duplicatesDetected: 0,
      dependenciesDetected: 0,
    }
  } catch (error: any) {
    console.error('Error creating autopilot job:', error)
    throw error
  }
}

/**
 * Process an Autopilot job
 */
async function processAutopilotJob(jobId: string): Promise<void> {
  try {
    // Get job details
    const [job] = await db
      .select()
      .from(autopilotJobs)
      .where(eq(autopilotJobs.id, jobId))
      .limit(1)

    if (!job) {
      throw new Error('Job not found')
    }

    // Update status to processing
    await db
      .update(autopilotJobs)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(autopilotJobs.id, jobId))

    // Call Claude to generate epics and stories
    const result = await generateBacklogFromDocument(
      job.documentContent,
      job.organizationId,
      job.projectId
    )

    // Check for duplicates
    const duplicates = await detectDuplicates(
      result.stories,
      job.organizationId,
      job.projectId
    )

    // Detect dependencies
    const dependencies = await detectDependencies(result.stories)

    // If review is required, stage items
    if (job.requireReview) {
      await db
        .update(autopilotJobs)
        .set({
          status: 'pending_review',
          outputData: {
            epics: result.epics,
            stories: result.stories,
            tasks: result.tasks,
            duplicates,
            dependencies,
          },
          epicsCount: result.epics.length,
          storiesCount: result.stories.length,
          tasksCount: result.tasks.length,
          duplicatesCount: duplicates.length,
          dependenciesCount: dependencies.length,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(autopilotJobs.id, jobId))
    } else {
      // Publish items directly
      await publishAutopilotResults(jobId, result, duplicates, dependencies)
    }

    // Record token usage
    await recordTokenUsage(
      job.organizationId,
      result.tokensUsed,
      'backlog_autopilot',
      true
    )

    // Track fair-usage token consumption
    await incrementTokenUsage(job.organizationId, result.tokensUsed)
  } catch (error: any) {
    console.error('Error processing autopilot job:', error)

    // Update job with error
    await db
      .update(autopilotJobs)
      .set({
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(autopilotJobs.id, jobId))

    throw error
  }
}

/**
 * Generate backlog items from document using Claude
 */
async function generateBacklogFromDocument(
  documentContent: string,
  organizationId: string,
  projectId: string
): Promise<{
  epics: any[]
  stories: any[]
  tasks: any[]
  tokensUsed: number
}> {
  const prompt = `You are a product management AI assistant following the Universal User Story Generator framework. Analyze the following product requirements document (PRD) and generate production-ready user stories.

CRITICAL RULES - NEVER VIOLATE:
1. Document-Based Only: Generate ONLY what's explicitly described in the document. No invented features.
2. Source Tracking: Include [Source: Section/Page] references for every story.
3. Atomic Scenarios: ONE behaviour per AC. Max 2 ANDs per AC. Max 10 ACs per story.
4. UK English: Use "behaviour", "colour", "authorise", "organisation" etc.
5. Currency: Use £ (GBP) for all monetary values.
6. Testability: Each AC must be independently testable with clear pass/fail criteria.
7. WCAG 2.2 AA: All UI features must include accessibility requirements.

Document:
${documentContent}

STORY FORMAT (strictly follow):

**Title:** As a [persona], I want to [action], so that [benefit]

**Background/Context:**
[2-3 sentences explaining why this story exists, business value, and user need]

**Source Artefact:**
- Document: [filename/section]
- Page/Section: [specific location]
- Quote: "[exact quote from document]"

**Description:**
[Detailed explanation of what the feature does, written for developers]

**Acceptance Criteria:**
1. **GIVEN** [precondition] **WHEN** [action] **THEN** [expected outcome]
2. **GIVEN** [precondition] **WHEN** [action] **THEN** [expected outcome]
3. **GIVEN** [precondition] **WHEN** [action] **THEN** [expected outcome]
[Continue for all scenarios - max 10]

**Accessibility Requirements (WCAG 2.2 AA):**
- Keyboard navigation: [specific requirement]
- Screen reader: [specific requirement]
- Colour contrast: [specific requirement]
- Focus indicators: [specific requirement]

**Dependencies:**
- Depends on: [Story ID/title if applicable]
- Blocks: [Story ID/title if applicable]

**Out of Scope:**
- [What this story explicitly does NOT include]

**Notes:**
- [Technical considerations, edge cases, or clarifications]

JSON Response Format:
{
  "epics": [
    {
      "title": "Epic title",
      "description": "Epic description",
      "sourceArtefact": {
        "document": "filename",
        "section": "section name",
        "quote": "exact quote"
      },
      "stories": [
        {
          "title": "As a [persona], I want to [action], so that [benefit]",
          "background": "Why this story exists and its business value",
          "sourceArtefact": {
            "document": "filename",
            "section": "section/page",
            "quote": "exact quote from document"
          },
          "description": "Detailed explanation for developers",
          "acceptanceCriteria": [
            "**GIVEN** [precondition] **WHEN** [action] **THEN** [outcome]",
            "**GIVEN** [precondition] **WHEN** [action] **THEN** [outcome]"
          ],
          "accessibilityRequirements": [
            "Keyboard navigation: [requirement]",
            "Screen reader: [requirement]",
            "Colour contrast: WCAG AA compliant (4.5:1 for normal text)",
            "Focus indicators: visible on all interactive elements"
          ],
          "dependencies": ["Story title if applicable"],
          "outOfScope": ["What is NOT included"],
          "notes": ["Technical considerations"],
          "estimatedEffort": 5
        }
      ]
    }
  ]
}

VALIDATION CHECKLIST (apply to each story):
✓ Title uses "As a... I want... so that..." format
✓ At least 3 ACs, max 10 ACs
✓ Each AC is atomic (one behaviour only)
✓ Each AC uses **GIVEN** **WHEN** **THEN** with bold formatting
✓ Source artefact includes document, section, and exact quote
✓ Accessibility requirements included for UI features
✓ UK English spelling throughout
✓ GBP currency if monetary values mentioned
✓ No invented features - only what's in the document
✓ Each AC is independently testable

Focus on quality over quantity. Ensure each story is INVEST-compliant, production-ready, and traceable to source.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 16000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Extract JSON from response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  // Parse JSON response
  let parsedData
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
    parsedData = JSON.parse(jsonString.trim())
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI response. Please try again.')
  }

  // Transform into database-ready format
  const epicsData: any[] = []
  const storiesData: any[] = []
  const tasksData: any[] = []

  for (const epicData of parsedData.epics) {
    const epicId = generateId()

    // Format epic description with source artefact
    let epicDescription = epicData.description
    if (epicData.sourceArtefact) {
      epicDescription += `\n\n**Source Artefact:**\n- Document: ${epicData.sourceArtefact.document}\n- Section: ${epicData.sourceArtefact.section}\n- Quote: "${epicData.sourceArtefact.quote}"`
    }

    epicsData.push({
      id: epicId,
      title: epicData.title,
      description: epicDescription,
      stories: epicData.stories,
    })

    for (const storyData of epicData.stories) {
      const storyId = generateId()

      // Format full story description with all Universal User Story Generator fields
      let fullDescription = ''

      // Background/Context
      if (storyData.background) {
        fullDescription += `**Background/Context:**\n${storyData.background}\n\n`
      }

      // Source Artefact
      if (storyData.sourceArtefact) {
        fullDescription += `**Source Artefact:**\n`
        fullDescription += `- Document: ${storyData.sourceArtefact.document}\n`
        fullDescription += `- Page/Section: ${storyData.sourceArtefact.section}\n`
        fullDescription += `- Quote: "${storyData.sourceArtefact.quote}"\n\n`
      }

      // Main Description
      fullDescription += `**Description:**\n${storyData.description}\n\n`

      // Accessibility Requirements (if UI story)
      if (storyData.accessibilityRequirements && storyData.accessibilityRequirements.length > 0) {
        fullDescription += `**Accessibility Requirements (WCAG 2.2 AA):**\n`
        storyData.accessibilityRequirements.forEach((req: string) => {
          fullDescription += `- ${req}\n`
        })
        fullDescription += `\n`
      }

      // Out of Scope
      if (storyData.outOfScope && storyData.outOfScope.length > 0) {
        fullDescription += `**Out of Scope:**\n`
        storyData.outOfScope.forEach((item: string) => {
          fullDescription += `- ${item}\n`
        })
        fullDescription += `\n`
      }

      // Notes
      if (storyData.notes && storyData.notes.length > 0) {
        fullDescription += `**Notes:**\n`
        storyData.notes.forEach((note: string) => {
          fullDescription += `- ${note}\n`
        })
      }

      storiesData.push({
        id: storyId,
        epicId,
        title: storyData.title,
        description: fullDescription.trim(),
        acceptanceCriteria: storyData.acceptanceCriteria,
        estimatedEffort: storyData.estimatedEffort,
        dependencies: storyData.dependencies || [],
      })

      // Add tasks if present
      if (storyData.tasks) {
        for (const taskData of storyData.tasks) {
          tasksData.push({
            id: generateId(),
            storyId,
            title: taskData.title,
            description: taskData.description,
          })
        }
      }
    }
  }

  return {
    epics: epicsData,
    stories: storiesData,
    tasks: tasksData,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

/**
 * Detect duplicate stories using similarity analysis
 */
async function detectDuplicates(
  newStories: any[],
  organizationId: string,
  projectId: string
): Promise<DuplicateDetection[]> {
  // Get existing stories in the project
  const existingStories = await db
    .select({
      id: stories.id,
      title: stories.title,
      description: stories.description,
    })
    .from(stories)
    .where(
      and(
        eq(stories.organizationId, organizationId),
        eq(stories.projectId, projectId)
      )
    )

  const duplicates: DuplicateDetection[] = []

  // Simple similarity check (can be enhanced with embeddings later)
  for (const newStory of newStories) {
    for (const existing of existingStories) {
      const similarity = calculateTextSimilarity(
        newStory.title + ' ' + newStory.description,
        existing.title + ' ' + (existing.description || '')
      )

      if (similarity >= 0.7) {
        duplicates.push({
          existingStoryId: existing.id,
          existingTitle: existing.title,
          similarity,
          mergeAction: similarity >= 0.9 ? 'merge' : 'create_new',
          diff: {
            titleDiff: `Existing: "${existing.title}"\nNew: "${newStory.title}"`,
            descriptionDiff: `Existing: "${existing.description || 'N/A'}"\nNew: "${newStory.description}"`,
          },
        })
      }
    }
  }

  return duplicates
}

/**
 * Detect dependencies between stories
 */
async function detectDependencies(
  newStories: any[]
): Promise<DependencyMapping[]> {
  const dependencies: DependencyMapping[] = []

  // Look for cross-references in story titles and dependencies arrays
  for (const story of newStories) {
    if (story.dependencies && story.dependencies.length > 0) {
      for (const depRef of story.dependencies) {
        // Find matching story by title similarity
        const targetStory = newStories.find((s) => {
          const similarity = calculateTextSimilarity(s.title, depRef)
          return similarity > 0.6
        })

        if (targetStory) {
          dependencies.push({
            sourceStoryId: story.id,
            targetStoryId: targetStory.id,
            dependencyType: 'blocks',
            description: `Depends on: ${targetStory.title}`,
          })
        }
      }
    }
  }

  return dependencies
}

/**
 * Calculate text similarity using Jaccard similarity
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2)

  const words1 = new Set(normalize(text1))
  const words2 = new Set(normalize(text2))

  const intersection = new Set([...words1].filter((word) => words2.has(word)))
  const union = new Set([...words1, ...words2])

  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Publish autopilot results to the database
 */
async function publishAutopilotResults(
  jobId: string,
  result: {
    epics: any[]
    stories: any[]
    tasks: any[]
    tokensUsed: number
  },
  duplicates: DuplicateDetection[],
  dependencies: DependencyMapping[]
): Promise<void> {
  const [job] = await db
    .select()
    .from(autopilotJobs)
    .where(eq(autopilotJobs.id, jobId))
    .limit(1)

  if (!job) {
    throw new Error('Job not found')
  }

  // Insert epics
  for (const epic of result.epics) {
    await db.insert(epics).values({
      id: epic.id,
      organizationId: job.organizationId,
      projectId: job.projectId,
      title: epic.title,
      description: epic.description,
      status: 'planned',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Insert stories (excluding duplicates with merge action)
  for (const story of result.stories) {
    const isDuplicate = duplicates.find(
      (d) => d.mergeAction === 'merge' || d.mergeAction === 'skip'
    )

    if (!isDuplicate) {
      await db.insert(stories).values({
        id: story.id,
        organizationId: job.organizationId,
        projectId: job.projectId,
        epicId: story.epicId,
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        status: 'backlog',
        priority: 'medium',
        estimatedEffort: story.estimatedEffort,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  // Insert tasks
  for (const task of result.tasks) {
    await db.insert(tasks).values({
      id: task.id,
      organizationId: job.organizationId,
      storyId: task.storyId,
      title: task.title,
      description: task.description,
      status: 'todo',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Insert dependencies
  for (const dependency of dependencies) {
    await db.insert(storyDependencies).values({
      id: generateId(),
      organizationId: job.organizationId,
      sourceStoryId: dependency.sourceStoryId,
      targetStoryId: dependency.targetStoryId,
      dependencyType: dependency.dependencyType,
      description: dependency.description,
      createdAt: new Date(),
    })
  }

  // Update job status
  await db
    .update(autopilotJobs)
    .set({
      status: 'completed',
      outputData: {
        epics: result.epics,
        stories: result.stories,
        tasks: result.tasks,
        duplicates,
        dependencies,
      },
      epicsCount: result.epics.length,
      storiesCount: result.stories.length,
      tasksCount: result.tasks.length,
      duplicatesCount: duplicates.length,
      dependenciesCount: dependencies.length,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(autopilotJobs.id, jobId))
}

/**
 * Get autopilot job status
 */
export async function getAutopilotJob(
  jobId: string
): Promise<AutopilotJobResult | null> {
  const [job] = await db
    .select()
    .from(autopilotJobs)
    .where(eq(autopilotJobs.id, jobId))
    .limit(1)

  if (!job) {
    return null
  }

  return {
    jobId: job.id,
    status: job.status as any,
    epicsCreated: job.epicsCount || 0,
    storiesCreated: job.storiesCount || 0,
    tasksCreated: job.tasksCount || 0,
    duplicatesDetected: job.duplicatesCount || 0,
    dependenciesDetected: job.dependenciesCount || 0,
    error: job.errorMessage || undefined,
  }
}

/**
 * Retry a failed autopilot job
 */
export async function retryAutopilotJob(
  jobId: string
): Promise<AutopilotJobResult> {
  const [job] = await db
    .select()
    .from(autopilotJobs)
    .where(eq(autopilotJobs.id, jobId))
    .limit(1)

  if (!job) {
    throw new Error('Job not found')
  }

  if (job.status !== 'failed') {
    throw new Error('Only failed jobs can be retried')
  }

  // Reset job status
  await db
    .update(autopilotJobs)
    .set({
      status: 'queued',
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(autopilotJobs.id, jobId))

  // Process job
  processAutopilotJob(jobId).catch((error) => {
    console.error('Error retrying autopilot job:', error)
  })

  return {
    jobId: job.id,
    status: 'queued',
    epicsCreated: 0,
    storiesCreated: 0,
    tasksCreated: 0,
    duplicatesDetected: 0,
    dependenciesDetected: 0,
  }
}

/**
 * Approve and publish autopilot results from review queue
 */
export async function approveAutopilotJob(
  jobId: string,
  approvedStoryIds: string[]
): Promise<void> {
  const [job] = await db
    .select()
    .from(autopilotJobs)
    .where(eq(autopilotJobs.id, jobId))
    .limit(1)

  if (!job) {
    throw new Error('Job not found')
  }

  if (job.status !== 'pending_review') {
    throw new Error('Only jobs pending review can be approved')
  }

  if (!job.outputData) {
    throw new Error('No output data available')
  }

  const outputData = job.outputData as any

  // Filter stories based on approved IDs
  const approvedStories = outputData.stories.filter((s: any) =>
    approvedStoryIds.includes(s.id)
  )

  // Publish approved results
  await publishAutopilotResults(
    jobId,
    {
      epics: outputData.epics,
      stories: approvedStories,
      tasks: outputData.tasks.filter((t: any) =>
        approvedStories.some((s: any) => s.id === t.storyId)
      ),
      tokensUsed: 0,
    },
    outputData.duplicates || [],
    outputData.dependencies || []
  )
}

/**
 * List autopilot jobs for an organization
 */
export async function listAutopilotJobs(
  organizationId: string,
  limit: number = 20
): Promise<AutopilotJobResult[]> {
  const jobs = await db
    .select()
    .from(autopilotJobs)
    .where(eq(autopilotJobs.organizationId, organizationId))
    .orderBy(desc(autopilotJobs.createdAt))
    .limit(limit)

  return jobs.map((job) => ({
    jobId: job.id,
    status: job.status as any,
    epicsCreated: job.epicsCount || 0,
    storiesCreated: job.storiesCount || 0,
    tasksCreated: job.tasksCount || 0,
    duplicatesDetected: job.duplicatesCount || 0,
    dependenciesDetected: job.dependenciesCount || 0,
    error: job.errorMessage || undefined,
  }))
}
