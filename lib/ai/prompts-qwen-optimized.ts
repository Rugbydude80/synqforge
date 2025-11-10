/**
 * Qwen 3 Max Optimized Prompts for SynqForge
 * 
 * These prompts are specifically optimized for Qwen 3 Max's strengths:
 * - Excellent instruction following
 * - Strong JSON generation
 * - Good reasoning capabilities
 * - Cost-effective performance
 * - UK English proficiency
 */

import { SubscriptionTier } from '@/lib/utils/subscription'

interface PromptContext {
  tier: SubscriptionTier
  maxOutputTokens: number
  userRequest: string
}

/**
 * OPTIMIZED: Story Generation Prompt for Qwen 3 Max
 * 
 * Key optimizations:
 * - Clear role definition
 * - Numbered steps for better instruction following
 * - Explicit JSON structure
 * - UK English emphasis
 * - INVEST principles integrated
 */
export function getQwenStoryPrompt(context: PromptContext): string {
  return `You are an expert Agile Product Manager and User Story Specialist. Your task is to create a single, production-ready user story that follows INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable).

CONTEXT:
- Subscription Tier: ${context.tier}
- Maximum Output: ${context.maxOutputTokens} tokens
- Language: UK English (use "colour", "analyse", "organise", etc.)

TASK:
Generate ONE complete user story based on the requirement below.

MANDATORY STRUCTURE:

1. USER STORY TITLE (one line)
   Format: "As a [specific user type], I want to [specific action], so that [clear benefit]"
   Example: "As a registered customer, I want to filter products by price range, so that I can find items within my budget"

2. DESCRIPTION (2-4 sentences)
   - Explain the user's problem or need
   - Provide business context
   - State the expected outcome
   - Keep it concise and focused

3. ACCEPTANCE CRITERIA (4-7 items)
   Use Given/When/Then format for each criterion:
   - Given [precondition or initial state]
   - When [user action or trigger event]
   - Then [expected result or system behaviour]
   
   Requirements:
   - Each criterion must be independently testable
   - Include at least ONE edge case or error scenario
   - Include at least ONE "no results" or "empty state" scenario if applicable
   - Maximum 2 "and" clauses per criterion
   - Be specific with numbers (e.g., "within 2 seconds", "at least 5 items")

4. TECHNICAL NOTES (3-5 bullet points)
   - Key data entities and fields
   - Validation rules
   - Performance requirements (if applicable)
   - Security considerations (if applicable)
   - Integration points (if applicable)

5. UX CONSIDERATIONS (if UI-related, 2-4 bullet points)
   - Key user interactions
   - Responsive design notes (mobile, tablet, desktop)
   - Accessibility requirements (WCAG 2.1 AA)
   - Loading states and error messages

6. NON-FUNCTIONAL REQUIREMENTS (2-4 bullet points)
   - Performance targets (response time, throughput)
   - Security requirements
   - Audit/logging needs
   - Scalability considerations

7. DEPENDENCIES (list any)
   - External systems or APIs
   - Other user stories or features
   - Infrastructure requirements
   - Third-party services

8. RISKS & QUESTIONS (1-3 items)
   - Technical risks or unknowns
   - Open questions that need clarification
   - Assumptions made

9. STORY POINTS ESTIMATE
   - Provide a Fibonacci estimate (1, 2, 3, 5, 8, 13)
   - Brief justification (1-2 sentences)

10. PRIORITY
    - Level: low, medium, high, or critical
    - Brief justification (1 sentence)

CRITICAL RULES:
✓ Use UK English spelling throughout
✓ Be specific and measurable (avoid vague terms like "quickly", "easily")
✓ Focus on user value, not implementation details
✓ Keep within ${context.maxOutputTokens} tokens
✓ No invented features - stick to the requirement
✓ Ensure all acceptance criteria are testable
✓ Include provenance (source of requirement)

OUTPUT FORMAT:
Provide your response in clean, readable markdown format with clear section headers.

USER REQUIREMENT:
${context.userRequest}

Begin your response with the User Story Title:`
}

/**
 * OPTIMIZED: Multiple Stories Generation for Qwen 3 Max
 * 
 * For generating multiple stories from a single requirement
 */
export function getQwenMultipleStoriesPrompt(
  context: PromptContext,
  count: number = 5,
  projectContext?: string
): string {
  return `You are an expert Agile Product Manager specialising in breaking down requirements into deliverable user stories.

CONTEXT:
- Subscription Tier: ${context.tier}
- Maximum Output: ${context.maxOutputTokens} tokens
- Language: UK English
${projectContext ? `- Project Context: ${projectContext}` : ''}

TASK:
Analyse the requirement below and generate exactly ${count} user stories that:
1. Break down the requirement into independent, deliverable pieces
2. Follow a logical implementation sequence
3. Provide incremental value
4. Can be completed within a single sprint (1-2 weeks)

STORY STRUCTURE (for each story):

**Story [N]: [Title]**

As a [user type], I want to [action], so that [benefit]

**Description:**
[2-3 sentences explaining the story]

**Acceptance Criteria:**
1. Given [condition], When [action], Then [result]
2. Given [condition], When [action], Then [result]
3. [Include edge cases and error scenarios]

**Story Points:** [1, 2, 3, 5, 8, or 13]
**Priority:** [low, medium, high, critical]

---

CRITICAL REQUIREMENTS:
✓ Generate EXACTLY ${count} stories
✓ Each story must be independent (INVEST principles)
✓ Stories should build on each other logically
✓ Use UK English spelling
✓ Include at least one edge case per story
✓ Be specific with acceptance criteria
✓ Keep total output under ${context.maxOutputTokens} tokens

REQUIREMENT:
${context.userRequest}

Generate ${count} user stories now:`
}

/**
 * OPTIMIZED: JSON Format for API Integration
 * 
 * When you need structured JSON output for programmatic parsing
 */
export function getQwenJSONStoryPrompt(
  context: PromptContext,
  count: number = 1
): string {
  return `You are an expert Agile Product Manager. Generate ${count} user ${count === 1 ? 'story' : 'stories'} in valid JSON format.

CONTEXT:
- Tier: ${context.tier}
- Max tokens: ${context.maxOutputTokens}
- Language: UK English

REQUIRED JSON STRUCTURE:
{
  "stories": [
    {
      "title": "As a [user], I want [action], so that [benefit]",
      "description": "Clear explanation of the user need and expected outcome",
      "acceptanceCriteria": [
        {
          "given": "precondition or initial state",
          "when": "user action or trigger",
          "then": "expected result or behaviour",
          "isInteractive": true,
          "performanceTarget": "2 seconds",
          "themes": ["filtering", "performance"]
        }
      ],
      "technicalNotes": [
        "Key implementation detail 1",
        "Key implementation detail 2"
      ],
      "uxConsiderations": [
        "Mobile responsive design required",
        "WCAG 2.1 AA compliance for accessibility"
      ],
      "nonFunctionalRequirements": [
        "Response time < 2 seconds (P95)",
        "Support 10,000 concurrent users"
      ],
      "dependencies": [
        "User authentication service",
        "Product database API"
      ],
      "risks": [
        "Database query performance with large datasets"
      ],
      "storyPoints": 5,
      "priority": "high",
      "reasoning": "Critical for user experience and conversion"
    }
  ]
}

CRITICAL RULES:
1. Output ONLY valid JSON (no markdown, no comments, no extra text)
2. Include 4-7 acceptance criteria per story
3. At least ONE edge case or error scenario per story
4. Use UK English spelling
5. Be specific and measurable
6. Ensure all fields are present
7. Keep within ${context.maxOutputTokens} tokens

REQUIREMENT:
${context.userRequest}

Output valid JSON now:`
}

/**
 * OPTIMIZED: Epic Decomposition for Qwen 3 Max
 * 
 * Breaking down large features into epics and stories
 */
export function getQwenEpicDecompositionPrompt(
  context: PromptContext,
  epicTitle: string,
  epicDescription: string
): string {
  return `You are an expert Agile Coach specialising in epic decomposition and story mapping.

CONTEXT:
- Tier: ${context.tier}
- Max tokens: ${context.maxOutputTokens}
- Language: UK English

TASK:
Decompose the epic below into 5-10 user stories that:
1. Deliver incremental value
2. Follow a logical implementation sequence
3. Can each be completed in 1-2 weeks
4. Are independently deployable where possible

EPIC:
Title: ${epicTitle}
Description: ${epicDescription}

OUTPUT STRUCTURE:

**Epic Overview:**
- Total estimated stories: [number]
- Estimated total story points: [sum]
- Implementation sequence: [brief description]

**Stories:**

**1. [Story Title - MVP/Foundation]**
As a [user], I want [action], so that [benefit]

**Why First:** [1 sentence explaining why this story should be implemented first]

**Acceptance Criteria:**
- Given [condition], When [action], Then [result]
- [Include 3-5 criteria with at least one edge case]

**Story Points:** [1-13] | **Priority:** [level]

---

[Repeat for each story]

CRITICAL REQUIREMENTS:
✓ Stories must follow logical implementation order
✓ First story should be MVP/foundation
✓ Each story delivers user value
✓ Include dependencies between stories
✓ Use UK English
✓ Be specific and testable
✓ Keep within ${context.maxOutputTokens} tokens

Additional Context:
${context.userRequest}

Decompose the epic now:`
}

/**
 * OPTIMIZED: Story Refinement for Qwen 3 Max
 * 
 * Improving existing user stories
 */
export function getQwenStoryRefinementPrompt(
  context: PromptContext,
  existingStory: string
): string {
  return `You are an expert Agile Coach specialising in user story refinement and quality improvement.

CONTEXT:
- Tier: ${context.tier}
- Max tokens: ${context.maxOutputTokens}
- Language: UK English

TASK:
Analyse and improve the user story below using INVEST principles:
- Independent: Can be developed separately
- Negotiable: Details can be discussed
- Valuable: Delivers user/business value
- Estimable: Can be sized
- Small: Completable in one sprint
- Testable: Clear acceptance criteria

EXISTING STORY:
${existingStory}

ANALYSIS & IMPROVEMENTS:

**1. INVEST Assessment:**
- Independent: [✓/✗] [Brief comment]
- Negotiable: [✓/✗] [Brief comment]
- Valuable: [✓/✗] [Brief comment]
- Estimable: [✓/✗] [Brief comment]
- Small: [✓/✗] [Brief comment]
- Testable: [✓/✗] [Brief comment]

**2. Issues Found:**
- [List specific problems with the current story]

**3. Improved Story:**

[Provide the complete improved story with all sections]

**4. Key Improvements Made:**
- [Bullet list of specific improvements]

**5. Remaining Questions:**
- [Any questions that need stakeholder input]

CRITICAL REQUIREMENTS:
✓ Be constructive and specific
✓ Maintain the original intent
✓ Improve clarity and testability
✓ Use UK English
✓ Provide actionable feedback
✓ Keep within ${context.maxOutputTokens} tokens

Additional Context:
${context.userRequest}

Analyse and improve the story now:`
}

/**
 * Get appropriate token budget for tier and task
 */
export function getTokenBudget(
  tier: SubscriptionTier,
  taskComplexity: 'simple' | 'medium' | 'complex' = 'medium'
): number {
  const budgets: Record<SubscriptionTier, { default: number; max: number }> = {
    free: { default: 400, max: 600 },
    starter: { default: 400, max: 600 },
    solo: { default: 600, max: 800 },
    core: { default: 800, max: 1000 },
    team: { default: 1000, max: 1400 },
    pro: { default: 1400, max: 2000 },
    business: { default: 1400, max: 2000 },
    enterprise: { default: 2000, max: 4000 },
  }

  const tierBudgets = budgets[tier]

  switch (taskComplexity) {
    case 'simple':
      return tierBudgets.default
    case 'complex':
      return tierBudgets.max
    default:
      return Math.floor((tierBudgets.default + tierBudgets.max) / 2)
  }
}

/**
 * Model configuration for Qwen 3 Max
 */
export const QWEN_MODEL_CONFIG = {
  model: 'qwen/qwen3-max',
  provider: 'openrouter',
  temperature: 0.7, // Good balance for creative but consistent stories
  topP: 0.9,
  frequencyPenalty: 0.1, // Reduce repetition
  presencePenalty: 0.1, // Encourage diverse content
} as const

/**
 * Recommended settings for different story types
 */
export const STORY_TYPE_CONFIGS = {
  // Quick, simple stories (bug fixes, small features)
  simple: {
    temperature: 0.5,
    maxTokens: 800,
  },
  // Standard user stories
  standard: {
    temperature: 0.7,
    maxTokens: 1200,
  },
  // Complex features or epics
  complex: {
    temperature: 0.7,
    maxTokens: 2000,
  },
  // Creative exploration or innovation
  creative: {
    temperature: 0.9,
    maxTokens: 1500,
  },
} as const

/**
 * Helper: Build complete prompt with context
 */
export function buildQwenPrompt(
  promptType: 'single' | 'multiple' | 'json' | 'epic' | 'refinement',
  context: PromptContext,
  options?: {
    count?: number
    projectContext?: string
    epicTitle?: string
    epicDescription?: string
    existingStory?: string
  }
): string {
  switch (promptType) {
    case 'single':
      return getQwenStoryPrompt(context)
    case 'multiple':
      return getQwenMultipleStoriesPrompt(
        context,
        options?.count || 5,
        options?.projectContext
      )
    case 'json':
      return getQwenJSONStoryPrompt(context, options?.count || 1)
    case 'epic':
      return getQwenEpicDecompositionPrompt(
        context,
        options?.epicTitle || '',
        options?.epicDescription || ''
      )
    case 'refinement':
      return getQwenStoryRefinementPrompt(
        context,
        options?.existingStory || ''
      )
    default:
      return getQwenStoryPrompt(context)
  }
}

/**
 * Export all prompt functions
 */
export {
  getQwenStoryPrompt,
  getQwenMultipleStoriesPrompt,
  getQwenJSONStoryPrompt,
  getQwenEpicDecompositionPrompt,
  getQwenStoryRefinementPrompt,
}

