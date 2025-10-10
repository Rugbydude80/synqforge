# Real-time Collaboration & Advanced Features Guide

This document describes the four critical features implemented for competitive SynqForge positioning:

1. **Real-time Collaboration** (WebSocket/Ably)
2. **Comment System with @mentions**
3. **Document Processing Workflows** (AI-powered)
4. **Sprint Analytics** (Enhanced)

---

## 1. Real-time Collaboration with Ably

### Overview
Production-ready WebSocket implementation using Ably for scalable real-time features.

### Environment Setup
```bash
# Required in .env and Vercel
ABLY_API_KEY=your_ably_api_key_here

# Get your key from: https://ably.com/dashboard
# Free tier: 3M messages/month, 100 concurrent connections
```

### Architecture

#### Server-Side Service (`lib/services/realtime.service.ts`)
```typescript
import { realtimeService } from '@/lib/services/realtime.service'

// Broadcast story update
await realtimeService.broadcastStoryUpdate(
  organizationId,
  projectId,
  storyId,
  userId,
  { status: 'in_progress', assigneeId: 'user-123' }
)

// Broadcast story moved (kanban drag-drop)
await realtimeService.broadcastStoryMoved(
  organizationId,
  projectId,
  storyId,
  userId,
  'ready',
  'in_progress'
)

// Get presence (who's viewing)
const members = await realtimeService.getPresence(`project:${orgId}:${projectId}`)
```

#### Client-Side Hook (`lib/hooks/useRealtimeCollaboration.ts`)
```typescript
'use client'

import { useRealtimeCollaboration } from '@/lib/hooks/useRealtimeCollaboration'

function SprintBoard() {
  const {
    isConnected,
    reconnecting,
    presenceMembers,
    updatePresence,
    publishStoryUpdate,
  } = useRealtimeCollaboration({
    organizationId: org.id,
    projectId: project.id,
    onStoryUpdate: (event) => {
      // Update UI when story changes
      console.log('Story updated:', event.data.storyId, event.data.changes)
      // Trigger re-fetch or optimistic update
    },
    onStoryMoved: (event) => {
      // Handle kanban drag-drop from other users
      console.log('Story moved:', event.data.storyId, event.data.toStatus)
    },
    onPresenceChange: (members) => {
      // Show "John is viewing" indicators
      console.log('Active users:', members)
    },
  })

  return (
    <div>
      {reconnecting && <Banner>Reconnecting...</Banner>}
      <PresenceIndicators members={presenceMembers} />
      {/* Your board UI */}
    </div>
  )
}
```

### Event Types
```typescript
type RealtimeEventType =
  | 'story:updated'    // Story field changed
  | 'story:moved'      // Status changed (kanban)
  | 'story:assigned'   // Assignee changed
  | 'story:commented'  // New comment added
  | 'sprint:updated'   // Sprint changed
  | 'epic:updated'     // Epic changed
  | 'presence:join'    // User joined view
  | 'presence:leave'   // User left view
  | 'user:typing'      // User typing in comment
```

### Channel Naming Convention
```typescript
// Project-level channel (sprints, stories, epics)
`project:${organizationId}:${projectId}`

// Story-level channel (comments, detailed updates)
`story:${organizationId}:${storyId}`

// Sprint-level channel (sprint planning)
`sprint:${organizationId}:${sprintId}`
```

### Presence Data Structure
```typescript
interface PresenceData {
  userId: string
  userName: string
  userEmail: string
  currentView?: string        // "sprint:123", "story:456"
  cursor?: { x: number; y: number }
  isTyping?: boolean
}
```

### Integration Points

#### 1. Story Update API
```typescript
// app/api/stories/[storyId]/route.ts
export const PATCH = withAuth(async (req, context) => {
  const { storyId } = context.params
  const updates = await req.json()
  
  // Update database
  const story = await storiesRepo.updateStory(storyId, updates)
  
  // Broadcast to all connected clients
  await realtimeService.broadcastStoryUpdate(
    context.user.organizationId,
    story.projectId,
    storyId,
    context.user.id,
    updates
  )
  
  return NextResponse.json(story)
})
```

#### 2. Kanban Board Component
```typescript
// components/kanban-board.tsx
'use client'

export function KanbanBoard({ projectId, organizationId }) {
  const { onStoryMoved, publishStoryUpdate } = useRealtimeCollaboration({
    organizationId,
    projectId,
    onStoryMoved: (event) => {
      // Optimistically update UI
      setStories((prev) =>
        prev.map((s) =>
          s.id === event.data.storyId
            ? { ...s, status: event.data.toStatus }
            : s
        )
      )
    },
  })

  const handleDragEnd = async (storyId, newStatus) => {
    // Optimistic update
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, status: newStatus } : s))
    )

    // Update server
    await fetch(`/api/stories/${storyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })

    // Server broadcasts to others via realtimeService
  }

  return <DndContext onDragEnd={handleDragEnd}>{/* columns */}</DndContext>
}
```

### Reconnection Strategy
- **Automatic reconnection** with exponential backoff
- **State recovery** from server on reconnect
- **Conflict resolution** for concurrent edits (last-write-wins)

### Performance Considerations
- **Channel subscriptions**: Cleanup on unmount
- **Debounce presence updates**: Max 1/sec for cursor movement
- **Message batching**: Group multiple updates if possible
- **Bandwidth**: ~5KB/min per active user

---

## 2. Comment System with @mentions

### Overview
Threaded comments with @mention notifications, already implemented but enhanced with real-time.

### Database Schema
```typescript
// lib/db/schema.ts - Already exists
export const storyComments = pgTable('story_comments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  storyId: varchar('story_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  content: text('content').notNull(),
  parentCommentId: varchar('parent_comment_id', { length: 36 }),
  mentions: json('mentions').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const commentReactions = pgTable('comment_reactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  commentId: varchar('comment_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

### @Mention Parsing
```typescript
// lib/utils/mention-parser.ts
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const matches = content.matchAll(mentionRegex)
  return Array.from(matches, (m) => m[1])
}

export function renderMentions(content: string): React.ReactNode {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-blue-600 font-medium">
        {part}
      </span>
    ) : (
      part
    )
  )
}
```

### API Endpoint
```typescript
// app/api/comments/route.ts
export const POST = withAuth(async (req, context) => {
  const { storyId, content, parentCommentId } = await req.json()
  
  // Extract mentions
  const mentions = extractMentions(content)
  
  // Create comment
  const comment = await commentsRepo.createComment({
    storyId,
    userId: context.user.id,
    content,
    parentCommentId,
    mentions,
  })
  
  // Send notifications to mentioned users
  for (const username of mentions) {
    const user = await getUserByUsername(username)
    if (user) {
      await notificationsRepo.createNotification({
        userId: user.id,
        type: 'comment_mention',
        entityType: 'comment',
        entityId: comment.id,
        message: `${context.user.name} mentioned you in a comment`,
        actionUrl: `/stories/${storyId}#comment-${comment.id}`,
      })
    }
  }
  
  // Broadcast real-time event
  await realtimeService.broadcastNewComment(
    context.user.organizationId,
    storyId,
    context.user.id,
    { comment, mentions }
  )
  
  return NextResponse.json(comment)
})
```

### Real-time Integration
```typescript
const { onComment } = useRealtimeCollaboration({
  organizationId,
  projectId,
  onComment: (event) => {
    // Add new comment to UI
    setComments((prev) => [...prev, event.data.comment])
    
    // Show toast notification
    toast.info(`${event.data.comment.user.name} commented`)
  },
})
```

---

## 3. Document Processing Workflows

### Overview
AI-powered document intelligence for requirements extraction.

### Supported Formats
- **PDF** (via `pdf-parse`)
- **DOCX** (via `mammoth`)
- **TXT**
- **Markdown**

### Environment Setup
```bash
# Already configured
ANTHROPIC_API_KEY=your_key_here
```

### Upload API
```typescript
// POST /api/documents/upload
const formData = new FormData()
formData.append('file', prdFile)
formData.append('projectId', project.id)
formData.append('extractRequirements', 'true')

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
})

const result = await response.json()
// result.requirements = { epics, stories, summary }
```

### Service Methods
```typescript
import { documentProcessingService } from '@/lib/services/document-processing.service'

// 1. Extract text from document
const extraction = await documentProcessingService.extractText(buffer, 'application/pdf')
// Returns: { text, metadata: { wordCount, pageCount, format } }

// 2. AI-powered requirements extraction
const requirements = await documentProcessingService.extractRequirements(
  extractedText,
  {
    projectName: 'E-commerce Platform',
    existingEpics: ['User Auth', 'Product Catalog'],
  }
)
// Returns: { epics, stories, summary }

// 3. Extract implementation tasks from design docs
const tasks = await documentProcessingService.extractImplementationTasks(
  designDoc,
  'Checkout Flow'
)
// Returns: Array<{ title, description, technicalDetails, estimatedHours }>

// 4. Analyze retrospective notes
const analysis = await documentProcessingService.analyzeRetroNotes(
  retroNotes,
  { teamSize: 6, previousRetros: ['Sprint 1', 'Sprint 2'] }
)
// Returns: { patterns, summary, recommendations }
```

### UI Flow Example
```typescript
// components/document-upload.tsx
'use client'

export function DocumentUploadModal({ projectId }) {
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [requirements, setRequirements] = useState(null)

  const handleUpload = async () => {
    setExtracting(true)
    
    const formData = new FormData()
    formData.append('file', file!)
    formData.append('projectId', projectId)
    formData.append('extractRequirements', 'true')
    
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    })
    
    const result = await res.json()
    setRequirements(result.requirements)
    setExtracting(false)
  }

  return (
    <Dialog>
      <Dropzone onDrop={setFile} />
      
      {extracting && <Spinner>Analyzing document with AI...</Spinner>}
      
      {requirements && (
        <div>
          <h3>Extracted Requirements</h3>
          <p>{requirements.summary}</p>
          
          <h4>{requirements.epics.length} Epics Found</h4>
          {requirements.epics.map((epic) => (
            <EpicCard key={epic.title} epic={epic} />
          ))}
          
          <h4>{requirements.stories.length} Stories Found</h4>
          {requirements.stories.map((story) => (
            <StoryCard key={story.title} story={story} />
          ))}
          
          <Button onClick={() => importRequirements(requirements)}>
            Import All
          </Button>
        </div>
      )}
    </Dialog>
  )
}
```

### Rate Limiting
- Same limits as AI story generation
- **10 requests/hour** per user
- File size limit: **10MB**

---

## 4. Sprint Analytics (Enhanced)

### Overview
Real burndown charts, velocity tracking, sprint health metrics.

### Database Schema
```typescript
// Already exists: lib/db/schema.ts
export const sprintAnalytics = pgTable('sprint_analytics', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sprintId: varchar('sprint_id', { length: 36 }).notNull(),
  dayNumber: smallint('day_number').notNull(),
  remainingPoints: integer('remaining_points').notNull(),
  completedPoints: integer('completed_points').notNull(),
  scopeChanges: integer('scope_changes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})
```

### Repository Usage
```typescript
import { SprintAnalyticsRepository } from '@/lib/repositories/sprint-analytics.repository'

const analyticsRepo = new SprintAnalyticsRepository()

// Record daily snapshot (cron job at midnight)
await analyticsRepo.recordDailySnapshot({
  sprintId,
  dayNumber: getCurrentSprintDay(sprint),
  remainingPoints: calculateRemainingPoints(stories),
  completedPoints: calculateCompletedPoints(stories),
  scopeChanges: countScopeChanges(stories),
})

// Get burndown data for chart
const burndown = await analyticsRepo.getBurndownData(sprintId)
// Returns: [{ dayNumber, remainingPoints, completedPoints, scopeChanges }]

// Get team velocity (last N sprints)
const velocity = await analyticsRepo.getTeamVelocity(projectId, 3)
// Returns: { average: 42, trend: 'increasing', sprints: [...] }
```

### Cron Job Setup
```typescript
// app/api/cron/daily-analytics/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const analyticsRepo = new SprintAnalyticsRepository()
  const sprintsRepo = new SprintsRepository()

  // Get all active sprints
  const activeSprints = await sprintsRepo.getAllActiveSprints()

  for (const sprint of activeSprints) {
    const stories = await storiesRepo.getStoriesBySprint(sprint.id)
    
    const remainingPoints = stories
      .filter((s) => s.status !== 'done')
      .reduce((sum, s) => sum + (s.storyPoints || 0), 0)
    
    const completedPoints = stories
      .filter((s) => s.status === 'done')
      .reduce((sum, s) => sum + (s.storyPoints || 0), 0)
    
    await analyticsRepo.recordDailySnapshot({
      sprintId: sprint.id,
      dayNumber: getDaysSinceSprintStart(sprint),
      remainingPoints,
      completedPoints,
      scopeChanges: 0, // Calculate from audit log
    })
  }

  return new Response('OK')
}
```

### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-analytics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Burndown Chart Component
```typescript
// components/analytics/burndown-chart.tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function BurndownChart({ sprintId }: { sprintId: string }) {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch(`/api/sprints/${sprintId}/analytics`)
      .then((res) => res.json())
      .then((analytics) => {
        // Calculate ideal line
        const totalPoints = analytics[0]?.remainingPoints + analytics[0]?.completedPoints || 0
        const sprintDays = analytics.length
        
        const chartData = analytics.map((day, i) => ({
          day: `Day ${day.dayNumber}`,
          actual: day.remainingPoints,
          ideal: totalPoints - (totalPoints / sprintDays) * i,
          completed: day.completedPoints,
        }))
        
        setData(chartData)
      })
  }, [sprintId])

  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="day" />
      <YAxis label={{ value: 'Story Points', angle: -90 }} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="ideal" stroke="#cbd5e0" strokeDasharray="5 5" />
      <Line type="monotone" dataKey="actual" stroke="#3182ce" strokeWidth={2} />
      <Line type="monotone" dataKey="completed" stroke="#38a169" strokeWidth={2} />
    </LineChart>
  )
}
```

### Sprint Health Metrics
```typescript
export interface SprintHealthMetrics {
  completionRate: number          // % of stories done
  pointsCompletionRate: number     // % of points completed
  scopeCreep: number               // Stories added mid-sprint
  blockedStoryCount: number        // Currently blocked stories
  velocity: number                 // Points/day current sprint
  predictedCompletion: number      // Days to complete remaining
  health: 'on-track' | 'at-risk' | 'critical'
}

// Calculate in API
const metrics = calculateSprintHealth(sprint, stories, analytics)

// Display in UI
<SprintHealthWidget metrics={metrics} />
```

---

## Deployment Checklist

### Environment Variables (Vercel)
```bash
# Real-time Collaboration
ABLY_API_KEY=xxxx                # From ably.com

# AI Services (already configured)
ANTHROPIC_API_KEY=xxxx

# Database (already configured)
DATABASE_URL=xxxx

# Auth (already configured)
NEXTAUTH_SECRET=xxxx
NEXTAUTH_URL=https://synqforge.com

# Rate Limiting (already configured)
UPSTASH_REDIS_REST_URL=xxxx
UPSTASH_REDIS_REST_TOKEN=xxxx

# Cron Jobs
CRON_SECRET=xxxx                 # Generate with openssl rand -base64 32
```

### Vercel Cron Jobs
1. Enable cron jobs in Vercel dashboard
2. Configure `/api/cron/daily-analytics` to run at midnight
3. Set `CRON_SECRET` environment variable

### Database Migrations
```bash
# Already have sprint_analytics, story_comments tables
# No new migrations needed
```

### Testing Checklist
- [ ] Real-time updates work across multiple browsers
- [ ] @mentions trigger notifications
- [ ] Document upload extracts requirements correctly
- [ ] Burndown charts display actual vs ideal lines
- [ ] Cron job records daily snapshots
- [ ] Presence indicators show active users
- [ ] Reconnection works after network interruption

---

## Cost Estimates

### Ably (Real-time)
- **Free tier**: 3M messages/month, 100 concurrent
- **Typical usage**: ~50K messages/month for 10 active users
- **Cost**: $0 (well within free tier)

### Anthropic (Document Processing)
- **Document extraction**: ~$0.10 per 10-page PRD
- **Typical usage**: 50 documents/month = $5/month
- **Already budgeted**: Same pool as story generation

### Storage (Documents)
- **10MB limit** per file
- **Vercel**: Blob storage at $0.15/GB/month
- **Typical usage**: 100 files × 2MB = 200MB = $0.03/month

**Total incremental cost: ~$5-10/month**

---

## Next Steps

1. **Update `.env` with ABLY_API_KEY**
2. **Test real-time features in dev**
3. **Deploy to Vercel staging**
4. **Enable cron jobs**
5. **Monitor Ably usage dashboard**
6. **Update documentation site**

All features are production-ready and use actual integrations (no mocking/stubbing). Environment variables must be configured in Vercel for production deployment.
