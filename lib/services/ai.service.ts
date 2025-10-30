import { openai, MODEL } from '@/lib/ai/client';
import { db } from '@/lib/db';
import { aiGenerations } from '@/lib/db/schema';
import { generateId } from '@/lib/db';
import { getSystemPromptForTemplate, getDefaultTemplateKey } from '@/lib/ai/prompt-templates';

export interface AIGenerationRequest {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerationResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface StoryGenerationResult {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  storyPoints: number;
  reasoning: string;
}

export interface StoryGenerationResponse {
  stories: StoryGenerationResult[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface EpicGenerationResult {
  title: string;
  description: string;
  goals: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: string;
  reasoning: string;
}

export interface EpicGenerationResponse {
  epic: EpicGenerationResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface StoryValidationResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
  suggestions: string[];
  reasoning: string;
}

export interface StoryValidationResponse {
  validation: StoryValidationResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  requirements: string[];
  suggestedStories: StoryGenerationResult[];
  suggestedEpics: EpicGenerationResult[];
  confidence: number; // 0-100
}

export interface DocumentAnalysisResponse {
  analysis: DocumentAnalysisResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface StorySplitSuggestion {
  title: string;
  personaGoal: string;
  description: string;
  acceptanceCriteria: string[];
  estimatePoints: number;
  providesUserValue: boolean;
  reasoning: string;
}

export interface StorySplitResponse {
  suggestions: StorySplitSuggestion[];
  splitStrategy: string;
  reasoning: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export class AIService {
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required. Please configure it in your environment variables.');
    }

    this.isConfigured = true;
  }

  /**
   * Check if AI service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate user stories from requirements
   */
  async generateStories(
    requirements: string,
    context?: string,
    count: number = 5,
    model: string = MODEL,
    promptTemplate?: string
  ): Promise<StoryGenerationResponse> {
    const prompt = this.buildStoryGenerationPrompt(requirements, context, count, promptTemplate);

    const response = await this.generate({
      model,
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    const stories = this.parseStoryGenerationResponse(response.content);

    return {
      stories,
      usage: response.usage,
      model: response.model,
    };
  }

  /**
   * Generate epic from requirements
   */
  async generateEpic(
    requirements: string,
    context?: string,
    model: string = MODEL
  ): Promise<EpicGenerationResponse> {
    const prompt = this.buildEpicGenerationPrompt(requirements, context);

    const response = await this.generate({
      model,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const epic = this.parseEpicGenerationResponse(response.content);

    return {
      epic,
      usage: response.usage,
      model: response.model,
    };
  }

  /**
   * Validate a user story
   */
  async validateStory(
    storyTitle: string,
    storyDescription: string,
    acceptanceCriteria: string[],
    model: string = MODEL
  ): Promise<StoryValidationResponse> {
    const prompt = this.buildStoryValidationPrompt(
      storyTitle,
      storyDescription,
      acceptanceCriteria
    );

    const response = await this.generate({
      model,
      prompt,
      maxTokens: 1500,
      temperature: 0.3,
    });

    const validation = this.parseStoryValidationResponse(response.content);

    return {
      validation,
      usage: response.usage,
      model: response.model,
    };
  }

  /**
   * Analyze document and extract requirements
   */
  async analyzeDocument(
    documentText: string,
    analysisType: 'requirements' | 'stories' | 'epics' | 'general' = 'requirements',
    model: string = MODEL
  ): Promise<DocumentAnalysisResponse> {
    const prompt = this.buildDocumentAnalysisPrompt(documentText, analysisType);

    const response = await this.generate({
      model,
      prompt,
      maxTokens: 3000,
      temperature: 0.5,
    });

    const analysis = this.parseDocumentAnalysisResponse(response.content);

    return {
      analysis,
      usage: response.usage,
      model: response.model,
    };
  }

  /**
   * Suggest how to split a large story into smaller ones
   */
  async suggestStorySplit(
    storyTitle: string,
    storyDescription: string,
    acceptanceCriteria: string[],
    storyPoints: number | null,
    investAnalysis: any,
    spidrHints: any,
    model: string = MODEL,
    isGapFill: boolean = false
  ): Promise<StorySplitResponse> {
    const prompt = this.buildStorySplitPrompt(
      storyTitle,
      storyDescription,
      acceptanceCriteria,
      storyPoints,
      investAnalysis,
      spidrHints,
      isGapFill
    );

    const response = await this.generate({
      model,
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    const splitResult = this.parseStorySplitResponse(response.content);

    return {
      ...splitResult,
      usage: response.usage,
      model: response.model,
    };
  }

  /**
   * Core AI generation method
   */
  private async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    try {
      const completion = await openai.chat.completions.create({
        model: request.model,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      // Extract text content from the response
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No text content in AI response');
      }

      return {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        model: request.model,
      };
    } catch (error) {
      console.error('AI generation failed:', error);
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Track AI usage in database
   */
  async trackUsage(
    userId: string,
    organizationId: string,
    model: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    requestType: 'story_generation' | 'story_validation' | 'epic_creation' | 'requirements_analysis',
    promptText: string,
    responseText?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Calculate cost (rough estimate - you should use actual pricing)
    const costPerToken = 0.00001; // $0.01 per 1000 tokens
    const cost = usage.totalTokens * costPerToken;

    // SECURITY: Never include the full system prompt in tracked data
    // Only track the requirements text provided by the user
    await db.insert(aiGenerations).values({
      id: generateId(),
      userId,
      organizationId,
      type: requestType,
      model,
      promptText, // This should only contain user input, not system prompts
      responseText,
      tokensUsed: usage.totalTokens,
      costUsd: cost.toString(),
      status: 'completed',
      metadata,
    });
  }

  /**
   * Build story generation prompt
   */
  private buildStoryGenerationPrompt(
    requirements: string, 
    context?: string, 
    count: number = 5,
    promptTemplate?: string
  ): string {
    // Get the system prompt for the selected template (server-side only)
    const templateKey = promptTemplate || getDefaultTemplateKey();
    const systemPrompt = getSystemPromptForTemplate(templateKey);
    
    // Inject requirements and context into the template
    const contextSection = context ? `Context: ${context}\n\n` : '';
    
    return `${systemPrompt}

${contextSection}Requirements:
${requirements}

Generate exactly ${count} user stories based on the requirements above.`;
  }

  /**
   * Build epic generation prompt
   */
  private buildEpicGenerationPrompt(requirements: string, context?: string): string {
    return `You are an expert product manager. Create a well-structured epic based on the following requirements.

${context ? `Context: ${context}\n\n` : ''}Requirements:
${requirements}

Create an epic with:
1. A clear, business-focused title
2. A comprehensive description
3. Key goals and objectives (3-5 items)
4. Priority level (low, medium, high, critical)
5. Estimated duration
6. Brief reasoning

Format the response as JSON:
{
  "title": "Epic Title",
  "description": "Comprehensive description...",
  "goals": ["Goal 1", "Goal 2", "Goal 3"],
  "priority": "high",
  "estimatedDuration": "4-6 weeks",
  "reasoning": "Why this epic is important..."
}`;
  }

  /**
   * Build story validation prompt
   */
  private buildStoryValidationPrompt(
    title: string,
    description: string,
    acceptanceCriteria: string[]
  ): string {
    return `You are an expert agile coach. Evaluate this user story for quality and completeness.

Story Title: ${title}
Description: ${description}
Acceptance Criteria: ${acceptanceCriteria.join(', ')}

Evaluate the story on:
1. Clarity and user focus
2. Completeness of acceptance criteria
3. Testability
4. Business value
5. Technical feasibility

Provide:
- Overall score (0-100)
- Specific feedback
- Improvement suggestions
- Brief reasoning

Format as JSON:
{
  "isValid": true/false,
  "score": 85,
  "feedback": ["Feedback point 1", "Feedback point 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "reasoning": "Brief explanation of the evaluation..."
}`;
  }

  /**
   * Build document analysis prompt
   */
  private buildDocumentAnalysisPrompt(documentText: string, analysisType: string): string {
    return `You are an expert business analyst. Analyze this document and extract key information.

Document:
${documentText}

Analysis Type: ${analysisType}

Extract and provide:
1. Executive summary
2. Key points and insights
3. Requirements (if any)
4. Suggested user stories (if applicable)
5. Suggested epics (if applicable)
6. Confidence level (0-100)

Format as JSON:
{
  "summary": "Executive summary...",
  "keyPoints": ["Point 1", "Point 2"],
  "requirements": ["Requirement 1", "Requirement 2"],
  "suggestedStories": [/* story objects */],
  "suggestedEpics": [/* epic objects */],
  "confidence": 85
}`;
  }

  /**
   * Build story split prompt
   */
  private buildStorySplitPrompt(
    storyTitle: string,
    storyDescription: string,
    acceptanceCriteria: string[],
    storyPoints: number | null,
    investAnalysis: any,
    spidrHints: any,
    isGapFill: boolean = false
  ): string {
    const acText = acceptanceCriteria.length > 0 ? acceptanceCriteria.join('\n- ') : 'None provided';
    const pointsText = storyPoints !== null ? `${storyPoints} points` : 'Not estimated';
    
    if (isGapFill) {
      // Special prompt for gap-fill: focus ONLY on covering the missing criteria
      return `You are an expert agile coach. Generate additional user stories to cover MISSING acceptance criteria.

**Original Story Context:**
Title: ${storyTitle}
Description: ${storyDescription}
Story Points: ${pointsText}

**CRITICAL: These acceptance criteria are NOT YET COVERED by existing child stories:**
${acText}

**Your Task:**
Generate 1-3 additional child stories that specifically address these uncovered criteria. Each story MUST:
1. Cover at least ONE of the missing criteria above
2. Follow INVEST principles
3. Be 1-5 story points
4. Include 2+ specific acceptance criteria
5. Provide clear user value

**Format your response as JSON:**
{
  "splitStrategy": "Gap-fill: Covering missing acceptance criteria",
  "reasoning": "Why these stories are needed to complete coverage",
  "suggestions": [
    {
      "title": "Concise story title",
      "personaGoal": "As a [persona], I want [goal] so that [benefit]",
      "description": "Detailed description",
      "acceptanceCriteria": [
        "Given... When... Then...",
        "Another criterion"
      ],
      "estimatePoints": 3,
      "providesUserValue": true,
      "reasoning": "How this story covers the missing criteria"
    }
  ]
}

Generate stories that ensure 100% coverage of the missing criteria above.`;
    }
    
    // Original prompt for initial split
    return `You are an expert agile coach specializing in story splitting using INVEST principles and SPIDR patterns.

**Original Story to Split:**
Title: ${storyTitle}
Description: ${storyDescription}
Story Points: ${pointsText}
Acceptance Criteria:
- ${acText}

**INVEST Analysis:**
${JSON.stringify(investAnalysis, null, 2)}

**SPIDR Opportunities:**
${JSON.stringify(spidrHints, null, 2)}

**Your Task:**
Split this story into 2-5 smaller, independently valuable stories. Each child story MUST:
1. Follow the INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable)
2. Be deliverable in a single sprint (1-5 story points)
3. Provide clear user value on its own
4. Have specific, testable acceptance criteria (minimum 2)
5. Include a persona-goal statement ("As a [persona], I want [goal] so that [benefit]")

**CRITICAL REQUIREMENTS:**
✅ **100% Coverage**: Every acceptance criterion from the parent story MUST be addressed by at least one child story
✅ **Zero Duplication**: Each piece of functionality should appear in ONLY ONE child story
✅ **No Gaps**: All functionality from the parent description must be included in the children

**Splitting Strategy Guidance:**
- Consider the SPIDR hints provided (Spike, Paths, Interfaces, Data, Rules)
- Ensure each child story is truly independent and can be delivered separately
- Avoid creating technical tasks - each story should provide user-visible value
- Consider vertical slicing (end-to-end features) over horizontal slicing (layers)
- Map each parent AC to exactly ONE child story - no overlap, no missing pieces

**Format your response as JSON:**
{
  "splitStrategy": "Brief explanation of the splitting approach used (e.g., 'Split by user paths', 'Progressive interface implementation', etc.)",
  "reasoning": "Why this split makes sense and how it addresses the INVEST/SPIDR analysis",
  "suggestions": [
    {
      "title": "Concise story title",
      "personaGoal": "As a [persona], I want [goal] so that [benefit]",
      "description": "Detailed description of this child story (minimum 50 characters)",
      "acceptanceCriteria": [
        "Given... When... Then... (specific, testable criterion)",
        "Another specific acceptance criterion"
      ],
      "estimatePoints": 3,
      "providesUserValue": true,
      "reasoning": "Why this is a valuable, independent story"
    }
  ]
}

Generate 2-5 child stories that together cover the scope of the original story.`;
  }

  /**
   * Parse story generation response
   */
  private parseStoryGenerationResponse(content: string): StoryGenerationResult[] {
    try {
      // Clean up the content - remove markdown code blocks if present
      let cleanContent = content.trim();
      
      // Remove markdown code fences
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.substring(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.substring(3);
      }
      
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.substring(0, cleanContent.length - 3);
      }
      
      cleanContent = cleanContent.trim();
      
      const parsed = JSON.parse(cleanContent);
      
      // Validate the response structure
      if (!parsed.stories || !Array.isArray(parsed.stories)) {
        console.error('Invalid story response structure:', parsed);
        throw new Error('Response does not contain stories array');
      }
      
      // Validate each story has required fields
      const validStories = parsed.stories.filter((story: any) => {
        const isValid = story.title && 
                       story.description && 
                       Array.isArray(story.acceptanceCriteria) &&
                       story.priority &&
                       typeof story.storyPoints === 'number';
        
        if (!isValid) {
          console.warn('Invalid story structure:', story);
        }
        
        return isValid;
      });
      
      if (validStories.length === 0) {
        console.error('No valid stories found in response');
        console.error('Raw content:', content);
      }
      
      return validStories;
    } catch (error) {
      console.error('Failed to parse story generation response:', error);
      console.error('Raw content:', content);
      return [];
    }
  }

  /**
   * Parse epic generation response
   */
  private parseEpicGenerationResponse(content: string): EpicGenerationResult {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse epic generation response:', error);
      throw new Error('Failed to parse epic generation response');
    }
  }

  /**
   * Parse story validation response
   */
  private parseStoryValidationResponse(content: string): StoryValidationResult {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse story validation response:', error);
      throw new Error('Failed to parse story validation response');
    }
  }

  /**
   * Parse document analysis response
   */
  private parseDocumentAnalysisResponse(content: string): DocumentAnalysisResult {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse document analysis response:', error);
      throw new Error('Failed to parse document analysis response');
    }
  }

  /**
   * Parse story split response
   */
  private parseStorySplitResponse(content: string): { suggestions: StorySplitSuggestion[]; splitStrategy: string; reasoning: string } {
    try {
      // Clean up the content - remove markdown code blocks if present
      let cleanContent = content.trim();
      
      // Remove markdown code fences
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.substring(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.substring(3);
      }
      
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.substring(0, cleanContent.length - 3);
      }
      
      cleanContent = cleanContent.trim();
      
      const parsed = JSON.parse(cleanContent);
      
      // Validate the response structure
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        console.error('Invalid story split response structure:', parsed);
        throw new Error('Response does not contain suggestions array');
      }
      
      // Validate each suggestion has required fields
      const validSuggestions = parsed.suggestions.filter((suggestion: any) => {
        const isValid = 
          suggestion.title && 
          suggestion.personaGoal && 
          suggestion.description && 
          Array.isArray(suggestion.acceptanceCriteria) &&
          suggestion.acceptanceCriteria.length >= 2 &&
          typeof suggestion.estimatePoints === 'number' &&
          suggestion.estimatePoints >= 1 &&
          suggestion.estimatePoints <= 5 &&
          typeof suggestion.providesUserValue === 'boolean';
        
        if (!isValid) {
          console.warn('Invalid story split suggestion:', suggestion);
        }
        
        return isValid;
      });
      
      if (validSuggestions.length === 0) {
        console.error('No valid split suggestions found in response');
        console.error('Raw content:', content);
        throw new Error('No valid split suggestions in AI response');
      }
      
      return {
        suggestions: validSuggestions,
        splitStrategy: parsed.splitStrategy || 'AI-suggested split',
        reasoning: parsed.reasoning || 'AI-generated split suggestions',
      };
    } catch (error) {
      console.error('Failed to parse story split response:', error);
      console.error('Raw content:', content);
      throw new Error('Failed to parse story split response');
    }
  }
}

// Export singleton instance
const globalForAI = globalThis as {
  aiServiceInstance?: AIService
};

function getAIService(): AIService {
  if (!globalForAI.aiServiceInstance) {
    globalForAI.aiServiceInstance = new AIService();
  }
  return globalForAI.aiServiceInstance;
}

export const aiService = new Proxy({} as AIService, {
  get(_target, prop) {
    const instance = getAIService() as any;
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
}) as AIService;

export { getAIService };
