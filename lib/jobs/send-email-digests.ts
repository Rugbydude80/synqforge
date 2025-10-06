/**
 * Email Digest Background Job
 *
 * Runs daily/weekly to send aggregated notification emails
 * to users based on their preferences
 */

import { notificationsRepository } from '@/lib/repositories/notifications.repository'
import { sendDigestEmail } from '@/lib/email/send-notification-email'

export async function sendDailyDigests() {
  console.log('[DIGEST] Starting daily digest job...')

  try {
    const users = await notificationsRepository.getUsersForDigest('daily')

    for (const user of users) {
      // Skip if no email
      if (!user.email) continue

      // Get unread notifications from last 24 hours
      const notifications = await notificationsRepository.getUnreadForDigest(
        user.userId,
        'daily'
      )

      if (notifications.length === 0) {
        console.log(`[DIGEST] No notifications for user ${user.email}, skipping`)
        continue
      }

      // Send digest email (convert Date to string)
      const result = await sendDigestEmail({
        to: user.email,
        userName: user.name || 'User',
        frequency: 'daily',
        notifications: notifications.map(n => ({
          ...n,
          entityType: n.entityType || null,
          entityId: n.entityId || null,
          createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
        })),
      })

      if (result.success) {
        console.log(`[DIGEST] Sent daily digest to ${user.email} (${notifications.length} notifications)`)
      } else {
        console.error(`[DIGEST] Failed to send to ${user.email}:`, result.error)
      }
    }

    console.log(`[DIGEST] Daily digest job completed. Processed ${users.length} users.`)
    return { success: true, processedCount: users.length }
  } catch (error) {
    console.error('[DIGEST] Daily digest job failed:', error)
    return { success: false, error }
  }
}

export async function sendWeeklyDigests() {
  console.log('[DIGEST] Starting weekly digest job...')

  try {
    const users = await notificationsRepository.getUsersForDigest('weekly')

    for (const user of users) {
      // Skip if no email
      if (!user.email) continue

      // Get unread notifications from last 7 days
      const notifications = await notificationsRepository.getUnreadForDigest(
        user.userId,
        'weekly'
      )

      if (notifications.length === 0) {
        console.log(`[DIGEST] No notifications for user ${user.email}, skipping`)
        continue
      }

      // Send digest email (convert Date to string)
      const result = await sendDigestEmail({
        to: user.email,
        userName: user.name || 'User',
        frequency: 'weekly',
        notifications: notifications.map(n => ({
          ...n,
          entityType: n.entityType || null,
          entityId: n.entityId || null,
          createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
        })),
      })

      if (result.success) {
        console.log(`[DIGEST] Sent weekly digest to ${user.email} (${notifications.length} notifications)`)
      } else {
        console.error(`[DIGEST] Failed to send to ${user.email}:`, result.error)
      }
    }

    console.log(`[DIGEST] Weekly digest job completed. Processed ${users.length} users.`)
    return { success: true, processedCount: users.length }
  } catch (error) {
    console.error('[DIGEST] Weekly digest job failed:', error)
    return { success: false, error }
  }
}
