import { db, generateId } from '@/lib/db'
import { customDocumentTemplates } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export interface CreateCustomTemplateInput {
  organizationId: string
  templateName: string
  description?: string
  fileName: string
  fileType: 'pdf' | 'docx' | 'txt' | 'md'
  fileSize: number
  fileBytes: Buffer
  extractedContent: string
  templateFormat: Record<string, any>
  createdBy: string
}

export interface UpdateCustomTemplateInput {
  templateName?: string
  description?: string
  isActive?: boolean
}

export class CustomDocumentTemplatesRepository {
  /**
   * Create a custom document template
   */
  async create(input: CreateCustomTemplateInput) {
    try {
      const templateId = generateId()
      
      const [template] = await db
        .insert(customDocumentTemplates)
        .values({
          id: templateId,
          organizationId: input.organizationId,
          templateName: input.templateName,
          description: input.description || null,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          fileBytes: input.fileBytes,
          extractedContent: input.extractedContent,
          templateFormat: input.templateFormat,
          createdBy: input.createdBy,
          isActive: true,
        })
        .returning()
      
      return template
    } catch (error) {
      console.error('Create custom template error:', error)
      throw new Error('Failed to create custom template')
    }
  }
  
  /**
   * Get template by ID
   */
  async getById(id: string, organizationId: string) {
    try {
      const [template] = await db
        .select()
        .from(customDocumentTemplates)
        .where(
          and(
            eq(customDocumentTemplates.id, id),
            eq(customDocumentTemplates.organizationId, organizationId)
          )
        )
        .limit(1)
      
      return template || null
    } catch (error) {
      console.error('Get custom template error:', error)
      throw new Error('Failed to get custom template')
    }
  }
  
  /**
   * List templates for an organization
   */
  async list(organizationId: string, includeInactive: boolean = false) {
    try {
      const conditions = includeInactive
        ? [eq(customDocumentTemplates.organizationId, organizationId)]
        : [
            eq(customDocumentTemplates.organizationId, organizationId),
            eq(customDocumentTemplates.isActive, true),
          ]
      
      const templates = await db
        .select({
          id: customDocumentTemplates.id,
          templateName: customDocumentTemplates.templateName,
          description: customDocumentTemplates.description,
          fileName: customDocumentTemplates.fileName,
          fileType: customDocumentTemplates.fileType,
          fileSize: customDocumentTemplates.fileSize,
          usageCount: customDocumentTemplates.usageCount,
          createdBy: customDocumentTemplates.createdBy,
          isActive: customDocumentTemplates.isActive,
          createdAt: customDocumentTemplates.createdAt,
          updatedAt: customDocumentTemplates.updatedAt,
          // Don't include fileBytes in list response
        })
        .from(customDocumentTemplates)
        .where(and(...conditions))
        .orderBy(desc(customDocumentTemplates.usageCount), desc(customDocumentTemplates.createdAt))
      
      return templates || []
    } catch (error: any) {
      console.error('List custom templates error:', error)
      
      // Check if table doesn't exist
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        console.error('Custom document templates table does not exist. Migration may not have been run.')
        // Return empty array instead of throwing - allows UI to work gracefully
        return []
      }
      
      throw new Error(`Failed to list custom templates: ${error?.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Update template
   */
  async update(id: string, organizationId: string, input: UpdateCustomTemplateInput) {
    try {
      const updateData: Partial<typeof customDocumentTemplates.$inferInsert> = {}
      
      if (input.templateName !== undefined) updateData.templateName = input.templateName
      if (input.description !== undefined) updateData.description = input.description
      if (input.isActive !== undefined) updateData.isActive = input.isActive
      
      const [updated] = await db
        .update(customDocumentTemplates)
        .set(updateData)
        .where(
          and(
            eq(customDocumentTemplates.id, id),
            eq(customDocumentTemplates.organizationId, organizationId)
          )
        )
        .returning()
      
      return updated || null
    } catch (error) {
      console.error('Update custom template error:', error)
      throw new Error('Failed to update custom template')
    }
  }
  
  /**
   * Delete template
   */
  async delete(id: string, organizationId: string) {
    try {
      await db
        .delete(customDocumentTemplates)
        .where(
          and(
            eq(customDocumentTemplates.id, id),
            eq(customDocumentTemplates.organizationId, organizationId)
          )
        )
      
      return { success: true }
    } catch (error) {
      console.error('Delete custom template error:', error)
      throw new Error('Failed to delete custom template')
    }
  }
  
  /**
   * Increment usage count
   */
  async incrementUsage(id: string) {
    try {
      await db
        .update(customDocumentTemplates)
        .set({
          usageCount: sql`${customDocumentTemplates.usageCount} + 1`,
        })
        .where(eq(customDocumentTemplates.id, id))
      
      return { success: true }
    } catch (error) {
      console.error('Increment usage error:', error)
      // Don't throw - usage tracking is non-critical
    }
  }
  
  /**
   * Count templates for an organization
   */
  async count(organizationId: string, includeInactive: boolean = false): Promise<number> {
    try {
      const conditions = includeInactive
        ? [eq(customDocumentTemplates.organizationId, organizationId)]
        : [
            eq(customDocumentTemplates.organizationId, organizationId),
            eq(customDocumentTemplates.isActive, true),
          ]
      
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(customDocumentTemplates)
        .where(and(...conditions))
      
      return Number(result?.count || 0)
    } catch (error: any) {
      console.error('Count custom templates error:', error)
      
      // Check if table doesn't exist
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        return 0
      }
      
      throw new Error(`Failed to count custom templates: ${error?.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Get template file bytes (for download)
   */
  async getFileBytes(id: string, organizationId: string): Promise<Buffer | null> {
    try {
      const [template] = await db
        .select({
          fileBytes: customDocumentTemplates.fileBytes,
        })
        .from(customDocumentTemplates)
        .where(
          and(
            eq(customDocumentTemplates.id, id),
            eq(customDocumentTemplates.organizationId, organizationId)
          )
        )
        .limit(1)
      
      return template?.fileBytes ? Buffer.from(template.fileBytes) : null
    } catch (error) {
      console.error('Get file bytes error:', error)
      throw new Error('Failed to get template file')
    }
  }
}

export const customDocumentTemplatesRepository = new CustomDocumentTemplatesRepository()

