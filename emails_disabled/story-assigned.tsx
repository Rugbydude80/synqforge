import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface StoryAssignedEmailProps {
  userName: string
  storyTitle: string
  storyDescription: string
  projectName: string
  assignedBy: string
  storyUrl: string
}

export default function StoryAssignedEmail({
  userName = 'John',
  storyTitle = 'Implement user authentication',
  storyDescription = 'As a user, I want to log in with email and password',
  projectName = 'SynqForge MVP',
  assignedBy = 'Sarah (Project Manager)',
  storyUrl = 'https://synqforge.app/stories/123',
}: StoryAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been assigned a new story: {storyTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📋 Story Assigned</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            You've been assigned a new story in <strong>{projectName}</strong>.
          </Text>

          <Section style={storyCard}>
            <Heading style={storyTitleStyle}>{storyTitle}</Heading>
            <Text style={storyDescriptionStyle}>{storyDescription}</Text>
          </Section>

          <Text style={text}>
            Assigned by: <strong>{assignedBy}</strong>
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={storyUrl}>
              View Story
            </Button>
          </Section>

          <Text style={footer}>
            SynqForge - AI-powered agile project management
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

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
  margin: '40px 0 20px',
  padding: '0 40px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const storyCard = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
}

const storyTitleStyle = {
  color: '#6366f1',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
}

const storyDescriptionStyle = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const buttonContainer = {
  padding: '0 40px',
  marginTop: '24px',
}

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  marginTop: '32px',
}
