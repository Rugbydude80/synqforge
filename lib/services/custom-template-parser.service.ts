import { fileProcessorService } from './file-processor.service'

/**
 * Interface for parsed template format
 */
export interface ParsedTemplateFormat {
  sections: string[] // e.g., ['Title', 'Description', 'Acceptance Criteria', 'Priority']
  requiredFields: string[]
  format: {
    titleFormat?: string // e.g., "As a {persona}, I want {goal}, so that {benefit}"
    descriptionFormat?: string
    acceptanceCriteriaFormat?: string // e.g., "Given/When/Then" or numbered list
    priorityFormat?: string[]
    storyPointsFormat?: string
    additionalFields?: Record<string, string>
  }
  style: {
    language?: string // e.g., 'en-GB' for UK English
    tone?: string // e.g., 'formal', 'casual'
    maxLengths?: Record<string, number>
  }
  metadata: {
    extractedSections: string[]
    exampleContent?: string
  }
}

/**
 * Service to parse uploaded documents and extract template format/structure
 */
export class CustomTemplateParserService {
  /**
   * Parse uploaded document and extract template format
   */
  async parseDocument(
    buffer: Buffer,
    fileType: 'pdf' | 'docx' | 'txt' | 'md',
    fileName: string
  ): Promise<{ content: string; format: ParsedTemplateFormat }> {
    // Extract text content from document
    const processed = await fileProcessorService.extractText(buffer, this.getMimeType(fileType), fileName)
    
    const content = processed.content
    
    // Parse the content to extract template structure
    const format = this.extractTemplateFormat(content)
    
    return {
      content,
      format,
    }
  }
  
  /**
   * Extract template format from document content
   * Uses AI-friendly pattern matching to identify structure
   */
  private extractTemplateFormat(content: string): ParsedTemplateFormat {
    const sections: string[] = []
    const requiredFields: string[] = []
    const extractedSections: string[] = []
    
    // Common section headers to look for
    const commonHeaders = [
      'title',
      'description',
      'acceptance criteria',
      'acceptance_criteria',
      'ac',
      'priority',
      'story points',
      'story_points',
      'estimate',
      'user story',
      'background',
      'context',
      'requirements',
      'dependencies',
      'out of scope',
      'notes',
      'test cases',
      'definition of done',
    ]
    
    // Extract sections using headers
    const lines = content.split('\n')
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      
      // Check if line is a section header
      for (const header of commonHeaders) {
        if (lowerLine.includes(header) && lowerLine.length < 100) {
          sections.push(header)
          extractedSections.push(line.trim())
          requiredFields.push(header)
          break
        }
      }
    }
    
    // Detect format patterns
    const format: ParsedTemplateFormat['format'] = {}
    
    // Detect title format (As a... I want... so that...)
    if (content.toLowerCase().includes('as a') && content.toLowerCase().includes('i want')) {
      format.titleFormat = 'As a {persona}, I want {goal}, so that {benefit}'
    }
    
    // Detect Given/When/Then format
    if (content.toLowerCase().includes('given') && content.toLowerCase().includes('when') && content.toLowerCase().includes('then')) {
      format.acceptanceCriteriaFormat = 'Given/When/Then'
    } else if (content.match(/\d+\./)) {
      format.acceptanceCriteriaFormat = 'numbered'
    } else if (content.includes('-') || content.includes('•')) {
      format.acceptanceCriteriaFormat = 'bulleted'
    }
    
    // Detect priority format
    const priorityPatterns = ['low', 'medium', 'high', 'critical', 'lowest', 'highest']
    const foundPriorities = priorityPatterns.filter(p => content.toLowerCase().includes(p))
    if (foundPriorities.length > 0) {
      format.priorityFormat = foundPriorities
    }
    
    // Detect story points format
    if (content.toLowerCase().includes('story points') || content.toLowerCase().includes('points')) {
      format.storyPointsFormat = 'fibonacci' // Default assumption
    }
    
    // Detect language (UK vs US English)
    const language = this.detectLanguage(content)
    
    // Detect tone
    const tone = this.detectTone(content)
    
    return {
      sections: sections.length > 0 ? sections : ['title', 'description', 'acceptanceCriteria'], // Default fallback
      requiredFields: requiredFields.length > 0 ? requiredFields : ['title', 'description', 'acceptanceCriteria'],
      format,
      style: {
        language,
        tone,
      },
      metadata: {
        extractedSections,
        exampleContent: content.substring(0, 500), // First 500 chars as example
      },
    }
  }
  
  /**
   * Detect language from content
   */
  private detectLanguage(content: string): string {
    // UK English indicators
    const ukIndicators = ['behaviour', 'colour', 'organise', 'authorise', 'recognise', 'prioritise']
    // US English indicators
    const usIndicators = ['behavior', 'color', 'organize', 'authorize', 'recognize', 'prioritize']
    
    const ukCount = ukIndicators.filter(word => content.toLowerCase().includes(word)).length
    const usCount = usIndicators.filter(word => content.toLowerCase().includes(word)).length
    
    if (ukCount > usCount) {
      return 'en-GB'
    }
    return 'en-US'
  }
  
  /**
   * Detect tone from content
   */
  private detectTone(content: string): string {
    const formalIndicators = ['shall', 'must', 'shall not', 'must not', 'hereby', 'pursuant']
    const casualIndicators = ['can', 'could', 'should', 'maybe', 'probably']
    
    const formalCount = formalIndicators.filter(word => content.toLowerCase().includes(word)).length
    const casualCount = casualIndicators.filter(word => content.toLowerCase().includes(word)).length
    
    if (formalCount > casualCount) {
      return 'formal'
    }
    return 'casual'
  }
  
  /**
   * Convert file type to MIME type
   */
  private getMimeType(fileType: 'pdf' | 'docx' | 'txt' | 'md'): string {
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
    }
    return mimeTypes[fileType]
  }
  
  /**
   * Generate AI prompt enhancement from template format
   * This will be used to modify the system prompt when generating stories
   */
  generatePromptEnhancement(format: ParsedTemplateFormat): string {
    let enhancement = '\n\nCUSTOM TEMPLATE FORMAT REQUIREMENTS:\n'
    enhancement += 'You must generate stories that strictly follow this format:\n\n'
    
    // Add section requirements
    enhancement += 'Required Sections:\n'
    format.requiredFields.forEach((field, index) => {
      enhancement += `${index + 1}. ${field.charAt(0).toUpperCase() + field.slice(1)}\n`
    })
    
    // Add format requirements
    if (format.format.titleFormat) {
      enhancement += `\nTitle Format: ${format.format.titleFormat}\n`
    }
    
    if (format.format.acceptanceCriteriaFormat) {
      enhancement += `\nAcceptance Criteria Format: ${format.format.acceptanceCriteriaFormat}\n`
      if (format.format.acceptanceCriteriaFormat === 'Given/When/Then') {
        enhancement += 'Each acceptance criterion must be in strict Given/When/Then format.\n'
      }
    }
    
    if (format.format.priorityFormat) {
      enhancement += `\nPriority Options: ${format.format.priorityFormat.join(', ')}\n`
    }
    
    // Add style requirements
    if (format.style.language === 'en-GB') {
      enhancement += '\nLanguage: Use UK English spelling (behaviour, colour, organise, etc.)\n'
    }
    
    if (format.style.tone) {
      enhancement += `\nTone: ${format.style.tone}\n`
    }
    
    // Add example content if available
    if (format.metadata.exampleContent) {
      enhancement += '\nExample Format (from uploaded template):\n'
      enhancement += format.metadata.exampleContent.substring(0, 300) + '\n'
    }
    
    enhancement += '\nIMPORTANT: All generated stories must strictly adhere to this format and structure.\n'
    
    return enhancement
  }
}

export const customTemplateParserService = new CustomTemplateParserService()

