import { db, generateId } from '@/lib/db'
import { storyComments, commentReactions, users } from '@/lib/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export interface CreateCommentInput {
  storyId: string
  userId: string
  content: string
  parentCommentId?: string | null
  mentions?: string[]
}

export interface UpdateCommentInput {
  content?: string
}

export interface AddReactionInput {
  commentId: string
  userId: string
  emoji: string
}

export class CommentsRepository {
  /**
   * Create a new comment
   */
  async createComment(input: CreateCommentInput) {
    try {
      const commentId = generateId()

      const [comment] = await db
        .insert(storyComments)
        .values({
          id: commentId,
          storyId: input.storyId,
          userId: input.userId,
          content: input.content,
          parentCommentId: input.parentCommentId || null,
          mentions: input.mentions || [],
        })
        .returning()

      return comment
    } catch (error) {
      console.error('Create comment error:', error)
      throw new Error('Failed to create comment')
    }
  }

  /**
   * Get comment by ID with author info
   */
  async getById(commentId: string) {
    try {
      const [comment] = await db
        .select({
          id: storyComments.id,
          storyId: storyComments.storyId,
          userId: storyComments.userId,
          content: storyComments.content,
          parentCommentId: storyComments.parentCommentId,
          mentions: storyComments.mentions,
          createdAt: storyComments.createdAt,
          updatedAt: storyComments.updatedAt,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(storyComments)
        .leftJoin(users, eq(storyComments.userId, users.id))
        .where(eq(storyComments.id, commentId))
        .limit(1)

      return comment || null
    } catch (error) {
      console.error('Get comment error:', error)
      throw new Error('Failed to get comment')
    }
  }

  /**
   * List all comments for a story (threaded)
   */
  async listByStory(storyId: string) {
    try {
      // Get all comments with author and reaction counts
      const comments = await db
        .select({
          id: storyComments.id,
          storyId: storyComments.storyId,
          userId: storyComments.userId,
          content: storyComments.content,
          parentCommentId: storyComments.parentCommentId,
          mentions: storyComments.mentions,
          createdAt: storyComments.createdAt,
          updatedAt: storyComments.updatedAt,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
          reactionCount: sql<number>`(
            SELECT COUNT(*)::integer
            FROM ${commentReactions}
            WHERE ${commentReactions.commentId} = ${storyComments.id}
          )`,
        })
        .from(storyComments)
        .leftJoin(users, eq(storyComments.userId, users.id))
        .where(eq(storyComments.storyId, storyId))
        .orderBy(storyComments.createdAt)

      return comments
    } catch (error) {
      console.error('List comments error:', error)
      throw new Error('Failed to list comments')
    }
  }

  /**
   * Get top-level comments (no parent)
   */
  async getTopLevelComments(storyId: string) {
    try {
      const comments = await db
        .select({
          id: storyComments.id,
          storyId: storyComments.storyId,
          userId: storyComments.userId,
          content: storyComments.content,
          parentCommentId: storyComments.parentCommentId,
          mentions: storyComments.mentions,
          createdAt: storyComments.createdAt,
          updatedAt: storyComments.updatedAt,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(storyComments)
        .leftJoin(users, eq(storyComments.userId, users.id))
        .where(and(eq(storyComments.storyId, storyId), isNull(storyComments.parentCommentId)))
        .orderBy(storyComments.createdAt)

      return comments
    } catch (error) {
      console.error('Get top-level comments error:', error)
      throw new Error('Failed to get top-level comments')
    }
  }

  /**
   * Get replies to a comment
   */
  async getReplies(parentCommentId: string) {
    try {
      const replies = await db
        .select({
          id: storyComments.id,
          storyId: storyComments.storyId,
          userId: storyComments.userId,
          content: storyComments.content,
          parentCommentId: storyComments.parentCommentId,
          mentions: storyComments.mentions,
          createdAt: storyComments.createdAt,
          updatedAt: storyComments.updatedAt,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(storyComments)
        .leftJoin(users, eq(storyComments.userId, users.id))
        .where(eq(storyComments.parentCommentId, parentCommentId))
        .orderBy(storyComments.createdAt)

      return replies
    } catch (error) {
      console.error('Get replies error:', error)
      throw new Error('Failed to get replies')
    }
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, userId: string, input: UpdateCommentInput) {
    try {
      const [updated] = await db
        .update(storyComments)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(and(eq(storyComments.id, commentId), eq(storyComments.userId, userId)))
        .returning()

      return updated || null
    } catch (error) {
      console.error('Update comment error:', error)
      throw new Error('Failed to update comment')
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string) {
    try {
      // First delete all reactions
      await db.delete(commentReactions).where(eq(commentReactions.commentId, commentId))

      // Then delete the comment
      const [deleted] = await db
        .delete(storyComments)
        .where(and(eq(storyComments.id, commentId), eq(storyComments.userId, userId)))
        .returning()

      return deleted || null
    } catch (error) {
      console.error('Delete comment error:', error)
      throw new Error('Failed to delete comment')
    }
  }

  /**
   * Add reaction to comment
   */
  async addReaction(input: AddReactionInput) {
    try {
      const reactionId = generateId()

      const [reaction] = await db
        .insert(commentReactions)
        .values({
          id: reactionId,
          commentId: input.commentId,
          userId: input.userId,
          emoji: input.emoji,
        })
        .onConflictDoNothing()
        .returning()

      return reaction || null
    } catch (error) {
      console.error('Add reaction error:', error)
      throw new Error('Failed to add reaction')
    }
  }

  /**
   * Remove reaction from comment
   */
  async removeReaction(commentId: string, userId: string, emoji: string) {
    try {
      const [removed] = await db
        .delete(commentReactions)
        .where(
          and(
            eq(commentReactions.commentId, commentId),
            eq(commentReactions.userId, userId),
            eq(commentReactions.emoji, emoji)
          )
        )
        .returning()

      return removed || null
    } catch (error) {
      console.error('Remove reaction error:', error)
      throw new Error('Failed to remove reaction')
    }
  }

  /**
   * Get reactions for a comment grouped by emoji
   */
  async getReactions(commentId: string) {
    try {
      const reactions = await db
        .select({
          emoji: commentReactions.emoji,
          count: sql<number>`COUNT(*)::integer`,
          users: sql<string[]>`array_agg(${users.name})`,
        })
        .from(commentReactions)
        .leftJoin(users, eq(commentReactions.userId, users.id))
        .where(eq(commentReactions.commentId, commentId))
        .groupBy(commentReactions.emoji)

      return reactions
    } catch (error) {
      console.error('Get reactions error:', error)
      throw new Error('Failed to get reactions')
    }
  }

  /**
   * Get comment count for a story
   */
  async getCommentCount(storyId: string): Promise<number> {
    try {
      const [result] = await db
        .select({
          count: sql<number>`COUNT(*)::integer`,
        })
        .from(storyComments)
        .where(eq(storyComments.storyId, storyId))

      return result?.count || 0
    } catch (error) {
      console.error('Get comment count error:', error)
      return 0
    }
  }
}

// Export singleton instance
export const commentsRepository = new CommentsRepository()
