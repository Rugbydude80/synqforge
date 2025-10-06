import mammoth from 'mammoth'

interface ProcessedFile {
  content: string
  metadata: {
    pageCount?: number
    wordCount: number
    characterCount: number
    fileType: string
  }
}

export class FileProcessorService {
  async extractText(
    buffer: Buffer,
    contentType: string,
    filename: string
  ): Promise<ProcessedFile> {
    const fileType = this.getFileType(contentType, filename)

    switch (fileType) {
      case 'pdf':
        return this.extractFromPDF(buffer)
      case 'docx':
        return this.extractFromDOCX(buffer)
      case 'text':
        return this.extractFromText(buffer)
      case 'json':
        return this.extractFromJSON(buffer)
      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }
  }

  private async extractFromPDF(buffer: Buffer): Promise<ProcessedFile> {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)

      return {
        content: data.text,
        metadata: {
          pageCount: data.numpages,
          wordCount: data.text.split(/\s+/).filter((word) => word.length > 0).length,
          characterCount: data.text.length,
          fileType: 'pdf',
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async extractFromDOCX(buffer: Buffer): Promise<ProcessedFile> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      const content = result.value

      return {
        content,
        metadata: {
          wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
          characterCount: content.length,
          fileType: 'docx',
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async extractFromText(buffer: Buffer): Promise<ProcessedFile> {
    try {
      const content = buffer.toString('utf-8')

      return {
        content,
        metadata: {
          wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
          characterCount: content.length,
          fileType: 'text',
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to extract text content: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async extractFromJSON(buffer: Buffer): Promise<ProcessedFile> {
    try {
      const jsonString = buffer.toString('utf-8')
      const parsed = JSON.parse(jsonString)
      const content = JSON.stringify(parsed, null, 2)

      return {
        content,
        metadata: {
          wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
          characterCount: content.length,
          fileType: 'json',
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to extract JSON content: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private getFileType(contentType: string, filename: string): string {
    if (contentType.includes('pdf')) return 'pdf'
    if (
      contentType.includes('word') ||
      filename.endsWith('.docx') ||
      filename.endsWith('.doc')
    ) {
      return 'docx'
    }
    if (contentType.includes('text') || filename.endsWith('.txt') || filename.endsWith('.md')) {
      return 'text'
    }
    if (contentType.includes('json') || filename.endsWith('.json')) {
      return 'json'
    }
    return 'unknown'
  }

  summarizeContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) return content

    const truncated = content.substring(0, maxLength)
    const lastPeriod = truncated.lastIndexOf('.')
    const lastNewline = truncated.lastIndexOf('\n')

    const cutoff = Math.max(lastPeriod, lastNewline)
    if (cutoff > maxLength * 0.7) {
      return truncated.substring(0, cutoff + 1) + '...'
    }

    return truncated + '...'
  }

  validateContent(content: string): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'No content extracted from file' }
    }

    if (content.length < 50) {
      return { valid: false, error: 'Extracted content is too short (minimum 50 characters)' }
    }

    return { valid: true }
  }
}

export const fileProcessorService = new FileProcessorService()
