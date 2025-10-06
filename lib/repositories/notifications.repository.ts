import { db, generateId } from '@/lib/db'
import { notifications, notificationPreferences, users } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { sendNotificationEmail } from '@/lib/email/send-notification-email'

export type NotificationType =
  | 'story_assigned'
  | 'comment_mention'
  | 'sprint_starting'
  | 'story_blocked'
  | 'epic_completed'
  | 'comment_reply'

export type NotificationEntity = 'story' | 'epic' | 'sprint' | 'comment' | 'project'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  entityType: NotificationEntity
  entityId: string
  message: string
  actionUrl?: string
  emailData?: Record<string, any> // Optional data for email templates
}

export interface NotificationPreferencesInput {
  emailEnabled?: boolean
  inAppEnabled?: boolean
  notifyOnMention?: boolean
  notifyOnAssignment?: boolean
  notifyOnSprintChanges?: boolean
  digestFrequency?: 'real_time' | 'daily' | 'weekly'
}

export class NotificationsRepository {
  /**
   * Create a new notification
   */
  async create(input: CreateNotificationInput) {
    try {
      // Check user preferences before creating notification
      const prefs = await this.getPreferences(input.userId)
      if (!prefs?.inAppEnabled) {
        return null
      }

      const notificationId = generateId()

      const [notification] = await db
        .insert(notifications)
        .values({
          id: notificationId,
          userId: input.userId,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId,
          message: input.message,
          actionUrl: input.actionUrl || null,
          read: false,
        })
        .returning()

      // Send real-time email if user has real_time digest frequency
      if (prefs?.emailEnabled && prefs?.digestFrequency === 'real_time' && input.emailData) {
        const [user] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1)

        if (user?.email) {
          // Fire and forget - don't await to avoid blocking notification creation
          sendNotificationEmail(input.type, user.email, {
            userName: user.name || 'User',
            ...input.emailData,
          }).catch((error) => {
            console.error('[NOTIFICATION] Failed to send real-time email:', error)
          })
        }
      }

      return notification
    } catch (error) {
      console.error('Create notification error:', error)
      throw new Error('Failed to create notification')
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulk(inputs: CreateNotificationInput[]) {
    try {
      const notificationsToCreate = inputs.map((input) => ({
        id: generateId(),
        userId: input.userId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        message: input.message,
        actionUrl: input.actionUrl || null,
        read: false,
      }))

      const created = await db.insert(notifications).values(notificationsToCreate).returning()

      return created
    } catch (error) {
      console.error('Create bulk notifications error:', error)
      throw new Error('Failed to create bulk notifications')
    }
  }

  /**
   * Get notification by ID
   */
  async getById(notificationId: string) {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1)

      return notification || null
    } catch (error) {
      console.error('Get notification error:', error)
      throw new Error('Failed to get notification')
    }
  }

  /**
   * List notifications for a user
   */
  async listByUser(userId: string, limit = 50, offset = 0) {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset)

      return userNotifications
    } catch (error) {
      console.error('List notifications error:', error)
      throw new Error('Failed to list notifications')
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnread(userId: string) {
    try {
      const unread = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
        .orderBy(desc(notifications.createdAt))

      return unread
    } catch (error) {
      console.error('Get unread notifications error:', error)
      throw new Error('Failed to get unread notifications')
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const [result] = await db
        .select({
          count: sql<number>`COUNT(*)::integer`,
        })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

      return result?.count || 0
    } catch (error) {
      console.error('Get unread count error:', error)
      return 0
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const [updated] = await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
        .returning()

      return updated || null
    } catch (error) {
      console.error('Mark notification as read error:', error)
      throw new Error('Failed to mark notification as read')
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const updated = await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
        .returning()

      return updated
    } catch (error) {
      console.error('Mark all as read error:', error)
      throw new Error('Failed to mark all as read')
    }
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string, userId: string) {
    try {
      const [deleted] = await db
        .delete(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
        .returning()

      return deleted || null
    } catch (error) {
      console.error('Delete notification error:', error)
      throw new Error('Failed to delete notification')
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteRead(userId: string) {
    try {
      const deleted = await db
        .delete(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, true)))
        .returning()

      return deleted
    } catch (error) {
      console.error('Delete read notifications error:', error)
      throw new Error('Failed to delete read notifications')
    }
  }

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string) {
    try {
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1)

      // Return default preferences if none exist
      if (!prefs) {
        return {
          userId,
          emailEnabled: true,
          inAppEnabled: true,
          notifyOnMention: true,
          notifyOnAssignment: true,
          notifyOnSprintChanges: true,
          digestFrequency: 'real_time' as const,
        }
      }

      return prefs
    } catch (error) {
      console.error('Get preferences error:', error)
      throw new Error('Failed to get notification preferences')
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, input: NotificationPreferencesInput) {
    try {
      const [updated] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          ...input,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: input,
        })
        .returning()

      return updated
    } catch (error) {
      console.error('Update preferences error:', error)
      throw new Error('Failed to update notification preferences')
    }
  }

  /**
   * Check if user should receive notification based on preferences
   */
  async shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const prefs = await this.getPreferences(userId)

      if (!prefs.inAppEnabled) {
        return false
      }

      switch (type) {
        case 'comment_mention':
        case 'comment_reply':
          return prefs.notifyOnMention || false
        case 'story_assigned':
          return prefs.notifyOnAssignment || false
        case 'sprint_starting':
        case 'story_blocked':
        case 'epic_completed':
          return prefs.notifyOnSprintChanges || false
        default:
          return true
      }
    } catch (error) {
      console.error('Should notify check error:', error)
      return true // Default to sending notification on error
    }
  }

  /**
   * Get users who need digest notifications
   */
  async getUsersForDigest(frequency: 'daily' | 'weekly') {
    try {
      const digestUsers = await db
        .select({
          userId: notificationPreferences.userId,
          email: users.email,
          name: users.name,
        })
        .from(notificationPreferences)
        .leftJoin(users, eq(notificationPreferences.userId, users.id))
        .where(
          and(
            eq(notificationPreferences.digestFrequency, frequency),
            eq(notificationPreferences.emailEnabled, true)
          )
        )

      return digestUsers
    } catch (error) {
      console.error('Get users for digest error:', error)
      throw new Error('Failed to get users for digest')
    }
  }

  /**
   * Get unread notifications for digest email (last 24 hours or 7 days)
   */
  async getUnreadForDigest(userId: string, frequency: 'daily' | 'weekly') {
    try {
      const hoursAgo = frequency === 'daily' ? 24 : 168 // 7 days = 168 hours
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - hoursAgo)

      const unreadNotifications = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          message: notifications.message,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false),
            sql`${notifications.createdAt} >= ${cutoffDate.toISOString()}`
          )
        )
        .orderBy(desc(notifications.createdAt))

      // Add generated title based on notification type
      return unreadNotifications.map(n => ({
        ...n,
        title: this.getNotificationTitle(n.type),
      }))
    } catch (error) {
      console.error('Get unread for digest error:', error)
      throw new Error('Failed to get unread notifications for digest')
    }
  }

  /**
   * Generate a friendly title from notification type
   */
  private getNotificationTitle(type: NotificationType): string {
    const titles: Record<NotificationType, string> = {
      story_assigned: 'Story Assigned',
      comment_mention: 'Mentioned in Comment',
      sprint_starting: 'Sprint Starting',
      story_blocked: 'Story Blocked',
      epic_completed: 'Epic Completed',
      comment_reply: 'Comment Reply',
    }
    return titles[type] || 'Notification'
  }
}

// Export singleton instance
export const notificationsRepository = new NotificationsRepository()
