/**
 * Content Validation Service
 * Ensures all generated content adheres to SynqForge standards and filters inappropriate content
 */

// Common profanity/inappropriate words (basic list - can be expanded)
const INAPPROPRIATE_WORDS: string[] = [
  // Add common inappropriate words here - keeping minimal for now
  // This should be expanded with a proper profanity filter library
]

// SynqForge required story structure
export interface StoryStructure {
  title: string
  description?: string
  acceptanceCriteria: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
  storyPoints?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedContent?: StoryStructure
}

export class ContentValidationService {
  /**
   * Validate and sanitize story content
   */
  validateStoryContent(story: StoryStructure): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Check for inappropriate language
    const inappropriateCheck = this.checkInappropriateContent(story)
    if (inappropriateCheck.hasInappropriate) {
      errors.push(`Content contains inappropriate language: ${inappropriateCheck.words.join(', ')}`)
    }

    // 2. Validate title
    if (!story.title || story.title.trim().length === 0) {
      errors.push('Story title is required')
    } else if (story.title.length > 200) {
      errors.push('Story title must be 200 characters or less')
    }

    // 3. Validate description
    if (story.description && story.description.length > 2000) {
      errors.push('Story description must be 2000 characters or less')
    }

    // 4. Validate acceptance criteria
    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      errors.push('At least one acceptance criterion is required')
    } else {
      if (story.acceptanceCriteria.length > 20) {
        errors.push('Maximum 20 acceptance criteria allowed')
      }
      
      story.acceptanceCriteria.forEach((ac, index) => {
        if (!ac || ac.trim().length === 0) {
          errors.push(`Acceptance criterion ${index + 1} is empty`)
        } else if (ac.length > 500) {
          errors.push(`Acceptance criterion ${index + 1} exceeds 500 characters`)
        }
      })
    }

    // 5. Validate priority
    if (story.priority && !['low', 'medium', 'high', 'critical'].includes(story.priority)) {
      errors.push('Priority must be low, medium, high, or critical')
    }

    // 6. Validate story points
    if (story.storyPoints !== undefined) {
      if (story.storyPoints < 0 || story.storyPoints > 100) {
        errors.push('Story points must be between 0 and 100')
      }
    }

    // 7. Check for SynqForge format compliance
    const formatCheck = this.checkSynqForgeFormat(story)
    if (formatCheck.errors.length > 0) {
      errors.push(...formatCheck.errors)
    }
    if (formatCheck.warnings.length > 0) {
      warnings.push(...formatCheck.warnings)
    }

    // Sanitize content if there are only warnings (not errors)
    let sanitizedContent: StoryStructure | undefined
    if (errors.length === 0) {
      sanitizedContent = this.sanitizeContent(story)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent,
    }
  }

  /**
   * Check for inappropriate content
   */
  private checkInappropriateContent(story: StoryStructure): {
    hasInappropriate: boolean
    words: string[]
  } {
    const foundWords: string[] = []
    const textToCheck = `${story.title} ${story.description || ''} ${story.acceptanceCriteria.join(' ')}`.toLowerCase()

    // Check against inappropriate words list
    for (const word of INAPPROPRIATE_WORDS) {
      if (textToCheck.includes(word.toLowerCase())) {
        foundWords.push(word)
      }
    }

    // Check for common patterns of inappropriate content
    const inappropriatePatterns = [
      /\b(f\*ck|f\*\*k|f\*\*\*)\b/i,
      /\b(s\*it|sh\*t)\b/i,
      /\b(a\*s|a\*\*)\b/i,
      /\b(b\*tch|b\*\*ch)\b/i,
      /\b(d\*mn|d\*\*n)\b/i,
      /\b(h\*ll|h\*\*l)\b/i,
    ]

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(textToCheck)) {
        foundWords.push('inappropriate language detected')
      }
    }

    return {
      hasInappropriate: foundWords.length > 0,
      words: foundWords,
    }
  }

  /**
   * Check if story adheres to SynqForge format standards
   */
  private checkSynqForgeFormat(story: StoryStructure): {
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check title format (should be user story format if possible)
    if (story.title && !story.title.toLowerCase().includes('as a')) {
      warnings.push('Title should follow user story format: "As a [persona], I want [goal], so that [benefit]"')
    }

    // Check acceptance criteria format
    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      const hasGivenWhenThen = story.acceptanceCriteria.some(
        ac => ac.toLowerCase().includes('given') && 
              ac.toLowerCase().includes('when') && 
              ac.toLowerCase().includes('then')
      )

      if (!hasGivenWhenThen && story.acceptanceCriteria.length > 0) {
        warnings.push('Acceptance criteria should follow Given/When/Then format for better clarity')
      }

      // Check for proper AC structure
      story.acceptanceCriteria.forEach((ac, index) => {
        if (ac.trim().length < 10) {
          warnings.push(`Acceptance criterion ${index + 1} is very short and may lack detail`)
        }
      })
    }

    // Check description quality
    if (story.description) {
      if (story.description.length < 20) {
        warnings.push('Story description is very short and may lack context')
      }
    } else {
      warnings.push('Story description is missing - consider adding context')
    }

    return { errors, warnings }
  }

  /**
   * Sanitize content by removing/escaping problematic characters
   */
  private sanitizeContent(story: StoryStructure): StoryStructure {
    return {
      title: this.sanitizeText(story.title),
      description: story.description ? this.sanitizeText(story.description) : undefined,
      acceptanceCriteria: story.acceptanceCriteria.map(ac => this.sanitizeText(ac)),
      priority: story.priority,
      storyPoints: story.storyPoints,
    }
  }

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string): string {
    // Remove null bytes and control characters (except newlines and tabs)
    let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    
    // Trim whitespace
    sanitized = sanitized.trim()
    
    // Normalize whitespace (multiple spaces to single space)
    sanitized = sanitized.replace(/\s+/g, ' ')
    
    return sanitized
  }

  /**
   * Validate that story matches custom template format
   */
  validateTemplateCompliance(
    story: StoryStructure,
    templateFormat: {
      requiredFields?: string[]
      format?: {
        titleFormat?: string
        acceptanceCriteriaFormat?: string
        priorityFormat?: string[]
      }
    }
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required fields
    if (templateFormat.requiredFields) {
      for (const field of templateFormat.requiredFields) {
        if (field === 'title' && !story.title) {
          errors.push(`Template requires field: ${field}`)
        } else if (field === 'description' && !story.description) {
          warnings.push(`Template recommends field: ${field}`)
        } else if (field === 'acceptanceCriteria' && (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0)) {
          errors.push(`Template requires field: ${field}`)
        }
      }
    }

    // Check title format
    if (templateFormat.format?.titleFormat) {
      const expectedFormat = templateFormat.format.titleFormat.toLowerCase()
      const titleLower = story.title.toLowerCase()
      
      if (expectedFormat.includes('as a') && !titleLower.includes('as a')) {
        warnings.push(`Template expects title format: ${templateFormat.format.titleFormat}`)
      }
    }

    // Check acceptance criteria format
    if (templateFormat.format?.acceptanceCriteriaFormat === 'Given/When/Then') {
      const hasProperFormat = story.acceptanceCriteria?.some(
        ac => ac.toLowerCase().includes('given') && 
              ac.toLowerCase().includes('when') && 
              ac.toLowerCase().includes('then')
      )
      
      if (!hasProperFormat && story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
        warnings.push('Template requires Given/When/Then format for acceptance criteria')
      }
    }

    // Check priority format
    if (templateFormat.format?.priorityFormat && story.priority) {
      const validPriorities = templateFormat.format.priorityFormat.map(p => p.toLowerCase())
      if (!validPriorities.includes(story.priority.toLowerCase())) {
        errors.push(`Template requires priority to be one of: ${templateFormat.format.priorityFormat.join(', ')}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings || [],
    }
  }
}

export const contentValidationService = new ContentValidationService()

