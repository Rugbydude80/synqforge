/**
 * Journey-Aware AI Prompts for SynqForge
 * 
 * This module provides context-aware prompts that adapt based on:
 * - User journey (document upload, text description, epic context, split story, etc.)
 * - Context level (Minimal, Standard, Comprehensive, Thinking)
 * - User tier (Starter, Core, Pro, Team, Enterprise)
 * - Custom templates (if user has uploaded their own)
 * 
 * Optimized for Qwen 3 Max via OpenRouter
 */

import { ContextLevel, UserTier } from '@/lib/types/context.types';

// ============================================================================
// JOURNEY TYPES
// ============================================================================

export enum UserJourney {
  // Primary story generation journeys
  TEXT_DESCRIPTION = 'text_description',           // User pastes/types requirements
  DOCUMENT_UPLOAD = 'document_upload',             // User uploads PDF/DOCX/TXT/MD
  EPIC_CONTEXT = 'epic_context',                   // Generating within an epic (uses semantic search)
  STORY_SPLIT = 'story_split',                     // Splitting an existing story
  
  // Advanced journeys
  REFINEMENT = 'refinement',                       // User is refining/regenerating
  BULK_GENERATION = 'bulk_generation',             // Generating multiple stories at once
  SINGLE_STORY = 'single_story',                   // Quick single story generation
  
  // Template-based
  CUSTOM_TEMPLATE = 'custom_template',             // User has selected a custom template
  STANDARD_TEMPLATE = 'standard_template',         // Using built-in templates
}

// ============================================================================
// PROMPT CONTEXT INTERFACE
// ============================================================================

export interface JourneyPromptContext {
  journey: UserJourney;
  contextLevel: ContextLevel;
  userTier: UserTier;
  
  // Optional context
  customTemplateFormat?: string;                   // From custom template parser
  epicContext?: string;                            // Similar stories from epic
  documentType?: 'pdf' | 'docx' | 'txt' | 'md';   // For document uploads
  storyCount?: number;                             // For bulk generation
  parentStory?: {                                  // For story splitting
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
  
  // User preferences
  language?: 'en-GB' | 'en-US';                    // Default: en-GB
  tone?: 'formal' | 'casual' | 'technical';        // Default: formal
  maxOutputTokens?: number;                        // Token budget
}

// ============================================================================
// QWEN 3 MAX OPTIMIZED BASE PROMPTS
// ============================================================================

/**
 * Base system prompt optimized for Qwen 3 Max
 * Qwen 3 Max characteristics:
 * - Excels at structured output and JSON
 * - Strong reasoning capabilities
 * - Better with explicit instructions than implicit
 * - Responds well to numbered steps and clear formatting
 */
const QWEN_BASE_SYSTEM = `You are SynqForge AI, an expert product manager and agile coach specializing in creating INVEST-compliant user stories.

CORE PRINCIPLES:
1. **INVEST Compliance**: Stories must be Independent, Negotiable, Valuable, Estimable, Small, Testable
2. **UK English**: Use British spelling (behaviour, colour, organise, analyse, etc.)
3. **Precision**: Be specific, actionable, and unambiguous
4. **Traceability**: Every acceptance criterion must trace to the story goal
5. **Realism**: Never invent features or make assumptions beyond the requirements

OUTPUT FORMAT:
Generate stories in this exact JSON structure:
{
  "stories": [
    {
      "title": "As a [persona], I want [capability], so that [outcome]",
      "description": "Detailed context and background (3-5 sentences)",
      "acceptanceCriteria": [
        "Given [context], When [action], Then [outcome]",
        "Given [context], When [action], Then [outcome]"
      ],
      "priority": "low" | "medium" | "high" | "critical",
      "storyPoints": 1 | 2 | 3 | 5 | 8 | 13,
      "reasoning": "Brief explanation of complexity and priority",
      "dependencies": ["Optional: list of dependencies"],
      "risks": ["Optional: list of risks or open questions"]
    }
  ]
}

ACCEPTANCE CRITERIA RULES:
- Use Given/When/Then format (Gherkin-style)
- Maximum 10 criteria per story
- Maximum 2 "and" per criterion
- Each criterion must be independently testable
- No vague terms like "should work" or "must be good"

STORY POINTS GUIDE:
- 1 point: < 2 hours, trivial change
- 2 points: 2-4 hours, simple feature
- 3 points: 4-8 hours, moderate complexity
- 5 points: 1-2 days, complex feature
- 8 points: 2-3 days, very complex
- 13 points: > 3 days, consider splitting

PRIORITY GUIDE:
- **Critical**: Blocking, security, data loss prevention
- **High**: Core functionality, user-facing features
- **Medium**: Important but not urgent
- **Low**: Nice-to-have, polish, minor improvements`;

// ============================================================================
// JOURNEY-SPECIFIC PROMPT ENHANCEMENTS
// ============================================================================

const JOURNEY_ENHANCEMENTS: Record<UserJourney, string> = {
  [UserJourney.TEXT_DESCRIPTION]: `
JOURNEY CONTEXT: User has provided a text description of requirements.

APPROACH:
1. Parse the requirements carefully for key features and user needs
2. Identify distinct user personas and their goals
3. Break down into logical, independent stories
4. Ensure each story delivers standalone value
5. Look for implicit requirements (e.g., error handling, validation)

QUALITY CHECKS:
- Does each story have a clear user benefit?
- Are stories independent enough to be delivered separately?
- Have you captured edge cases and error scenarios?
- Are acceptance criteria comprehensive but not excessive?`,

  [UserJourney.DOCUMENT_UPLOAD]: `
JOURNEY CONTEXT: User has uploaded a document containing requirements.

APPROACH:
1. Extract structured information from the document
2. Preserve the document's organization and hierarchy
3. Identify sections, features, and requirements
4. Maintain traceability to document sections
5. Handle both formal specs and informal notes

QUALITY CHECKS:
- Have you covered all major sections of the document?
- Are you maintaining the document's intended priority/sequence?
- Have you noted any ambiguities or missing information?
- Are you preserving technical terminology from the document?

PROVENANCE:
- Reference document sections in the "reasoning" field
- Example: "Based on Section 3.2: User Authentication"`,

  [UserJourney.EPIC_CONTEXT]: `
JOURNEY CONTEXT: User is generating a story within an epic that already has existing stories.

APPROACH:
1. Review the similar stories provided in the context
2. Maintain consistency with existing story patterns
3. Use similar terminology, structure, and acceptance criteria format
4. Ensure the new story complements (not duplicates) existing stories
5. Align priority and story points with similar stories

CONSISTENCY CHECKS:
- Does this story use the same persona names as existing stories?
- Are acceptance criteria formatted the same way?
- Is the level of detail consistent?
- Does it fill a gap or extend functionality logically?

CONTEXT LEARNING:
- The similar stories show the team's preferred style
- Match their level of technical detail
- Use their naming conventions and terminology`,

  [UserJourney.STORY_SPLIT]: `
JOURNEY CONTEXT: User is splitting an existing story that's too large.

APPROACH:
1. Review the parent story's title, description, and acceptance criteria
2. Identify logical split points (by feature, persona, or workflow)
3. Ensure 100% acceptance criteria coverage across child stories
4. Each child story must be independently valuable
5. Maintain the parent story's intent and scope

SPLITTING RULES:
- Total child story points should equal or slightly exceed parent
- Each child must have 3-8 acceptance criteria (not too small)
- No orphaned acceptance criteria
- No duplicate acceptance criteria across children
- Each child should be deliverable in < 3 days

QUALITY CHECKS:
- Can each child story be tested independently?
- Does each child deliver user value on its own?
- Have you maintained the parent's priority context?
- Are dependencies between children clearly noted?`,

  [UserJourney.REFINEMENT]: `
JOURNEY CONTEXT: User is refining or regenerating previously generated stories.

APPROACH:
1. Understand what was wrong with the previous version
2. Focus on improving clarity, specificity, and testability
3. Maintain the core intent while enhancing quality
4. Add missing edge cases or acceptance criteria
5. Improve story points accuracy based on feedback

REFINEMENT FOCUS:
- More specific acceptance criteria
- Better persona definition
- Clearer user benefit
- More accurate story points
- Better dependency identification`,

  [UserJourney.BULK_GENERATION]: `
JOURNEY CONTEXT: User is generating multiple stories at once from comprehensive requirements.

APPROACH:
1. Identify distinct features and group related functionality
2. Ensure stories are properly sequenced (dependencies)
3. Balance story sizes (mix of 1, 2, 3, 5 point stories)
4. Create a logical delivery order
5. Look for opportunities to group into epics

BULK QUALITY CHECKS:
- Are stories independent enough to be reordered?
- Is there a good mix of story sizes?
- Have you identified cross-story dependencies?
- Are priorities distributed appropriately?
- Could any stories be combined or split?

EPIC SUGGESTIONS:
- If generating 5+ related stories, suggest epic groupings
- Example: "Authentication Epic: Stories 1-4"`,

  [UserJourney.SINGLE_STORY]: `
JOURNEY CONTEXT: User is quickly generating a single story.

APPROACH:
1. Focus on clarity and completeness
2. Ensure the story is immediately actionable
3. Provide comprehensive acceptance criteria
4. Include realistic story points
5. Note any obvious dependencies or risks

QUALITY CHECKS:
- Is this story small enough to complete in one sprint?
- Are acceptance criteria specific and testable?
- Is the user benefit clear and valuable?
- Have you noted any technical risks?`,

  [UserJourney.CUSTOM_TEMPLATE]: `
JOURNEY CONTEXT: User has selected a custom template.

APPROACH:
1. Strictly follow the custom template format provided
2. Match the template's section structure exactly
3. Use the template's terminology and style
4. Respect any custom fields or metadata
5. Maintain the template's acceptance criteria format

TEMPLATE COMPLIANCE:
- The custom template format is provided separately
- Follow it precisely - this is the user's preferred format
- If the template conflicts with INVEST principles, prioritize the template
- Maintain the template's language, tone, and structure`,

  [UserJourney.STANDARD_TEMPLATE]: `
JOURNEY CONTEXT: User is using a built-in SynqForge template.

APPROACH:
1. Follow the selected template's guidelines
2. Templates include: Standard, Lean-Agile, BDD-Compliance, Enterprise
3. Each template has specific formatting and focus areas
4. Maintain consistency with the template's philosophy

TEMPLATE AWARENESS:
- Standard: Balanced, general-purpose
- Lean-Agile: Minimal, fast-paced
- BDD-Compliance: Strict Given/When/Then
- Enterprise: Formal, comprehensive, audit-ready`,
};

// ============================================================================
// CONTEXT LEVEL ENHANCEMENTS
// ============================================================================

const CONTEXT_LEVEL_ENHANCEMENTS: Record<ContextLevel, string> = {
  [ContextLevel.MINIMAL]: `
CONTEXT LEVEL: Minimal (Starter Tier)

OUTPUT CONSTRAINTS:
- Maximum 500 tokens per story
- Focus on core story elements only
- Minimal description (2-3 sentences)
- 3-5 acceptance criteria maximum
- Brief reasoning (1 sentence)
- No optional fields (dependencies, risks)

SPEED OPTIMIZATION:
- Prioritize speed over comprehensiveness
- Skip edge cases unless critical
- Use concise language`,

  [ContextLevel.STANDARD]: `
CONTEXT LEVEL: Standard (Core+ Tier)

OUTPUT CONSTRAINTS:
- Maximum 800 tokens per story
- Balanced detail level
- Description: 3-5 sentences
- 5-8 acceptance criteria
- Include reasoning and dependencies
- Note major risks only

QUALITY FOCUS:
- Cover main use cases and 1-2 edge cases
- Include basic error handling
- Provide realistic story points`,

  [ContextLevel.COMPREHENSIVE]: `
CONTEXT LEVEL: Comprehensive (Pro+ Tier)

OUTPUT CONSTRAINTS:
- Maximum 1200 tokens per story
- Detailed, production-ready stories
- Description: 5-7 sentences with full context
- 7-10 acceptance criteria
- Include all optional fields
- Comprehensive risk analysis

QUALITY FOCUS:
- Cover all edge cases and error scenarios
- Include security and performance considerations
- Detailed dependency mapping
- Consider UX and accessibility
- Note non-functional requirements

SMART CONTEXT:
- If similar stories are provided, learn from them
- Maintain consistency with existing patterns
- Use established terminology and conventions`,

  [ContextLevel.COMPREHENSIVE_THINKING]: `
CONTEXT LEVEL: Comprehensive + Deep Reasoning (Team+ Tier)

OUTPUT CONSTRAINTS:
- Maximum 1500 tokens per story
- Enterprise-grade, audit-ready stories
- Description: 7-10 sentences with full context and rationale
- 8-10 acceptance criteria with edge cases
- Comprehensive dependencies, risks, and assumptions
- Include technical considerations and architectural notes

DEEP REASONING:
- Analyze requirements from multiple perspectives
- Consider long-term maintainability
- Identify hidden complexity and technical debt risks
- Suggest architectural patterns or approaches
- Note compliance and regulatory considerations
- Consider team capacity and skill requirements

QUALITY FOCUS:
- Production-ready, no ambiguity
- Cover all edge cases, error scenarios, and failure modes
- Include security, performance, scalability, accessibility
- Detailed dependency and integration analysis
- Risk mitigation strategies
- Testing strategy notes

SMART CONTEXT:
- Deep learning from similar stories
- Identify patterns and anti-patterns
- Suggest improvements to existing stories
- Maintain architectural consistency`,
};

// ============================================================================
// TIER-SPECIFIC GUIDANCE
// ============================================================================

const TIER_GUIDANCE: Record<UserTier, string> = {
  [UserTier.STARTER]: `
USER TIER: Starter (Free)
- Focus on speed and simplicity
- Single story generation only
- Minimal context level
- 25 AI actions/month limit`,

  [UserTier.CORE]: `
USER TIER: Core (Solo Freelancer)
- Balanced quality and speed
- Multiple story generation available
- Standard context level
- 400 AI actions/month + 20% rollover`,

  [UserTier.PRO]: `
USER TIER: Pro (Small Team)
- High quality, production-ready stories
- Smart Context with semantic search
- Comprehensive context level
- 800 AI actions/month + 20% rollover`,

  [UserTier.TEAM]: `
USER TIER: Team (Larger Agile Team)
- Enterprise-grade stories
- Deep Reasoning mode available
- Comprehensive + Thinking context level
- 10,000+ pooled AI actions/month`,

  [UserTier.ENTERPRISE]: `
USER TIER: Enterprise (Custom)
- Maximum quality and detail
- All features available
- Custom department budgets
- Unlimited AI actions`,
};

// ============================================================================
// MAIN PROMPT BUILDER
// ============================================================================

/**
 * Build a journey-aware prompt optimized for Qwen 3 Max
 */
export function buildJourneyPrompt(
  context: JourneyPromptContext,
  requirements: string
): { systemPrompt: string; userPrompt: string } {
  
  // Start with base system prompt
  let systemPrompt = QWEN_BASE_SYSTEM;
  
  // Add journey-specific enhancement
  systemPrompt += '\n\n' + JOURNEY_ENHANCEMENTS[context.journey];
  
  // Add context level enhancement
  systemPrompt += '\n\n' + CONTEXT_LEVEL_ENHANCEMENTS[context.contextLevel];
  
  // Add tier guidance
  systemPrompt += '\n\n' + TIER_GUIDANCE[context.userTier];
  
  // Add custom template format if provided (highest priority)
  if (context.customTemplateFormat) {
    systemPrompt += '\n\n' + context.customTemplateFormat;
    systemPrompt += '\n\nIMPORTANT: The custom template format above takes precedence over standard formatting.';
  }
  
  // Add language preference
  if (context.language === 'en-US') {
    systemPrompt += '\n\nLANGUAGE: Use US English spelling (behavior, color, organize, analyze, etc.)';
  }
  
  // Add tone preference
  if (context.tone) {
    systemPrompt += `\n\nTONE: Use a ${context.tone} tone throughout the stories.`;
  }
  
  // Add token budget
  if (context.maxOutputTokens) {
    systemPrompt += `\n\nTOKEN BUDGET: Maximum ${context.maxOutputTokens} tokens total. Be concise.`;
  }
  
  // Build user prompt based on journey
  let userPrompt = buildUserPrompt(context, requirements);
  
  return { systemPrompt, userPrompt };
}

/**
 * Build the user prompt based on journey context
 */
function buildUserPrompt(
  context: JourneyPromptContext,
  requirements: string
): string {
  let prompt = '';
  
  // Add epic context if available (for semantic search)
  if (context.epicContext) {
    prompt += '## SIMILAR STORIES IN THIS EPIC:\n\n';
    prompt += context.epicContext;
    prompt += '\n\nUse these stories as examples for consistency in terminology, format, and level of detail.\n\n';
  }
  
  // Add parent story context if splitting
  if (context.parentStory) {
    prompt += '## PARENT STORY TO SPLIT:\n\n';
    prompt += `**Title:** ${context.parentStory.title}\n\n`;
    prompt += `**Description:** ${context.parentStory.description}\n\n`;
    prompt += `**Acceptance Criteria:**\n`;
    context.parentStory.acceptanceCriteria.forEach((ac, i) => {
      prompt += `${i + 1}. ${ac}\n`;
    });
    prompt += '\n\nSplit this story into smaller, independent stories that cover all acceptance criteria.\n\n';
  }
  
  // Add document type context
  if (context.documentType) {
    prompt += `## DOCUMENT TYPE: ${context.documentType.toUpperCase()}\n\n`;
    prompt += 'The following content was extracted from an uploaded document. Preserve its structure and organization.\n\n';
  }
  
  // Add story count guidance for bulk generation
  if (context.storyCount && context.storyCount > 1) {
    prompt += `## STORY COUNT: Generate exactly ${context.storyCount} user stories\n\n`;
    prompt += 'Ensure stories are properly prioritized and sequenced.\n\n';
  }
  
  // Add the main requirements
  prompt += '## REQUIREMENTS:\n\n';
  prompt += requirements;
  
  // Add journey-specific instructions
  switch (context.journey) {
    case UserJourney.EPIC_CONTEXT:
      prompt += '\n\nEnsure the new story complements the existing stories and maintains consistency.';
      break;
    case UserJourney.STORY_SPLIT:
      prompt += '\n\nEnsure 100% acceptance criteria coverage across all child stories.';
      break;
    case UserJourney.BULK_GENERATION:
      prompt += '\n\nGroup related stories and suggest epic organization if appropriate.';
      break;
    case UserJourney.DOCUMENT_UPLOAD:
      prompt += '\n\nMaintain traceability to document sections in the reasoning field.';
      break;
  }
  
  // Add output format reminder
  prompt += '\n\n---\n\nGenerate the stories in valid JSON format as specified in the system prompt.';
  
  return prompt;
}

// ============================================================================
// JOURNEY DETECTION HELPER
// ============================================================================

/**
 * Detect the user journey based on API request context
 */
export function detectJourney(requestContext: {
  epicId?: string;
  documentId?: string;
  parentStoryId?: string;
  customTemplateId?: string;
  promptTemplate?: string;
  storyCount?: number;
}): UserJourney {
  // Priority order matters here
  if (requestContext.parentStoryId) {
    return UserJourney.STORY_SPLIT;
  }
  
  if (requestContext.customTemplateId) {
    return UserJourney.CUSTOM_TEMPLATE;
  }
  
  if (requestContext.epicId) {
    return UserJourney.EPIC_CONTEXT;
  }
  
  if (requestContext.documentId) {
    return UserJourney.DOCUMENT_UPLOAD;
  }
  
  if (requestContext.promptTemplate) {
    return UserJourney.STANDARD_TEMPLATE;
  }
  
  if (requestContext.storyCount && requestContext.storyCount > 1) {
    return UserJourney.BULK_GENERATION;
  }
  
  if (requestContext.storyCount === 1) {
    return UserJourney.SINGLE_STORY;
  }
  
  // Default to text description
  return UserJourney.TEXT_DESCRIPTION;
}

// ============================================================================
// CONVENIENCE FUNCTION FOR API ROUTES
// ============================================================================

/**
 * Build a complete prompt for API routes with automatic journey detection
 */
export function buildAPIPrompt(params: {
  requirements: string;
  userTier: UserTier;
  contextLevel: ContextLevel;
  
  // Optional context
  epicId?: string;
  epicContext?: string;
  documentId?: string;
  documentType?: 'pdf' | 'docx' | 'txt' | 'md';
  parentStoryId?: string;
  parentStory?: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
  customTemplateId?: string;
  customTemplateFormat?: string;
  promptTemplate?: string;
  storyCount?: number;
  
  // User preferences
  language?: 'en-GB' | 'en-US';
  tone?: 'formal' | 'casual' | 'technical';
  maxOutputTokens?: number;
}): { systemPrompt: string; userPrompt: string; journey: UserJourney } {
  
  // Detect journey
  const journey = detectJourney({
    epicId: params.epicId,
    documentId: params.documentId,
    parentStoryId: params.parentStoryId,
    customTemplateId: params.customTemplateId,
    promptTemplate: params.promptTemplate,
    storyCount: params.storyCount,
  });
  
  // Build context
  const context: JourneyPromptContext = {
    journey,
    contextLevel: params.contextLevel,
    userTier: params.userTier,
    customTemplateFormat: params.customTemplateFormat,
    epicContext: params.epicContext,
    documentType: params.documentType,
    storyCount: params.storyCount,
    parentStory: params.parentStory,
    language: params.language || 'en-GB',
    tone: params.tone || 'formal',
    maxOutputTokens: params.maxOutputTokens,
  };
  
  // Build prompts
  const { systemPrompt, userPrompt } = buildJourneyPrompt(context, params.requirements);
  
  return { systemPrompt, userPrompt, journey };
}

