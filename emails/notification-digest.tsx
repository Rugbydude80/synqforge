import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  createdAt: string
}

interface NotificationDigestEmailProps {
  userName: string
  frequency: 'daily' | 'weekly'
  notifications: NotificationItem[]
  unsubscribeUrl?: string
}

export default function NotificationDigestEmail({
  userName,
  frequency,
  notifications,
  unsubscribeUrl = 'https://synqforge.app/settings/notifications',
}: NotificationDigestEmailProps) {
  const previewText = `You have ${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}`
  const frequencyText = frequency === 'daily' ? 'Daily' : 'Weekly'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📬 {frequencyText} Notification Digest</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            Here's your {frequency} summary of activity on SynqForge. You have{' '}
            <strong>{notifications.length}</strong> unread notification
            {notifications.length > 1 ? 's' : ''}.
          </Text>

          <Section style={notificationSection}>
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <Section style={notificationCard}>
                  <Text style={notificationType}>{getNotificationIcon(notification.type)}</Text>
                  <Text style={notificationTitle}>{notification.title}</Text>
                  <Text style={notificationMessage}>{notification.message}</Text>
                  <Text style={notificationTime}>
                    {formatTimeAgo(notification.createdAt)}
                  </Text>
                  {notification.entityId && (
                    <Link
                      href={getEntityUrl(notification.entityType, notification.entityId)}
                      style={notificationLink}
                    >
                      View →
                    </Link>
                  )}
                </Section>
                {index < notifications.length - 1 && <Hr style={divider} />}
              </div>
            ))}
          </Section>

          <Section style={footer}>
            <Link href="https://synqforge.app/notifications" style={button}>
              View All Notifications
            </Link>

            <Text style={footerText}>
              You're receiving this {frequency} digest because of your notification preferences.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Manage notification preferences
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
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

function getEntityUrl(entityType: string | null, entityId: string): string {
  const baseUrl = 'https://synqforge.app'
  switch (entityType) {
    case 'story':
      return `${baseUrl}/stories/${entityId}`
    case 'sprint':
      return `${baseUrl}/sprints/${entityId}`
    case 'project':
      return `${baseUrl}/projects/${entityId}`
    case 'comment':
      return `${baseUrl}/comments/${entityId}`
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
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else {
    return 'Recently'
  }
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const notificationSection = {
  padding: '0 40px',
  marginTop: '32px',
}

const notificationCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '8px',
}

const notificationType = {
  fontSize: '20px',
  margin: '0 0 8px 0',
}

const notificationTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px 0',
}

const notificationMessage = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
}

const notificationTime = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0 0 8px 0',
}

const notificationLink = {
  color: '#7c3aed',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
}

const footer = {
  padding: '0 40px',
  marginTop: '32px',
}

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  marginBottom: '24px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '24px',
}

const unsubscribeLink = {
  color: '#9ca3af',
  fontSize: '12px',
  textDecoration: 'underline',
}
