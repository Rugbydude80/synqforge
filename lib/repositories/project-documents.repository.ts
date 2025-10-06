import { db, generateId } from '@/lib/db'
import { projectDocuments, stories } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'

export interface CreateProjectDocumentInput {
  projectId: string
  uploadedBy: string
  fileName: string
  fileType: 'pdf' | 'docx' | 'txt' | 'md'
  fileSize: number
  fileBytes: Buffer
  extractedContent?: string
}

export interface UpdateProjectDocumentInput {
  extractedContent?: string
  generatedStoryIds?: string[]
}

export class ProjectDocumentsRepository {
  /**
   * Upload a document with binary storage in Neon
   */
  async create(input: CreateProjectDocumentInput) {
    try {
      const documentId = generateId()

      const [document] = await db
        .insert(projectDocuments)
        .values({
          id: documentId,
          projectId: input.projectId,
          uploadedBy: input.uploadedBy,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          fileBytes: input.fileBytes,
          extractedContent: input.extractedContent || null,
          generatedStoryIds: [],
        })
        .returning()

      return document
    } catch (error) {
      console.error('Create project document error:', error)
      throw new Error('Failed to create project document')
    }
  }

  /**
   * Get document by ID (including binary data)
   */
  async getById(id: string, projectId: string) {
    try {
      const [document] = await db
        .select()
        .from(projectDocuments)
        .where(and(eq(projectDocuments.id, id), eq(projectDocuments.projectId, projectId)))
        .limit(1)

      return document || null
    } catch (error) {
      console.error('Get project document error:', error)
      throw new Error('Failed to get project document')
    }
  }

  /**
   * List all documents for a project (without binary data for performance)
   */
  async listByProject(projectId: string) {
    try {
      const docs = await db
        .select({
          id: projectDocuments.id,
          projectId: projectDocuments.projectId,
          uploadedBy: projectDocuments.uploadedBy,
          fileName: projectDocuments.fileName,
          fileType: projectDocuments.fileType,
          fileSize: projectDocuments.fileSize,
          extractedContent: projectDocuments.extractedContent,
          generatedStoryIds: projectDocuments.generatedStoryIds,
          createdAt: projectDocuments.createdAt,
        })
        .from(projectDocuments)
        .where(eq(projectDocuments.projectId, projectId))
        .orderBy(desc(projectDocuments.createdAt))

      return docs
    } catch (error) {
      console.error('List project documents error:', error)
      throw new Error('Failed to list project documents')
    }
  }

  /**
   * Update document (e.g., add extracted content or link generated stories)
   */
  async update(id: string, projectId: string, input: UpdateProjectDocumentInput) {
    try {
      const [updated] = await db
        .update(projectDocuments)
        .set(input)
        .where(and(eq(projectDocuments.id, id), eq(projectDocuments.projectId, projectId)))
        .returning()

      return updated || null
    } catch (error) {
      console.error('Update project document error:', error)
      throw new Error('Failed to update project document')
    }
  }

  /**
   * Link a story to a source document
   */
  async linkStory(documentId: string, projectId: string, storyId: string) {
    try {
      const doc = await this.getById(documentId, projectId)
      if (!doc) {
        throw new Error('Document not found')
      }

      const currentStoryIds = doc.generatedStoryIds || []
      if (!currentStoryIds.includes(storyId)) {
        const updatedStoryIds = [...currentStoryIds, storyId]
        await this.update(documentId, projectId, {
          generatedStoryIds: updatedStoryIds,
        })
      }

      // Also update the story to link back to the document
      await db
        .update(stories)
        .set({ sourceDocumentId: documentId })
        .where(eq(stories.id, storyId))

      return true
    } catch (error) {
      console.error('Link story to document error:', error)
      throw new Error('Failed to link story to document')
    }
  }

  /**
   * Get all stories generated from a document
   */
  async getGeneratedStories(documentId: string, projectId: string) {
    try {
      const doc = await this.getById(documentId, projectId)
      if (!doc || !doc.generatedStoryIds || doc.generatedStoryIds.length === 0) {
        return []
      }

      const generatedStories = await db
        .select()
        .from(stories)
        .where(inArray(stories.id, doc.generatedStoryIds))
        .orderBy(desc(stories.createdAt))

      return generatedStories
    } catch (error) {
      console.error('Get generated stories error:', error)
      throw new Error('Failed to get generated stories')
    }
  }

  /**
   * Download document binary data
   */
  async downloadDocument(id: string, projectId: string): Promise<{ fileName: string; fileBytes: Buffer; fileType: string } | null> {
    try {
      const [document] = await db
        .select({
          fileName: projectDocuments.fileName,
          fileBytes: projectDocuments.fileBytes,
          fileType: projectDocuments.fileType,
        })
        .from(projectDocuments)
        .where(and(eq(projectDocuments.id, id), eq(projectDocuments.projectId, projectId)))
        .limit(1)

      return document || null
    } catch (error) {
      console.error('Download document error:', error)
      throw new Error('Failed to download document')
    }
  }

  /**
   * Delete document
   */
  async delete(id: string, projectId: string) {
    try {
      const [deleted] = await db
        .delete(projectDocuments)
        .where(and(eq(projectDocuments.id, id), eq(projectDocuments.projectId, projectId)))
        .returning()

      return deleted || null
    } catch (error) {
      console.error('Delete project document error:', error)
      throw new Error('Failed to delete project document')
    }
  }

  /**
   * Get total storage used by project
   */
  async getProjectStorageUsage(projectId: string): Promise<number> {
    try {
      const docs = await this.listByProject(projectId)
      return docs.reduce((total, doc) => total + (doc.fileSize || 0), 0)
    } catch (error) {
      console.error('Get project storage usage error:', error)
      return 0
    }
  }
}

// Export singleton instance
export const projectDocumentsRepository = new ProjectDocumentsRepository()
