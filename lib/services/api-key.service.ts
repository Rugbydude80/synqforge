/**
 * API Key Service
 * Handles generation, validation, hashing, and rotation of API keys
 */

import { db, generateId } from '@/lib/db'
import { apiKeys, organizations, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export interface ApiKeyContext {
  apiKeyId: string
  organizationId: string
  userId: string | null
  isServiceKey: boolean
  scopes: string[]
  rateLimitPerHour: number | null
}

export interface CreateApiKeyInput {
  organizationId: string
  userId: string | null // Null for service keys
  name: string
  description?: string
  scopes?: string[]
  expiresAt?: Date
  isServiceKey?: boolean
  rateLimitPerHour?: number
}

export interface ApiKeyRecord {
  id: string
  organizationId: string
  userId: string | null
  keyPrefix: string
  name: string
  description: string | null
  lastUsedAt: Date | null
  createdAt: Date
  expiresAt: Date | null
  isActive: boolean
  isServiceKey: boolean
  scopes: string[]
  rateLimitPerHour: number | null
}

/**
 * Generate a new API key
 * Returns the plaintext key (only shown once) and the record
 */
export async function generateApiKey(input: CreateApiKeyInput): Promise<{
  key: string // Plaintext key - only shown once!
  record: ApiKeyRecord
}> {
  // Validate organization exists
  const [org] = await db
    .select({ id: organizations.id, subscriptionTier: organizations.subscriptionTier })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1)

  if (!org) {
    throw new Error('Organization not found')
  }

  // Check subscription tier (Pro+ required)
  const allowedTiers = ['pro', 'team', 'enterprise', 'admin']
  if (!allowedTiers.includes(org.subscriptionTier || '')) {
    throw new Error('API access requires Pro tier or above')
  }

  // Service keys only for Enterprise
  if (input.isServiceKey && org.subscriptionTier !== 'enterprise' && org.subscriptionTier !== 'admin') {
    throw new Error('Service keys are only available for Enterprise tier')
  }

  // Check max keys per user (5 active keys)
  if (input.userId) {
    const activeKeys = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, input.userId),
          eq(apiKeys.isActive, true),
          eq(apiKeys.organizationId, input.organizationId)
        )
      )

    if (activeKeys.length >= 5) {
      throw new Error('Maximum 5 active API keys per user')
    }
  }

  // Generate API key: prefix (8 chars) + separator + random (32 chars)
  const prefix = nanoid(8)
  const suffix = nanoid(32)
  const plaintextKey = `sk_${prefix}_${suffix}`

  // Hash the full key with bcrypt
  const keyHash = await bcrypt.hash(plaintextKey, 10)

  // Default scopes
  const scopes = input.scopes || ['read', 'write']

  // Get tier-based rate limit if not specified
  let rateLimitPerHour = input.rateLimitPerHour
  if (!rateLimitPerHour) {
    switch (org.subscriptionTier) {
      case 'pro':
        rateLimitPerHour = 1000
        break
      case 'team':
        rateLimitPerHour = 5000
        break
      case 'enterprise':
      case 'admin':
        rateLimitPerHour = null // Unlimited for Enterprise
        break
      default:
        rateLimitPerHour = 1000
    }
  }

  const apiKeyId = generateId()

  // Insert API key record
  const [record] = await db
    .insert(apiKeys)
    .values({
      id: apiKeyId,
      organizationId: input.organizationId,
      userId: input.userId,
      keyHash,
      keyPrefix: prefix,
      name: input.name,
      description: input.description || null,
      expiresAt: input.expiresAt || null,
      isActive: true,
      isServiceKey: input.isServiceKey || false,
      scopes,
      rateLimitPerHour,
    })
    .returning()

  return {
    key: plaintextKey,
    record: {
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
    },
  }
}

/**
 * Validate an API key and return its context
 */
export async function validateApiKey(key: string): Promise<ApiKeyContext | null> {
  // Extract prefix from key (format: sk_prefix_suffix)
  const parts = key.split('_')
  if (parts.length !== 3 || parts[0] !== 'sk') {
    return null
  }

  const prefix = parts[1]

  // Find API key by prefix
  const [apiKeyRecord] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, prefix),
        eq(apiKeys.isActive, true)
      )
    )
    .limit(1)

  if (!apiKeyRecord) {
    return null
  }

  // Check expiration
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return null
  }

  // Verify hash
  const isValid = await bcrypt.compare(key, apiKeyRecord.keyHash)
  if (!isValid) {
    return null
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyRecord.id))

  return {
    apiKeyId: apiKeyRecord.id,
    organizationId: apiKeyRecord.organizationId,
    userId: apiKeyRecord.userId,
    isServiceKey: apiKeyRecord.isServiceKey,
    scopes: apiKeyRecord.scopes as string[],
    rateLimitPerHour: apiKeyRecord.rateLimitPerHour,
  }
}

/**
 * Get API key context by ID (for internal use)
 */
export async function getApiKeyContext(apiKeyId: string): Promise<ApiKeyContext | null> {
  const [apiKeyRecord] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, apiKeyId),
        eq(apiKeys.isActive, true)
      )
    )
    .limit(1)

  if (!apiKeyRecord) {
    return null
  }

  // Check expiration
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return null
  }

  return {
    apiKeyId: apiKeyRecord.id,
    organizationId: apiKeyRecord.organizationId,
    userId: apiKeyRecord.userId,
    isServiceKey: apiKeyRecord.isServiceKey,
    scopes: apiKeyRecord.scopes as string[],
    rateLimitPerHour: apiKeyRecord.rateLimitPerHour,
  }
}

/**
 * Revoke an API key (soft delete)
 */
export async function revokeApiKey(apiKeyId: string, organizationId: string): Promise<void> {
  const [updated] = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(
      and(
        eq(apiKeys.id, apiKeyId),
        eq(apiKeys.organizationId, organizationId)
      )
    )
    .returning()

  if (!updated) {
    throw new Error('API key not found or access denied')
  }
}

/**
 * Rotate an API key (generate new, invalidate old)
 */
export async function rotateApiKey(
  apiKeyId: string,
  organizationId: string,
  input: Omit<CreateApiKeyInput, 'organizationId' | 'userId'>
): Promise<{
  key: string
  record: ApiKeyRecord
}> {
  // Revoke old key
  await revokeApiKey(apiKeyId, organizationId)

  // Get old key to preserve userId
  const [oldKey] = await db
    .select({ userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.id, apiKeyId))
    .limit(1)

  // Generate new key
  return generateApiKey({
    organizationId,
    userId: oldKey?.userId || null,
    ...input,
  })
}

/**
 * List API keys for a user or organization
 */
export async function listApiKeys(
  organizationId: string,
  userId?: string
): Promise<ApiKeyRecord[]> {
  const conditions = [
    eq(apiKeys.organizationId, organizationId),
    eq(apiKeys.isActive, true),
  ]

  if (userId) {
    conditions.push(eq(apiKeys.userId, userId))
  }

  const records = await db
    .select()
    .from(apiKeys)
    .where(and(...conditions))
    .orderBy(apiKeys.createdAt)

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

