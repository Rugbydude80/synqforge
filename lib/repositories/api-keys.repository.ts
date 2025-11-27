/**
 * API Keys Repository
 * Data access layer for API keys
 */

import { db, generateId } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'
import {
  NotFoundError,
  ForbiddenError,
} from '@/lib/types'

export interface CreateApiKeyData {
  userId: string | null
  name: string
  description?: string
  scopes?: string[]
  expiresAt?: Date
  isServiceKey?: boolean
  rateLimitPerHour?: number
}

export interface UpdateApiKeyData {
  name?: string
  description?: string
  scopes?: string[]
  expiresAt?: Date | null
  rateLimitPerHour?: number
}

export class ApiKeysRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get API key by ID
   */
  async getById(apiKeyId: string) {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, apiKeyId),
          eq(apiKeys.organizationId, this.userContext.organizationId)
        )
      )
      .limit(1)

    if (!apiKey) {
      throw new NotFoundError('API key', apiKeyId)
    }

    // Check if user can access this key
    // Users can only access their own keys unless they're admin/owner
    if (
      apiKey.userId &&
      apiKey.userId !== this.userContext.id &&
      this.userContext.role !== 'admin' &&
      this.userContext.role !== 'owner'
    ) {
      throw new ForbiddenError('Access denied to this API key')
    }

    return {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      userId: apiKey.userId,
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      description: apiKey.description,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive,
      isServiceKey: apiKey.isServiceKey,
      scopes: apiKey.scopes as string[],
      rateLimitPerHour: apiKey.rateLimitPerHour,
    }
  }

  /**
   * List API keys for the user or organization
   */
  async list(userId?: string) {
    const conditions = [
      eq(apiKeys.organizationId, this.userContext.organizationId),
      eq(apiKeys.isActive, true),
    ]

    // If userId provided, filter by user
    // Admins/owners can see all keys
    if (userId && this.userContext.role !== 'admin' && this.userContext.role !== 'owner') {
      conditions.push(eq(apiKeys.userId, userId))
    } else if (!userId && this.userContext.role !== 'admin' && this.userContext.role !== 'owner') {
      // Regular users can only see their own keys
      conditions.push(eq(apiKeys.userId, this.userContext.id))
    }

    const records = await db
      .select()
      .from(apiKeys)
      .where(and(...conditions))
      .orderBy(desc(apiKeys.createdAt))

    return records.map((record) => ({
      id: record.id,
      organizationId: record.organizationId,
      userId: record.userId,
      keyPrefix: record.keyPrefix,
      name: record.name,
      description: record.description,
      lastUsedAt: record.lastUsedAt,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      isActive: record.isActive,
      isServiceKey: record.isServiceKey,
      scopes: record.scopes as string[],
      rateLimitPerHour: record.rateLimitPerHour,
    }))
  }

  /**
   * Update API key
   */
  async update(apiKeyId: string, data: UpdateApiKeyData) {
    // Verify access
    await this.getById(apiKeyId)

    const [updated] = await db
      .update(apiKeys)
      .set({
        name: data.name,
        description: data.description,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
        rateLimitPerHour: data.rateLimitPerHour,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(apiKeys.id, apiKeyId),
          eq(apiKeys.organizationId, this.userContext.organizationId)
        )
      )
      .returning()

    if (!updated) {
      throw new NotFoundError('API key', apiKeyId)
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      userId: updated.userId,
      keyPrefix: updated.keyPrefix,
      name: updated.name,
      description: updated.description,
      lastUsedAt: updated.lastUsedAt,
      createdAt: updated.createdAt,
      expiresAt: updated.expiresAt,
      isActive: updated.isActive,
      isServiceKey: updated.isServiceKey,
      scopes: updated.scopes as string[],
      rateLimitPerHour: updated.rateLimitPerHour,
    }
  }

  /**
   * Revoke API key (soft delete)
   */
  async revoke(apiKeyId: string) {
    // Verify access
    await this.getById(apiKeyId)

    const [updated] = await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(
        and(
          eq(apiKeys.id, apiKeyId),
          eq(apiKeys.organizationId, this.userContext.organizationId)
        )
      )
      .returning()

    if (!updated) {
      throw new NotFoundError('API key', apiKeyId)
    }

    return { success: true }
  }
}

