import { db } from '@/lib/db';
import { aiUsage } from '@/lib/db/schema';
import { generateId } from '@/lib/db';

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

export interface EpicGenerationResult {
  title: string;
  description: string;
  goals: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: string;
  reasoning: string;
}

export interface StoryValidationResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
  suggestions: string[];
  reasoning: string;
}

export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  requirements: string[];
  suggestedStories: StoryGenerationResult[];
  suggestedEpics: EpicGenerationResult[];
  confidence: number; // 0-100
}

export class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
  }

  /**
   * Generate user stories from requirements
   */
  async generateStories(
    requirements: string,
    context?: string,
    count: number = 5,
    model: string = 'claude-3-sonnet'
  ): Promise<StoryGenerationResult[]> {
    const prompt = this.buildStoryGenerationPrompt(requirements, context, count);
    
    const response = await this.generate({
      model,
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    return this.parseStoryGenerationResponse(response.content);
  }

  /**
   * Generate epic from requirements
   */
  async generateEpic(
    requirements: string,
    context?: string,
    model: string = 'claude-3-sonnet'
  ): Promise<EpicGenerationResult> {
    const prompt = this.buildEpicGenerationPrompt(requirements, context);
    
    const response = await this.generate({
      model,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return this.parseEpicGenerationResponse(response.content);
  }

  /**
   * Validate a user story
   */
  async validateStory(
    storyTitle: string,
    storyDescription: string,
    acceptanceCriteria: string[],
    model: string = 'claude-3-sonnet'
  ): Promise<StoryValidationResult> {
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

    return this.parseStoryValidationResponse(response.content);
  }

  /**
   * Analyze document and extract requirements
   */
  async analyzeDocument(
    documentText: string,
    analysisType: 'requirements' | 'stories' | 'epics' | 'general' = 'requirements',
    model: string = 'claude-3-sonnet'
  ): Promise<DocumentAnalysisResult> {
    const prompt = this.buildDocumentAnalysisPrompt(documentText, analysisType);
    
    const response = await this.generate({
      model,
      prompt,
      maxTokens: 3000,
      temperature: 0.5,
    });

    return this.parseDocumentAnalysisResponse(response.content);
  }

  /**
   * Core AI generation method
   */
  private async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'SynqForge AI',
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI generation failed: ${error}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;

    return {
      content: choice.message.content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      model: request.model,
    };
  }

  /**
   * Track AI usage in database
   */
  async trackUsage(
    userId: string,
    organizationId: string,
    model: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    requestType: 'story_generation' | 'epic_generation' | 'story_validation' | 'document_analysis',
    metadata?: Record<string, any>
  ): Promise<void> {
    // Calculate cost (rough estimate - you should use actual pricing)
    const costPerToken = 0.00001; // $0.01 per 1000 tokens
    const cost = usage.totalTokens * costPerToken;

    await db.insert(aiUsage).values({
      id: generateId(),
      userId,
      organizationId,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cost,
      requestType,
      metadata,
    });
  }

  /**
   * Build story generation prompt
   */
  private buildStoryGenerationPrompt(requirements: string, context?: string, count: number = 5): string {
    return `You are an expert product manager and agile coach. Generate ${count} well-written user stories based on the following requirements.

${context ? `Context: ${context}\n\n` : ''}Requirements:
${requirements}

For each story, provide:
1. A clear, user-focused title
2. A detailed description
3. Specific acceptance criteria (3-5 items)
4. Priority level (low, medium, high, critical)
5. Story points estimate (1-13)
6. Brief reasoning for the story

Format the response as JSON with this structure:
{
  "stories": [
    {
      "title": "As a [user type], I want [goal] so that [benefit]",
      "description": "Detailed description of the story...",
      "acceptanceCriteria": ["Criteria 1", "Criteria 2", "Criteria 3"],
      "priority": "medium",
      "storyPoints": 5,
      "reasoning": "Why this story is important..."
    }
  ]
}`;
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
   * Parse story generation response
   */
  private parseStoryGenerationResponse(content: string): StoryGenerationResult[] {
    try {
      const parsed = JSON.parse(content);
      return parsed.stories || [];
    } catch (error) {
      console.error('Failed to parse story generation response:', error);
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
}

// Export singleton instance
export const aiService = new AIService();
