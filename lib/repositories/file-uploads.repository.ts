import { db, generateId } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and, desc, sql, sum } from 'drizzle-orm';

interface CreateFileUploadInput {
  organizationId: string;
  projectId?: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  uploadedBy: string;
  extractedText?: string;
  aiAnalysis?: Record<string, any>;
}

interface UpdateFileUploadInput {
  extractedText?: string;
  aiAnalysis?: Record<string, any>;
  processingStatus?: 'uploaded' | 'processing' | 'completed' | 'failed';
  generatedStoriesCount?: number;
}

export class FileUploadsRepository {
  /**
   * Create a new file upload record
   */
  async create(input: CreateFileUploadInput) {
    try {
      const documentId = generateId();
      
      const [document] = await db
        .insert(documents)
        .values({
          id: documentId,
          organizationId: input.organizationId,
          uploadedBy: input.uploadedBy,
          originalFilename: input.originalFilename,
          fileSize: input.fileSize,
          fileType: input.contentType,
          storagePath: input.storagePath,
          processingStatus: 'uploaded',
          extractedText: input.extractedText || null,
          aiAnalysis: input.aiAnalysis || null,
          generatedStoriesCount: 0,
        })
        .returning();

      return document;
    } catch (error) {
      console.error('Create file upload error:', error);
      throw new Error('Failed to create file upload record');
    }
  }

  /**
   * Get file upload by ID
   */
  async getById(id: string, userId: string) {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, id),
            eq(documents.uploadedBy, userId)
          )
        )
        .limit(1);

      return document || null;
    } catch (error) {
      console.error('Get file upload error:', error);
      throw new Error('Failed to get file upload');
    }
  }

  /**
   * List files for an organization
   */
  async listByOrganization(organizationId: string, userId: string) {
    try {
      const files = await db
        .select({
          id: documents.id,
          originalFilename: documents.originalFilename,
          fileSize: documents.fileSize,
          fileType: documents.fileType,
          storagePath: documents.storagePath,
          processingStatus: documents.processingStatus,
          extractedText: documents.extractedText,
          aiAnalysis: documents.aiAnalysis,
          generatedStoriesCount: documents.generatedStoriesCount,
          uploadedBy: documents.uploadedBy,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, organizationId),
            eq(documents.uploadedBy, userId)
          )
        )
        .orderBy(desc(documents.createdAt));

      return files;
    } catch (error) {
      console.error('List organization files error:', error);
      throw new Error('Failed to list organization files');
    }
  }

  /**
   * Update file upload (e.g., add extracted content or AI analysis)
   */
  async update(id: string, userId: string, input: UpdateFileUploadInput) {
    try {
      const [updated] = await db
        .update(documents)
        .set({
          ...input,
        })
        .where(
          and(
            eq(documents.id, id),
            eq(documents.uploadedBy, userId)
          )
        )
        .returning();

      return updated || null;
    } catch (error) {
      console.error('Update file upload error:', error);
      throw new Error('Failed to update file upload');
    }
  }

  /**
   * Delete file upload record
   */
  async delete(id: string, userId: string) {
    try {
      const [deleted] = await db
        .delete(documents)
        .where(
          and(
            eq(documents.id, id),
            eq(documents.uploadedBy, userId)
          )
        )
        .returning();

      return deleted || null;
    } catch (error) {
      console.error('Delete file upload error:', error);
      throw new Error('Failed to delete file upload');
    }
  }

  /**
   * Get file with extracted content
   */
  async getWithContent(id: string, userId: string) {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, id),
            eq(documents.uploadedBy, userId)
          )
        )
        .limit(1);

      return document || null;
    } catch (error) {
      console.error('Get file with content error:', error);
      throw new Error('Failed to get file with content');
    }
  }

  /**
   * Get files by processing status
   */
  async getByStatus(status: 'uploaded' | 'processing' | 'completed' | 'failed', userId: string) {
    try {
      const files = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.processingStatus, status),
            eq(documents.uploadedBy, userId)
          )
        )
        .orderBy(desc(documents.createdAt));

      return files;
    } catch (error) {
      console.error('Get files by status error:', error);
      throw new Error('Failed to get files by status');
    }
  }

  /**
   * Get total storage used by user
   */
  async getUserStorageUsage(userId: string): Promise<number> {
    try {
      const [result] = await db
        .select({
          total: sum(documents.fileSize),
        })
        .from(documents)
        .where(eq(documents.uploadedBy, userId));

      return Number(result?.total || 0);
    } catch (error) {
      console.error('Get user storage usage error:', error);
      return 0;
    }
  }

  /**
   * Get total storage used by organization
   */
  async getOrganizationStorageUsage(organizationId: string): Promise<number> {
    try {
      const [result] = await db
        .select({
          total: sum(documents.fileSize),
        })
        .from(documents)
        .where(eq(documents.organizationId, organizationId));

      return Number(result?.total || 0);
    } catch (error) {
      console.error('Get organization storage usage error:', error);
      return 0;
    }
  }

  /**
   * Get files ready for AI processing
   */
  async getFilesForProcessing() {
    try {
      const files = await db
        .select()
        .from(documents)
        .where(eq(documents.processingStatus, 'uploaded'))
        .orderBy(documents.createdAt);

      return files;
    } catch (error) {
      console.error('Get files for processing error:', error);
      throw new Error('Failed to get files for processing');
    }
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    id: string, 
    status: 'uploaded' | 'processing' | 'completed' | 'failed',
    userId: string
  ) {
    try {
      const [updated] = await db
        .update(documents)
        .set({
          processingStatus: status,
        })
        .where(
          and(
            eq(documents.id, id),
            eq(documents.uploadedBy, userId)
          )
        )
        .returning();

      return updated || null;
    } catch (error) {
      console.error('Update processing status error:', error);
      throw new Error('Failed to update processing status');
    }
  }

  /**
   * Get files with AI analysis
   */
  async getFilesWithAnalysis(userId: string) {
    try {
      const files = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.uploadedBy, userId),
            sql`${documents.aiAnalysis} IS NOT NULL`
          )
        )
        .orderBy(desc(documents.createdAt));

      return files;
    } catch (error) {
      console.error('Get files with analysis error:', error);
      throw new Error('Failed to get files with analysis');
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(organizationId: string) {
    try {
      const stats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          uploaded: sql<number>`COUNT(CASE WHEN ${documents.processingStatus} = 'uploaded' THEN 1 END)`,
          processing: sql<number>`COUNT(CASE WHEN ${documents.processingStatus} = 'processing' THEN 1 END)`,
          completed: sql<number>`COUNT(CASE WHEN ${documents.processingStatus} = 'completed' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN ${documents.processingStatus} = 'failed' THEN 1 END)`,
          totalSize: sql<number>`SUM(${documents.fileSize})`,
        })
        .from(documents)
        .where(eq(documents.organizationId, organizationId));

      return stats[0] || {
        total: 0,
        uploaded: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalSize: 0,
      };
    } catch (error) {
      console.error('Get processing stats error:', error);
      throw new Error('Failed to get processing statistics');
    }
  }
}

// Export singleton instance
export const fileUploadsRepository = new FileUploadsRepository();
