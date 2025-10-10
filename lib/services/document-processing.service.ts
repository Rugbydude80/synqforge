/**
 * Document Processing Service
 * Handles file uploads, AI extraction, and document intelligence
 */

import { AIService } from './ai.service'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'

export interface DocumentExtractionResult {
  text: string
  metadata: {
    pageCount?: number
    wordCount: number
    format: string
    extractedAt: string
  }
}

export interface RequirementsExtractionResult {
  epics: Array<{
    title: string
    description: string
    goals: string[]
    estimatedStories: number
  }>
  stories: Array<{
    title: string
    description: string
    acceptanceCriteria: string[]
    storyPoints?: number
    storyType: 'feature' | 'bug' | 'technical' | 'research'
  }>
  summary: string
}

export class DocumentProcessingService {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  /**
   * Get access to Anthropic client
   */
  private get anthropic() {
    return (this.aiService as any).anthropic
  }

  /**
   * Get model config
   */
  private get model() {
    return 'claude-sonnet-4-20250514'
  }

  /**
   * Extract text from various document formats
   */
  async extractText(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<DocumentExtractionResult> {
    let text = ''
    const format = this.getFormatFromMimeType(mimeType)

    try {
      switch (format) {
        case 'pdf':
          const pdfData = await pdf(fileBuffer)
          text = pdfData.text
          return {
            text,
            metadata: {
              pageCount: pdfData.numpages,
              wordCount: text.split(/\s+/).length,
              format: 'pdf',
              extractedAt: new Date().toISOString(),
            },
          }

        case 'docx':
          const docxResult = await mammoth.extractRawText({ buffer: fileBuffer })
          text = docxResult.value
          return {
            text,
            metadata: {
              wordCount: text.split(/\s+/).length,
              format: 'docx',
              extractedAt: new Date().toISOString(),
            },
          }

        case 'txt':
        case 'md':
          text = fileBuffer.toString('utf-8')
          return {
            text,
            metadata: {
              wordCount: text.split(/\s+/).length,
              format: format,
              extractedAt: new Date().toISOString(),
            },
          }

        default:
          throw new Error(`Unsupported file format: ${mimeType}`)
      }
    } catch (error) {
      console.error('Text extraction error:', error)
      throw new Error(`Failed to extract text from ${format} document`)
    }
  }

  /**
   * AI-powered requirements extraction from documents
   */
  async extractRequirements(
    documentText: string,
    projectContext?: {
      projectName: string
      existingEpics?: string[]
    }
  ): Promise<RequirementsExtractionResult> {
    const prompt = this.buildRequirementsPrompt(documentText, projectContext)

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI')
      }

      // Parse AI response
      const result = JSON.parse(content.text)

      return {
        epics: result.epics || [],
        stories: result.stories || [],
        summary: result.summary || '',
      }
    } catch (error) {
      console.error('Requirements extraction error:', error)
      throw new Error('Failed to extract requirements from document')
    }
  }

  /**
   * Extract design implementation tasks from design documents
   */
  async extractImplementationTasks(
    designText: string,
    componentName: string
  ): Promise<Array<{
    title: string
    description: string
    technicalDetails: string[]
    estimatedHours: number
  }>> {
    const prompt = `
Analyze the following design specification for "${componentName}" and extract implementation tasks.

Design Specification:
${designText}

Extract detailed implementation tasks in JSON format:
{
  "tasks": [
    {
      "title": "Implement Component Structure",
      "description": "Create base component with props interface",
      "technicalDetails": ["Define TypeScript interfaces", "Setup component file structure"],
      "estimatedHours": 4
    }
  ]
}

Focus on:
- Frontend implementation tasks (UI components, state management)
- Backend API endpoints needed
- Database schema changes
- Testing requirements
- Documentation needs

Return ONLY valid JSON.
`

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI')
      }

      const result = JSON.parse(content.text)
      return result.tasks || []
    } catch (error) {
      console.error('Implementation task extraction error:', error)
      throw new Error('Failed to extract implementation tasks')
    }
  }

  /**
   * Analyze retrospective notes and identify patterns
   */
  async analyzeRetroNotes(
    retroNotes: string,
    teamContext: {
      teamSize: number
      previousRetros?: string[]
    }
  ): Promise<{
    patterns: Array<{
      pattern: string
      frequency: 'recurring' | 'new' | 'improving'
      category: 'process' | 'communication' | 'technical' | 'team-dynamics'
      actionItems: string[]
    }>
    summary: string
    recommendations: string[]
  }> {
    const prompt = `
Analyze the following retrospective notes and identify patterns, recurring issues, and improvements.

Retrospective Notes:
${retroNotes}

Team Context:
- Team Size: ${teamContext.teamSize}
${teamContext.previousRetros ? `- Previous Retro Themes: ${teamContext.previousRetros.join(', ')}` : ''}

Extract patterns and insights in JSON format:
{
  "patterns": [
    {
      "pattern": "Description of identified pattern",
      "frequency": "recurring|new|improving",
      "category": "process|communication|technical|team-dynamics",
      "actionItems": ["Suggested action 1", "Suggested action 2"]
    }
  ],
  "summary": "Overall summary of the retrospective",
  "recommendations": ["High-level recommendation 1", "High-level recommendation 2"]
}

Return ONLY valid JSON.
`

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI')
      }

      return JSON.parse(content.text)
    } catch (error) {
      console.error('Retro analysis error:', error)
      throw new Error('Failed to analyze retrospective notes')
    }
  }

  /**
   * Build requirements extraction prompt
   */
  private buildRequirementsPrompt(
    documentText: string,
    projectContext?: {
      projectName: string
      existingEpics?: string[]
    }
  ): string {
    return `
You are a product management expert. Analyze the following product requirements document and extract structured epics and user stories.

${projectContext ? `Project: ${projectContext.projectName}` : ''}
${projectContext?.existingEpics ? `Existing Epics: ${projectContext.existingEpics.join(', ')}` : ''}

Document:
${documentText}

Extract requirements in this JSON format:
{
  "summary": "Brief overview of the document (2-3 sentences)",
  "epics": [
    {
      "title": "Epic title (e.g., User Authentication)",
      "description": "Detailed epic description",
      "goals": ["Goal 1", "Goal 2", "Goal 3"],
      "estimatedStories": 8
    }
  ],
  "stories": [
    {
      "title": "User story title in 'As a... I want... So that...' format",
      "description": "Detailed story description with context",
      "acceptanceCriteria": [
        "Given... When... Then...",
        "Given... When... Then..."
      ],
      "storyPoints": 5,
      "storyType": "feature|bug|technical|research"
    }
  ]
}

Guidelines:
- Break down large features into multiple epics
- Each story should be INVEST compliant (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Acceptance criteria must be testable and specific
- Story points: 1 (trivial), 2 (simple), 3 (moderate), 5 (complex), 8 (very complex), 13 (epic-sized)
- Avoid duplicating existing epics: ${projectContext?.existingEpics?.join(', ') || 'N/A'}

Return ONLY valid JSON, no markdown formatting.
`
  }

  /**
   * Get document format from MIME type
   */
  private getFormatFromMimeType(mimeType: string): string {
    const mimeToFormat: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'text/markdown': 'md',
    }

    return mimeToFormat[mimeType] || 'unknown'
  }

  /**
   * Validate file size and format
   */
  validateFile(fileSize: number, mimeType: string): { valid: boolean; error?: string } {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ]

    if (fileSize > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return { valid: false, error: 'Unsupported file type. Allowed: PDF, DOCX, TXT, MD' }
    }

    return { valid: true }
  }
}

export const documentProcessingService = new DocumentProcessingService()
