import React from 'react'
import { projectUrl, storyUrl } from '@/lib/urls'

// Prevent this component from being server-rendered during build
export const dynamic = 'force-dynamic'

const resolveBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://synqforge.app').replace(/\/$/, '')

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  createdAt: string
}

export interface NotificationDigestEmailProps {
  userName: string
  frequency: 'daily' | 'weekly'
  notifications: NotificationItem[]
  unsubscribeUrl?: string
}

const baseStyles = {
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  color: '#1f2937',
}

const sectionStyle: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  padding: '16px',
  marginBottom: '16px',
  backgroundColor: '#ffffff',
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    story_assigned: '📋',
    story_updated: '✏️',
    comment_mention: '💬',
    comment_reply: '↩️',
    sprint_started: '🚀',
    sprint_ending: '⏰',
    story_blocked: '🚫',
    story_completed: '✅',
  }
  return icons[type] || '🔔'
}

function getEntityUrl(entityType: string | null, entityId: string, baseUrl: string): string {
  switch (entityType) {
    case 'story':
      return `${baseUrl}${storyUrl(entityId)}`
    case 'project':
      return `${baseUrl}${projectUrl(entityId)}`
    case 'sprint':
      return `${baseUrl}/sprints/${entityId}`
    default:
      return `${baseUrl}/notifications`
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }
  return 'Recently'
}

export default function NotificationDigestEmail({
  userName,
  frequency,
  notifications,
  unsubscribeUrl,
}: NotificationDigestEmailProps) {
  const baseUrl = resolveBaseUrl()
  const unsubscribeHref = unsubscribeUrl || `${baseUrl}/settings/notifications`
  const previewText = `You have ${notifications.length} unread notification${notifications.length === 1 ? '' : 's'}`
  const frequencyLabel = frequency === 'daily' ? 'Daily' : 'Weekly'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{frequencyLabel} notification digest</title>
      </head>
      <body style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px', ...baseStyles }}>
        <span style={{ display: 'none', visibility: 'hidden', opacity: 0, height: 0 }}>{previewText}</span>

        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px' }}
        >
          <tbody>
            <tr>
              <td>
                <h1 style={{ marginTop: 0, fontSize: '24px' }}>📬 {frequencyLabel} Notification Digest</h1>
                <p style={{ marginBottom: '16px' }}>Hi {userName},</p>
                <p style={{ marginBottom: '16px' }}>
                  Here&apos;s your {frequency} summary of activity on SynqForge. You have{' '}
                  <strong>{notifications.length}</strong> unread notification
                  {notifications.length === 1 ? '' : 's'}.
                </p>

                <div>
                  {notifications.map((notification) => (
                    <div key={notification.id} style={sectionStyle}>
                      <div style={{ fontSize: '20px', marginBottom: '8px' }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{notification.title}</div>
                      <div style={{ marginBottom: '8px', color: '#4b5563' }}>{notification.message}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTimeAgo(notification.createdAt)}</div>
                      {notification.entityId ? (
                        <a
                          href={getEntityUrl(notification.entityType, notification.entityId, baseUrl)}
                          style={{ display: 'inline-block', marginTop: '12px', color: '#6366f1', textDecoration: 'none' }}
                        >
                          View →
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <a
                    href={`${baseUrl}/notifications`}
                    style={{
                      display: 'inline-block',
                      padding: '12px 20px',
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View all notifications
                  </a>
                </div>

                <p style={{ marginTop: '24px', fontSize: '12px', color: '#6b7280' }}>
                  You&apos;re receiving this {frequency} digest because of your notification preferences.
                </p>
                <a href={unsubscribeHref} style={{ fontSize: '12px', color: '#6b7280' }}>
                  Manage notification preferences
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}
