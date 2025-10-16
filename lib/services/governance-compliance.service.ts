import { db, generateId } from '@/lib/db'
import { piiDetections, auditLogs, stories, organizations } from '@/lib/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export interface PIIDetection {
  storyId: string
  piiTypes: Array<'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name'>
  locations: Array<{ field: string; value: string; redacted: string }>
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resourceType: string
  resourceId: string
  changes: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
}

/**
 * Scan story content for PII
 */
export async function scanForPII(
  organizationId: string,
  storyId: string
): Promise<PIIDetection> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!organization || organization.subscriptionTier !== 'enterprise') {
    throw new Error('PII Detection requires Enterprise plan.')
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
    .limit(1)

  if (!story) throw new Error('Story not found')

  const detection = await detectPIIWithAI(story)

  // Save detection
  await db.insert(piiDetections).values({
    id: generateId(),
    organizationId,
    storyId,
    piiTypes: detection.piiTypes,
    locations: detection.locations as any,
    severity: detection.severity,
    autoRedacted: false,
    createdAt: new Date(),
  })

  return detection
}

async function detectPIIWithAI(story: any): Promise<PIIDetection> {
  const content = `${story.title}\n${story.description}\n${(story.acceptanceCriteria || []).join('\n')}`

  const prompt = `Scan the following text for Personally Identifiable Information (PII).

Content:
${content}

Detect:
- Email addresses
- Phone numbers
- Social security numbers
- Credit card numbers
- Physical addresses
- Real person names (not role names like "user", "admin")

Respond in JSON:
{
  "piiTypes": ["email", "phone"],
  "locations": [
    {"field": "description", "value": "john@example.com", "redacted": "[EMAIL_REDACTED]"}
  ],
  "severity": "medium",
  "recommendations": ["Remove PII from story", "Use placeholder data"]
}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('No text content')

  const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
  const parsedData = JSON.parse(jsonString.trim())

  return {
    storyId: story.id,
    ...parsedData,
  }
}

/**
 * Log audit trail event
 */
export async function logAuditEvent(
  organizationId: string,
  event: {
    userId: string
    action: string
    resourceType: string
    resourceId: string
    changes?: Record<string, any>
    ipAddress: string
    userAgent: string
  }
): Promise<void> {
  await db.insert(auditLogs).values({
    id: generateId(),
    organizationId,
    userId: event.userId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    changes: event.changes as any,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    timestamp: new Date(),
  })
}

/**
 * Export audit logs for compliance
 */
export async function exportAuditLogs(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv'
): Promise<string> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  if (!organization || organization.subscriptionTier !== 'enterprise') {
    throw new Error('Audit Log Export requires Enterprise plan.')
  }

  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        gte(auditLogs.timestamp, startDate)
      )
    )
    .orderBy(desc(auditLogs.timestamp))

  if (format === 'json') {
    return JSON.stringify(logs, null, 2)
  } else {
    // CSV format
    const headers = 'Timestamp,User ID,Action,Resource Type,Resource ID,IP Address\n'
    const rows = logs
      .map(
        (log) =>
          `${log.timestamp},${log.userId},${log.action},${log.resourceType},${log.resourceId},${log.ipAddress}`
      )
      .join('\n')
    return headers + rows
  }
}

/**
 * Apply data retention policy
 */
export async function applyRetentionPolicy(
  organizationId: string,
  retentionDays: number
): Promise<{ deletedCount: number }> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // In production, this would delete or archive old data
  // For now, just count what would be deleted
  const oldLogs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        gte(auditLogs.timestamp, cutoffDate)
      )
    )

  return { deletedCount: oldLogs.length }
}
