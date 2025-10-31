import { db, generateId } from '@/lib/db'
import {
  acValidationRules,
  acValidationResults,
  stories,
  organizations,
} from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { openai, MODEL } from '@/lib/ai/client'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkAIRateLimit } from './ai-rate-limit.service'
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards'

/**
 * Convert model name to OpenRouter format
 */
function getOpenRouterModel(model: string): string {
  if (model.includes('/')) return model;
  if (model.startsWith('claude')) return `anthropic/${model}`;
  return model;
}

// Default validation rules
const DEFAULT_RULES = [
  {
    name: 'Given-When-Then Format',
    description: 'Each AC should follow the Given-When-Then format',
    severity: 'error' as const,
    enabled: true,
  },
  {
    name: 'Testability',
    description: 'Each AC must be testable with clear pass/fail criteria',
    severity: 'error' as const,
    enabled: true,
  },
  {
    name: 'Independence',
    description: 'ACs should not depend on other ACs or external state',
    severity: 'warning' as const,
    enabled: true,
  },
  {
    name: 'Specificity',
    description: 'ACs should be specific and avoid vague terms like "should work well"',
    severity: 'warning' as const,
    enabled: true,
  },
  {
    name: 'Completeness',
    description: 'Story should have at least 3 acceptance criteria covering happy path, edge cases, and errors',
    severity: 'warning' as const,
    enabled: true,
  },
  {
    name: 'No Implementation Details',
    description: 'ACs should describe behavior, not implementation (avoid "using", "via", "by calling")',
    severity: 'info' as const,
    enabled: true,
  },
  {
    name: 'User-Centric Language',
    description: 'ACs should focus on user outcomes, not system internals',
    severity: 'info' as const,
    enabled: true,
  },
]

export interface ValidationRule {
  id?: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
  customPrompt?: string
}

export interface ValidationIssue {
  ruleId: string
  ruleName: string
  severity: 'error' | 'warning' | 'info'
  message: string
  acceptanceCriterionIndex: number
  originalText: string
  suggestedFix?: string
  autoFixable: boolean
}

export interface ValidationResult {
  validationId: string
  storyId: string
  storyTitle: string
  overallStatus: 'pass' | 'fail' | 'warning'
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  issues: ValidationIssue[]
  tokensUsed: number
  validatedAt: Date
}

/**
 * Get validation rules for an organization (or defaults)
 */
export async function getValidationRules(
  organizationId: string
): Promise<ValidationRule[]> {
  try {
    const rules = await db
      .select()
      .from(acValidationRules)
      .where(eq(acValidationRules.organizationId, organizationId))
      .orderBy(acValidationRules.createdAt)

    if (rules.length === 0) {
      // Return default rules
      return DEFAULT_RULES
    }

    return rules.map((rule) => ({
      id: rule.id,
      name: rule.ruleName,
      description: rule.ruleConfig?.description || rule.ruleName,
      severity: (rule.ruleConfig?.severity as 'error' | 'warning' | 'info') || 'warning',
      enabled: rule.ruleConfig?.enabled !== false,
      customPrompt: rule.ruleConfig?.customPrompt || undefined,
    }))
  } catch (error) {
    console.error('Error fetching validation rules:', error)
    return DEFAULT_RULES
  }
}

/**
 * Create or update validation rules for an organization
 */
export async function saveValidationRules(
  organizationId: string,
  rules: ValidationRule[]
): Promise<void> {
  try {
    // Delete existing rules
    await db
      .delete(acValidationRules)
      .where(eq(acValidationRules.organizationId, organizationId))

    // Insert new rules
    for (const rule of rules) {
      await db.insert(acValidationRules).values({
        id: generateId(),
        organizationId,
        createdBy: organizationId, // Use org ID as placeholder
        ruleName: rule.name,
        ruleType: 'custom' as any, // Map to a rule type
        ruleConfig: {
          description: rule.description,
          severity: rule.severity,
          enabled: rule.enabled,
          customPrompt: rule.customPrompt || null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  } catch (error) {
    console.error('Error saving validation rules:', error)
    throw new Error('Failed to save validation rules')
  }
}

/**
 * Validate acceptance criteria for a story
 */
export async function validateStoryAC(
  storyId: string,
  organizationId: string,
  autoFix: boolean = false
): Promise<ValidationResult> {
  try {
    // Get organization to check tier and rate limits
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Check if organization has access to AC Validator
    const tier = organization.subscriptionTier || 'starter' // Free tier is 'starter' in database
    if (tier === 'starter') {
      throw new Error('AC Validator requires Team plan or higher. Please upgrade to continue.')
    }

    // Check rate limit
    // Admin users get enterprise rate limits
    const effectiveTier = tier === 'admin' ? 'enterprise' : tier
    const rateLimitCheck = await checkAIRateLimit(organizationId, effectiveTier)
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

    // Get validation rules
    const rules = await getValidationRules(organizationId)
    const enabledRules = rules.filter((rule) => rule.enabled)

    if (enabledRules.length === 0) {
      throw new Error('No validation rules enabled. Please configure validation rules first.')
    }

    // Estimate token usage
    const estimatedTokens = 3000 // AC validation is relatively lightweight

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
        tokenCheck.reason || 'Insufficient AI tokens. Please upgrade your plan or purchase additional tokens.'
      )
    }

    // Validate using Claude
    const validationResult = await performValidation(
      story,
      enabledRules,
      autoFix
    )

    // Save validation result
    const validationId = generateId()
    const overallScore = validationResult.overallStatus === 'pass' ? 100 :
                        validationResult.overallStatus === 'warning' ? 75 :
                        50 - (validationResult.errors * 10)

    await db.insert(acValidationResults).values({
      id: validationId,
      organizationId,
      storyId,
      overallScore: Math.max(0, overallScore),
      passedRules: [],
      failedRules: validationResult.issues,
      suggestions: validationResult.issues.map(i => i.message),
      autoFixAvailable: autoFix && validationResult.issues.some(i => i.autoFixable),
      createdAt: new Date(),
    })

    // Record token usage
    await recordTokenUsage(
      organizationId,
      validationResult.tokensUsed,
      'ac_validator',
      false
    )

    // Track fair-usage token consumption
    await incrementTokenUsage(organizationId, validationResult.tokensUsed)

    // If auto-fix is enabled and there are fixable issues, update the story
    if (autoFix && validationResult.issues.some((issue) => issue.autoFixable)) {
      const fixedAC = applyAutoFixes(
        story.acceptanceCriteria || [],
        validationResult.issues
      )

      await db
        .update(stories)
        .set({
          acceptanceCriteria: fixedAC,
          updatedAt: new Date(),
        })
        .where(eq(stories.id, storyId))
    }

    return {
      ...validationResult,
      validationId,
      storyId: story.id,
      storyTitle: story.title,
    }
  } catch (error: any) {
    console.error('Error validating story AC:', error)
    throw error
  }
}

/**
 * Perform validation using Claude
 */
async function performValidation(
  story: any,
  rules: ValidationRule[],
  autoFix: boolean
): Promise<Omit<ValidationResult, 'validationId' | 'storyId' | 'storyTitle'>> {
  const acceptanceCriteria = story.acceptanceCriteria || []

  if (acceptanceCriteria.length === 0) {
    return {
      overallStatus: 'fail',
      totalIssues: 1,
      errors: 1,
      warnings: 0,
      infos: 0,
      issues: [
        {
          ruleId: 'no-ac',
          ruleName: 'Missing Acceptance Criteria',
          severity: 'error',
          message: 'Story has no acceptance criteria defined',
          acceptanceCriterionIndex: -1,
          originalText: '',
          autoFixable: false,
        },
      ],
      tokensUsed: 0,
      validatedAt: new Date(),
    }
  }

  const rulesPrompt = rules
    .map(
      (rule) =>
        `- ${rule.name} (${rule.severity}): ${rule.description}${rule.customPrompt ? `\n  Custom instructions: ${rule.customPrompt}` : ''}`
    )
    .join('\n')

  const prompt = `You are a quality assurance AI for user story acceptance criteria. Validate the following acceptance criteria against the provided rules.

Story Title: ${story.title}
Story Description: ${story.description || 'N/A'}

Acceptance Criteria:
${acceptanceCriteria.map((ac: string, index: number) => `${index + 1}. ${ac}`).join('\n')}

Validation Rules:
${rulesPrompt}

Please analyze each acceptance criterion and identify any issues. For each issue:
1. Identify which rule is violated
2. Specify the severity (error, warning, info)
3. Provide a clear explanation of the issue
4. Indicate which AC is affected (by index, 1-based)
5. ${autoFix ? 'Provide a suggested fix in proper Given-When-Then format' : 'Indicate if auto-fix is possible'}

Respond in JSON format:
{
  "overallStatus": "pass" | "fail" | "warning",
  "issues": [
    {
      "ruleId": "rule-name-kebab-case",
      "ruleName": "Rule Name",
      "severity": "error" | "warning" | "info",
      "message": "Clear explanation of the issue",
      "acceptanceCriterionIndex": 1,
      "originalText": "The original AC text",
      "suggestedFix": "Fixed version in Given-When-Then format (if auto-fix possible)",
      "autoFixable": true | false
    }
  ]
}

Rules:
- overallStatus is "fail" if any errors found, "warning" if only warnings/info found, "pass" if no issues
- Be specific about which AC has issues
- Provide actionable feedback
- suggestedFix should be complete, well-formatted Given-When-Then statements${autoFix ? ' (required for all fixable issues)' : ''}
- Only mark as autoFixable if you can provide a complete, correct fix`

  const response = await openai.chat.completions.create({
    model: getOpenRouterModel(MODEL),
    max_tokens: 4000,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Extract JSON from response
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No text content in AI response')
  }

  let parsedData
  try {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : content
    parsedData = JSON.parse(jsonString.trim())
  } catch {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse AI response. Please try again.')
  }

  // Count issues by severity
  const errors = parsedData.issues.filter((i: any) => i.severity === 'error').length
  const warnings = parsedData.issues.filter((i: any) => i.severity === 'warning').length
  const infos = parsedData.issues.filter((i: any) => i.severity === 'info').length

  return {
    overallStatus: parsedData.overallStatus,
    totalIssues: parsedData.issues.length,
    errors,
    warnings,
    infos,
    issues: parsedData.issues,
    tokensUsed: response.usage?.total_tokens || 0,
    validatedAt: new Date(),
  }
}

/**
 * Apply auto-fixes to acceptance criteria
 */
function applyAutoFixes(
  originalAC: string[],
  issues: ValidationIssue[]
): string[] {
  const fixedAC = [...originalAC]

  // Sort issues by index (descending) to avoid index shifting
  const sortedIssues = [...issues]
    .filter((issue) => issue.autoFixable && issue.suggestedFix)
    .sort((a, b) => b.acceptanceCriterionIndex - a.acceptanceCriterionIndex)

  for (const issue of sortedIssues) {
    const index = issue.acceptanceCriterionIndex - 1 // Convert to 0-based
    if (index >= 0 && index < fixedAC.length && issue.suggestedFix) {
      fixedAC[index] = issue.suggestedFix
    }
  }

  return fixedAC
}

/**
 * Validate multiple stories in batch
 */
export async function validateMultipleStories(
  storyIds: string[],
  organizationId: string,
  autoFix: boolean = false
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  for (const storyId of storyIds) {
    try {
      const result = await validateStoryAC(storyId, organizationId, autoFix)
      results.push(result)
    } catch (error: any) {
      console.error(`Error validating story ${storyId}:`, error)
      // Continue with other stories
      results.push({
        validationId: generateId(),
        storyId,
        storyTitle: 'Unknown',
        overallStatus: 'fail',
        totalIssues: 1,
        errors: 1,
        warnings: 0,
        infos: 0,
        issues: [
          {
            ruleId: 'validation-error',
            ruleName: 'Validation Error',
            severity: 'error',
            message: error.message || 'Failed to validate story',
            acceptanceCriterionIndex: -1,
            originalText: '',
            autoFixable: false,
          },
        ],
        tokensUsed: 0,
        validatedAt: new Date(),
      })
    }
  }

  return results
}

/**
 * Get validation history for a story
 */
export async function getValidationHistory(
  storyId: string,
  organizationId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const history = await db
      .select()
      .from(acValidationResults)
      .where(
        and(
          eq(acValidationResults.storyId, storyId),
          eq(acValidationResults.organizationId, organizationId)
        )
      )
      .orderBy(desc(acValidationResults.createdAt))
      .limit(limit)

    return history
  } catch (error) {
    console.error('Error fetching validation history:', error)
    return []
  }
}

/**
 * Get validation statistics for an organization
 */
export async function getValidationStats(
  organizationId: string,
  _projectId?: string
): Promise<{
  totalValidations: number
  storiesValidated: number
  averageIssuesPerStory: number
  errorRate: number
  warningRate: number
  autoFixRate: number
}> {
  try {
    // This would be more efficient with proper SQL aggregation
    // For now, we'll fetch and calculate in memory
    const query = db
      .select()
      .from(acValidationResults)
      .where(eq(acValidationResults.organizationId, organizationId))

    const results = await query

    if (results.length === 0) {
      return {
        totalValidations: 0,
        storiesValidated: 0,
        averageIssuesPerStory: 0,
        errorRate: 0,
        warningRate: 0,
        autoFixRate: 0,
      }
    }

    const uniqueStories = new Set(results.map((r) => r.storyId))
    const totalIssues = results.reduce((sum, r) => {
      const failed = r.failedRules as any
      return sum + (Array.isArray(failed) ? failed.length : 0)
    }, 0)
    const errorsCount = results.filter((r) => r.overallScore < 50).length
    const warningsCount = results.filter((r) => r.overallScore >= 50 && r.overallScore < 100).length
    const autoFixCount = results.filter((r) => r.autoFixAvailable).length

    return {
      totalValidations: results.length,
      storiesValidated: uniqueStories.size,
      averageIssuesPerStory: results.length > 0 ? totalIssues / results.length : 0,
      errorRate: results.length > 0 ? errorsCount / results.length : 0,
      warningRate: results.length > 0 ? warningsCount / results.length : 0,
      autoFixRate: results.length > 0 ? autoFixCount / results.length : 0,
    }
  } catch (error) {
    console.error('Error fetching validation stats:', error)
    return {
      totalValidations: 0,
      storiesValidated: 0,
      averageIssuesPerStory: 0,
      errorRate: 0,
      warningRate: 0,
      autoFixRate: 0,
    }
  }
}

/**
 * Reset validation rules to defaults
 */
export async function resetValidationRules(organizationId: string): Promise<void> {
  await db
    .delete(acValidationRules)
    .where(eq(acValidationRules.organizationId, organizationId))

  await saveValidationRules(organizationId, DEFAULT_RULES)
}
