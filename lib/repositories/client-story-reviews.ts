/**
 * Client Story Review Repository
 * 
 * Data access layer for client story reviews
 */

import { db } from '@/lib/db'
import { clientStoryReviews, stories, clients, projects } from '@/lib/db/schema'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import type { AuthContext } from '@/lib/middleware/auth'

export interface ClientStoryReviewFilter {
  clientId?: string
  projectId?: string
  storyId?: string
  approvalStatus?: string
  submittedAfter?: Date
  submittedBefore?: Date
}

export class ClientStoryReviewRepository {
  private context: AuthContext

  constructor(context: AuthContext) {
    this.context = context
  }

  /**
   * Create a new review
   */
  async create(data: any): Promise<any> {
    const [review] = await db
      .insert(clientStoryReviews)
      .values({
        ...data,
        organizationId: this.context.user.organizationId,
      })
      .returning()

    return review
  }

  /**
   * Find review by ID
   */
  async findById(id: string): Promise<any | null> {
    const [review] = await db
      .select()
      .from(clientStoryReviews)
      .where(and(
        eq(clientStoryReviews.id, id),
        eq(clientStoryReviews.organizationId, this.context.user.organizationId)
      ))
      .limit(1)

    return review || null
  }

  /**
   * Find review by story and client
   */
  async findByStoryAndClient(storyId: string, clientId: string): Promise<any | null> {
    const [review] = await db
      .select()
      .from(clientStoryReviews)
      .where(and(
        eq(clientStoryReviews.storyId, storyId),
        eq(clientStoryReviews.clientId, clientId),
        eq(clientStoryReviews.organizationId, this.context.user.organizationId)
      ))
      .limit(1)

    return review || null
  }

  /**
   * Find all reviews matching filter
   */
  async findAll(filter: ClientStoryReviewFilter = {}): Promise<any[]> {
    const conditions = [eq(clientStoryReviews.organizationId, this.context.user.organizationId)]

    if (filter.clientId) {
      conditions.push(eq(clientStoryReviews.clientId, filter.clientId))
    }
    if (filter.projectId) {
      conditions.push(eq(clientStoryReviews.projectId, filter.projectId))
    }
    if (filter.storyId) {
      conditions.push(eq(clientStoryReviews.storyId, filter.storyId))
    }
    if (filter.approvalStatus) {
      conditions.push(eq(clientStoryReviews.approvalStatus, filter.approvalStatus as any))
    }
    if (filter.submittedAfter) {
      conditions.push(sql`${clientStoryReviews.submittedForReviewAt} >= ${filter.submittedAfter}`)
    }
    if (filter.submittedBefore) {
      conditions.push(sql`${clientStoryReviews.submittedForReviewAt} <= ${filter.submittedBefore}`)
    }

    const reviews = await db
      .select({
        review: clientStoryReviews,
        story: stories,
        client: clients,
        project: projects,
      })
      .from(clientStoryReviews)
      .leftJoin(stories, eq(clientStoryReviews.storyId, stories.id))
      .leftJoin(clients, eq(clientStoryReviews.clientId, clients.id))
      .leftJoin(projects, eq(clientStoryReviews.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(clientStoryReviews.submittedForReviewAt))

    return reviews.map(r => ({
      ...r.review,
      story: r.story,
      client: r.client,
      project: r.project,
    }))
  }

  /**
   * Update review
   */
  async update(id: string, data: Partial<any>): Promise<any> {
    const [review] = await db
      .update(clientStoryReviews)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(clientStoryReviews.id, id),
        eq(clientStoryReviews.organizationId, this.context.user.organizationId)
      ))
      .returning()

    return review
  }

  /**
   * Delete review
   */
  async delete(id: string): Promise<boolean> {
    await db
      .delete(clientStoryReviews)
      .where(and(
        eq(clientStoryReviews.id, id),
        eq(clientStoryReviews.organizationId, this.context.user.organizationId)
      ))

    return true
  }

  /**
   * Get reviews pending approval for a client
   */
  async findPendingByClient(clientId: string): Promise<any[]> {
    return this.findAll({
      clientId,
      approvalStatus: 'pending',
    })
  }

  /**
   * Get review statistics
   */
  async getStatistics(filter: ClientStoryReviewFilter = {}): Promise<any> {
    const conditions = [eq(clientStoryReviews.organizationId, this.context.user.organizationId)]

    if (filter.clientId) {
      conditions.push(eq(clientStoryReviews.clientId, filter.clientId))
    }
    if (filter.projectId) {
      conditions.push(eq(clientStoryReviews.projectId, filter.projectId))
    }

    const result = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total_reviews,
        COUNT(CASE WHEN ${clientStoryReviews.approvalStatus} = 'pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN ${clientStoryReviews.approvalStatus} = 'approved' THEN 1 END)::int as approved,
        COUNT(CASE WHEN ${clientStoryReviews.approvalStatus} = 'needs_revision' THEN 1 END)::int as needs_revision,
        COUNT(CASE WHEN ${clientStoryReviews.approvalStatus} = 'rejected' THEN 1 END)::int as rejected,
        AVG(${clientStoryReviews.technicalComplexityScore})::numeric(3,1) as avg_complexity,
        AVG(${clientStoryReviews.clientFriendlinessScore})::numeric(3,1) as avg_friendliness,
        COUNT(CASE WHEN ${clientStoryReviews.aiGeneratedSummary} = true THEN 1 END)::int as ai_generated_count
      FROM ${clientStoryReviews}
      WHERE ${and(...conditions)}
    `)

    return result[0] || {
      total_reviews: 0,
      pending: 0,
      approved: 0,
      needs_revision: 0,
      rejected: 0,
      avg_complexity: null,
      avg_friendliness: null,
      ai_generated_count: 0,
    }
  }

  /**
   * Bulk update reviews
   */
  async bulkUpdateStatus(
    reviewIds: string[],
    status: 'approved' | 'needs_revision' | 'rejected',
    approvedByEmail: string,
    approvedByRole: string
  ): Promise<any[]> {
    const reviews = await db
      .update(clientStoryReviews)
      .set({
        approvalStatus: status,
        approvedByEmail,
        approvedByRole,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        inArray(clientStoryReviews.id, reviewIds),
        eq(clientStoryReviews.organizationId, this.context.user.organizationId)
      ))
      .returning()

    return reviews
  }

  /**
   * Get recent reviews with activity
   */
  async findRecentActivity(limit: number = 10): Promise<any[]> {
    const reviews = await db
      .select({
        review: clientStoryReviews,
        story: stories,
        client: clients,
      })
      .from(clientStoryReviews)
      .leftJoin(stories, eq(clientStoryReviews.storyId, stories.id))
      .leftJoin(clients, eq(clientStoryReviews.clientId, clients.id))
      .where(eq(clientStoryReviews.organizationId, this.context.user.organizationId))
      .orderBy(desc(clientStoryReviews.updatedAt))
      .limit(limit)

    return reviews.map(r => ({
      ...r.review,
      story: r.story,
      client: r.client,
    }))
  }
}
