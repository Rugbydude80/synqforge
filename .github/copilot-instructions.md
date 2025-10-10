# GitHub Copilot Instructions - SynqForge

## Architecture Overview
SynqForge is a **Next.js 15 App Router** AI-powered project management platform with multi-tenant architecture. Key points:
- **Server Components by default** - Only add `'use client'` when using hooks, browser APIs, or interactivity
- **Multi-tenant via Organizations** - All queries filter by `organizationId` for data isolation
- **PostgreSQL + Drizzle ORM** - Schema in `lib/db/schema.ts`, migrations in `drizzle/`
- **Repository Pattern** - Business logic in `lib/repositories/`, services in `lib/services/`

## Critical Workflows

### Database Operations
```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:push       # Push schema to database (dev only)
npm run db:migrate    # Run migrations (production)
npm run db:studio     # Open Drizzle Studio GUI
```
**Always commit SQL files in `drizzle/migrations/` after schema changes.**

### Development
```bash
npm run dev           # Start with Turbopack (default)
npm run build         # Production build - run before deployment
npm run lint          # ESLint + TypeScript checks
npm run typecheck     # TypeScript validation only
```

### Testing
Integration tests documented in `TESTING.md`. Use curl examples after `npm run dev`:
```bash
# Authenticate via browser first, then test APIs
curl http://localhost:3000/api/organizations/YOUR_ORG_ID/projects
```
Shell scripts: `test-production.sh`, `test-ai-endpoint.sh`, `test-rate-limit.sh`

## Authentication Pattern
**NextAuth.js JWT Strategy** - See `AUTHENTICATION.md` for full details.

### API Route Protection
Wrap all protected routes with `withAuth` middleware:
```typescript
import { withAuth, AuthContext } from '@/lib/middleware/auth'

async function handler(req: NextRequest, context: AuthContext) {
  const { user } = context // Contains id, email, organizationId, role
  // user.organizationId is ALWAYS set - use for org filtering
  // Your logic here
}

export const GET = withAuth(handler, {
  requireOrg: true,     // Validates orgId from URL matches user's org
  requireProject: true, // Validates project access
  requireAdmin: true,   // Role-based check
})
```

**Never query across organizations** - Repository constructors take `UserContext` to enforce isolation.

### Client-Side Auth
```tsx
// Server Component (default)
import { auth } from '@/lib/auth'
const session = await auth()

// Client Component
'use client'
import { useSession } from 'next-auth/react'
const { data: session, status } = useSession()
```

## AI Integration Pattern
**Anthropic Claude via `AIService`** - See `lib/services/ai.service.ts`

### Rate Limiting (Upstash Redis)
**Always apply to AI endpoints:**
```typescript
import { aiGenerationRateLimit, checkRateLimit } from '@/lib/rate-limit'

const rateLimitResult = await checkRateLimit(
  `ai:operation:${context.user.id}`,
  aiGenerationRateLimit
)
if (!rateLimitResult.success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { 
    status: 429,
    headers: { 'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString() }
  })
}
```

### Usage Tracking
Track all AI operations for billing:
```typescript
const response = await aiService.generateStories(requirements, context, count)

await aiService.trackUsage(
  userId,
  organizationId,
  response.model,
  response.usage, // { promptTokens, completionTokens, totalTokens }
  'story_generation',
  inputPrompt,
  JSON.stringify(output)
)
```

## Data Access Patterns

### Repository Usage
```typescript
import { ProjectsRepository } from '@/lib/repositories/projects'

// In withAuth handler
const projectsRepo = new ProjectsRepository(context.user)
const projects = await projectsRepo.getProjects() // Auto-filtered by org
```

### Query Pattern with Drizzle
```typescript
import { db } from '@/lib/db'
import { projects, epics, stories } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

// Always filter by organizationId
const result = await db
  .select({
    id: projects.id,
    name: projects.name,
    epicCount: sql<number>`(
      SELECT COUNT(*) FROM ${epics} 
      WHERE ${epics.projectId} = ${projects.id}
    )`,
  })
  .from(projects)
  .where(eq(projects.organizationId, userContext.organizationId))
  .orderBy(desc(projects.createdAt))
```

## Validation Pattern
**Zod schemas in `lib/validations/`** - Validate early, return 400 on errors:
```typescript
import { z } from 'zod'
import { generateStoriesSchema } from '@/lib/validations/ai'

try {
  const body = await req.json()
  const validated = generateStoriesSchema.parse(body)
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.errors },
      { status: 400 }
    )
  }
  throw error
}
```

## Styling Conventions
**Tailwind CSS with shadcn/ui components** - See `components/ui/`
- Use `cn()` helper from `@/lib/utils` to merge class names conditionally
- Brand colors: `brand-purple-*`, `brand-emerald-*` (defined in `tailwind.config.ts`)
- Dark mode via `next-themes` - use `dark:` prefix for dark mode styles
- 2-space indentation, ordered classes: layout → spacing → typography → colors

## File Organization
```
app/
├── api/              # API routes with route.ts handlers
│   ├── ai/           # AI generation endpoints
│   ├── projects/     # Project CRUD
│   └── stories/      # Story management
├── dashboard/        # Main dashboard pages
└── (auth)/           # Auth routes group
lib/
├── repositories/     # Data access layer (org-filtered)
├── services/         # Business logic (AI, email)
├── validations/      # Zod schemas
├── middleware/       # withAuth, rate limiting
└── db/
    └── schema.ts     # Single source of truth for DB schema
components/
├── ui/               # shadcn/ui primitives
└── *.tsx             # Feature components (add 'use client' only if needed)
```

## Common Pitfalls
1. **Don't query without organizationId filter** - Data leaks between tenants
2. **Don't use 'use client' unnecessarily** - Server Components are default, faster, and more secure
3. **Don't skip rate limiting on AI endpoints** - Protects against abuse and cost overruns
4. **Don't forget to run `db:generate` after schema changes** - Migrations won't auto-create
5. **Don't commit `.env` or `.env.local`** - Use `.env.example` for documentation

## Environment Variables
Required for development (see `VERCEL_ENV_SETUP.md` for production):
```bash
DATABASE_URL=                # PostgreSQL connection string
NEXTAUTH_SECRET=            # Generate with `openssl rand -base64 32`
NEXTAUTH_URL=               # http://localhost:3000 (dev)
ANTHROPIC_API_KEY=          # Claude API key
UPSTASH_REDIS_REST_URL=     # Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_TOKEN=
GOOGLE_CLIENT_ID=           # OAuth (optional)
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=             # Email notifications (optional)
```

## Sprint & Epic Workflows

### Sprint Lifecycle State Machine
```typescript
planning → active → completed | cancelled
```

**Critical Business Rules:**
- Only ONE active sprint per project at a time
- Cannot start sprint without committed stories
- Sprint dates cannot overlap within same project
- Story points frozen once sprint starts (track scope changes separately)

### Sprint Operations
```typescript
import { SprintsRepository } from '@/lib/repositories/sprints'

const sprintsRepo = new SprintsRepository(context.user)

// Start sprint - validates capacity, locks story points
await sprintsRepo.startSprint(sprintId)

// Add story to sprint - checks sprint status, story availability
await sprintsRepo.addStoriesToSprint(sprintId, [storyId])

// Complete sprint - calculates velocity, generates analytics
await sprintsRepo.completeSprint(sprintId)
```

### Story State Transitions
```typescript
backlog → ready → in_progress → review → done
                              ↓
                           blocked (temporary state)
```

**State Rules:**
- `ready` = approved for sprint, has acceptance criteria, estimated
- `in_progress` = assigned to sprint, has assignee
- `review` = all acceptance criteria met, awaiting approval
- `done` = immutable, counts toward sprint velocity
- `blocked` = preserves previous state, requires unblock reason

### Epic Breakdown Pattern
```typescript
// Epic → Stories hierarchy enforced at DB level
const epic = await epicsRepo.createEpic({
  projectId,
  title: 'User Authentication System',
  goals: ['SSO', 'MFA', 'Password reset']
})

// Stories MUST reference epicId
const stories = await storiesRepo.bulkCreate(
  generatedStories.map(s => ({ ...s, epicId: epic.id }))
)
```

## AI Credit System

### Credit Consumption
**Operations & Costs:**
```typescript
// Tracked in creditTransactions table
{
  'story_generation': ~50 credits per story,    // 1 story = ~2000 tokens
  'story_validation': ~20 credits per validation, // Analysis only
  'epic_creation': ~100 credits per epic,        // Includes story breakdown
  'requirements_analysis': ~150 credits,         // Document processing
}
```

### Usage Tracking Pattern
```typescript
// ALWAYS track after AI operations
await aiService.trackUsage(
  userId,
  organizationId,
  response.model,
  {
    promptTokens: response.usage.promptTokens,
    completionTokens: response.usage.completionTokens,
    totalTokens: response.usage.totalTokens
  },
  'story_generation',
  inputPrompt,
  JSON.stringify(generatedStories)
)

// Deduct credits from org balance
await db.insert(creditTransactions).values({
  organizationId,
  userId,
  type: 'usage',
  amount: -calculateCredits(response.usage.totalTokens),
  description: 'AI Story Generation',
  aiGenerationId: generationRecord.id,
  balanceAfter: newBalance
})
```

### Credit Balance Check
```typescript
// Check BEFORE expensive AI operations
const [orgBalance] = await db
  .select({ balance: sum(creditTransactions.amount) })
  .from(creditTransactions)
  .where(eq(creditTransactions.organizationId, orgId))

if (orgBalance < MINIMUM_CREDITS_FOR_OPERATION) {
  return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
}
```

## Story Templates System

### Template Categories
```typescript
'authentication' | 'crud' | 'payments' | 'notifications' | 'admin' | 'api' | 'custom'
```

### Template Application with Variable Substitution
```typescript
import { StoryTemplatesRepository } from '@/lib/repositories/story-templates.repository'

const templatesRepo = new StoryTemplatesRepository()

// Apply template to project/epic
const stories = await templatesRepo.applyTemplate(templateId, {
  projectId: 'proj-123',
  epicId: 'epic-456',
  createdBy: userId,
  variables: {
    entity: 'Product',      // "Create {{entity}}" → "Create Product"
    feature: 'Inventory',
    role: 'Admin'
  }
})

// Template stories support variable substitution in:
// - title, description, acceptanceCriteria
// - Syntax: {{variableName}}
```

### Creating Custom Templates
```typescript
await templatesRepo.createTemplate({
  organizationId,
  createdBy: userId,
  templateName: 'E-commerce Checkout Flow',
  category: 'custom',
  description: 'Complete checkout with payment gateway',
  stories: [
    {
      title: 'Shopping Cart Management',
      description: 'Add/remove {{entity}} items',
      acceptanceCriteria: [
        'User can add {{entity}} to cart',
        'Cart persists across sessions',
        'Real-time price calculations'
      ],
      storyPoints: 5,
      storyType: 'feature'
    }
  ],
  isPublic: false  // Organization-only vs platform-wide
})
```

## Notification System

### Notification Types & Triggers
```typescript
'story_assigned'     → Story.assigneeId changed
'comment_mention'    → Comment contains @username
'sprint_starting'    → Sprint.status → 'active' (24h before)
'story_blocked'      → Story.status → 'blocked'
'epic_completed'     → All epic stories → 'done'
'comment_reply'      → Comment.parentCommentId match
```

### Notification Pattern
```typescript
import { NotificationsRepository } from '@/lib/repositories/notifications.repository'

const notificationsRepo = new NotificationsRepository()

// Create notification
await notificationsRepo.createNotification({
  userId: story.assigneeId,
  type: 'story_assigned',
  entityType: 'story',
  entityId: story.id,
  message: `${assigner.name} assigned "${story.title}" to you`,
  actionUrl: `/projects/${story.projectId}/stories/${story.id}`
})

// Respect user preferences
const prefs = await notificationsRepo.getUserPreferences(userId)
if (prefs.emailEnabled && prefs.notifyOnAssignment) {
  await emailService.sendStoryAssigned(user, story)
}
```

### Email Templates (React Email)
```tsx
// emails/story-assigned.tsx
import { Html, Text, Button } from '@react-email/components'

export default function StoryAssignedEmail({ story, assigner, actionUrl }) {
  return (
    <Html>
      <Text>{assigner.name} assigned a story to you</Text>
      <Text>{story.title}</Text>
      <Button href={actionUrl}>View Story</Button>
    </Html>
  )
}
```

### Digest Frequencies
```typescript
'real_time'  → Immediate email on every event
'daily'      → Batched summary at 9 AM user timezone
'weekly'     → Monday 9 AM summary
```

## Analytics & Metrics

### Sprint Analytics Tracking
```typescript
import { SprintAnalyticsRepository } from '@/lib/repositories/sprint-analytics.repository'

const analyticsRepo = new SprintAnalyticsRepository()

// Daily snapshot (run via cron job)
await analyticsRepo.recordDailySnapshot({
  sprintId,
  dayNumber: getCurrentSprintDay(sprint),
  remainingPoints: calculateRemainingPoints(sprintStories),
  completedPoints: calculateCompletedPoints(sprintStories),
  scopeChanges: countScopeChanges(sprintStories)
})

// Burndown chart data
const burndown = await analyticsRepo.getBurndownData(sprintId)
// Returns: { dayNumber, remainingPoints, completedPoints, scopeChanges }[]
```

### Velocity Calculation
```typescript
// Completed points in sprint ÷ sprint duration (days)
const velocity = sprint.completedPoints / getSprintDurationDays(sprint)

// Historical velocity (last 3 sprints avg)
const historicalVelocity = await analyticsRepo.getTeamVelocity(projectId, 3)
```

### Sprint Health Metrics
```typescript
// Auto-calculated in components/analytics/sprint-health-widget.tsx
{
  completionRate: completedStories / totalStories,
  pointsCompletionRate: completedPoints / committedPoints,
  scopeCreep: addedStoriesMidSprint / originalCommittedStories,
  blockedStoryCount: stories.filter(s => s.status === 'blocked').length,
  velocity: completedPoints / sprintDays,
  predictedCompletion: remainingPoints / currentVelocity  // Days
}
```

## Permissions & Multi-tenancy

### Organization Isolation
**CRITICAL:** Every query MUST filter by `organizationId`:
```typescript
// ❌ WRONG - Data leak across organizations
await db.select().from(stories).where(eq(stories.projectId, projectId))

// ✅ CORRECT - Org-scoped query
await db.select().from(stories)
  .where(and(
    eq(stories.projectId, projectId),
    eq(stories.organizationId, userContext.organizationId)
  ))

// ✅ BEST - Repository handles it automatically
const storiesRepo = new StoriesRepository(userContext)
await storiesRepo.getStoriesByProject(projectId)  // Auto-filtered
```

### Role-Based Access Control
```typescript
export type Role = 'admin' | 'member' | 'viewer'

// Permissions matrix:
{
  viewer: ['read:stories', 'read:epics', 'read:sprints'],
  member: [...viewer, 'create:stories', 'update:stories', 'comment'],
  admin: [...member, 'create:projects', 'manage:team', 'delete:*', 'manage:billing']
}
```

### Story Access Helper
```typescript
import { assertStoryAccessible } from '@/lib/permissions/story-access'

// Validates org ownership, throws if unauthorized
const story = await assertStoryAccessible(storyId, context.user.organizationId)
// Returns: { id, projectId } - minimal data to prevent info leaks
```

## Testing Strategy

### Integration Test Pattern
```bash
# 1. Start dev server
npm run dev

# 2. Authenticate via browser (http://localhost:3000/auth/signin)
# 3. Extract session cookie from browser DevTools

# 4. Test API with curl
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  http://localhost:3000/api/organizations/org-123/projects
```

### Test Scripts
```bash
./test-production.sh          # Full smoke test suite
./test-ai-endpoint.sh         # AI generation tests
./test-rate-limit.sh          # Rate limit validation
scripts/smoke.sh              # Quick health check
```

### Mocking AI Responses
```typescript
// In tests, mock aiService.generateStories
jest.mock('@/lib/services/ai.service', () => ({
  aiService: {
    generateStories: jest.fn().mockResolvedValue({
      stories: [{ title: 'Test Story', ... }],
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      model: 'claude-sonnet-4-5'
    })
  }
}))
```

## Real-time Collaboration

### WebSocket Architecture (Ably)
**Production WebSocket service** - NO mocking/stubbing:
```typescript
import { realtimeService } from '@/lib/services/realtime.service'

// Server-side broadcasting
await realtimeService.broadcastStoryUpdate(orgId, projectId, storyId, userId, changes)
await realtimeService.broadcastStoryMoved(orgId, projectId, storyId, userId, fromStatus, toStatus)

// Client-side hook
const { isConnected, presenceMembers, publishStoryUpdate } = useRealtimeCollaboration({
  organizationId,
  projectId,
  onStoryUpdate: (event) => { /* handle update */ },
  onPresenceChange: (members) => { /* show active users */ },
})
```

**Channel naming**: `project:${orgId}:${projectId}`, `story:${orgId}:${storyId}`

**Event types**: `story:updated`, `story:moved`, `sprint:updated`, `story:commented`, `presence:join`

**Environment**: Requires `ABLY_API_KEY` in `.env` and Vercel (get from ably.com dashboard)

### Presence Tracking
```typescript
// Show "John is viewing Sprint 42" indicators
interface PresenceData {
  userId: string
  userName: string
  userEmail: string
  currentView?: string  // "sprint:123", "story:456"
  cursor?: { x: number; y: number }
  isTyping?: boolean
}
```

## Document Processing Workflows

### AI-Powered Document Intelligence
```typescript
import { documentProcessingService } from '@/lib/services/document-processing.service'

// Extract text from PDF/DOCX/TXT/MD
const extraction = await documentProcessingService.extractText(buffer, mimeType)

// AI requirements extraction from PRD
const requirements = await documentProcessingService.extractRequirements(text, {
  projectName: 'E-commerce',
  existingEpics: ['User Auth', 'Checkout'],
})
// Returns: { epics, stories, summary }

// Extract implementation tasks from design docs
const tasks = await documentProcessingService.extractImplementationTasks(designText, 'Checkout Flow')

// Analyze retrospective notes
const analysis = await documentProcessingService.analyzeRetroNotes(retroNotes, { teamSize: 6 })
// Returns: { patterns, summary, recommendations }
```

**Upload endpoint**: `POST /api/documents/upload` (multipart/form-data)
- Max file size: 10MB
- Rate limited: Same as AI story generation
- Supports: PDF, DOCX, TXT, Markdown

### Document Upload Flow
```typescript
const formData = new FormData()
formData.append('file', prdFile)
formData.append('projectId', project.id)
formData.append('extractRequirements', 'true')  // Enable AI extraction

const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
const result = await response.json()
// result.requirements = { epics: [...], stories: [...], summary: "..." }
```

## Enhanced Sprint Analytics

### Burndown Charts & Velocity Tracking
```typescript
import { SprintAnalyticsRepository } from '@/lib/repositories/sprint-analytics.repository'

const analyticsRepo = new SprintAnalyticsRepository()

// Record daily snapshot (via cron job)
await analyticsRepo.recordDailySnapshot({
  sprintId,
  dayNumber: getCurrentSprintDay(sprint),
  remainingPoints: calculateRemaining(stories),
  completedPoints: calculateCompleted(stories),
  scopeChanges: countScopeChanges(stories),
})

// Get burndown data for chart
const burndown = await analyticsRepo.getBurndownData(sprintId)
// Returns: [{ dayNumber, remainingPoints, completedPoints, scopeChanges }]

// Get team velocity (last N sprints)
const velocity = await analyticsRepo.getTeamVelocity(projectId, 3)
```

### Daily Analytics Cron Job
```typescript
// app/api/cron/daily-analytics/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Record snapshots for all active sprints
  const activeSprints = await getAllActiveSprints()
  for (const sprint of activeSprints) {
    await recordDailySnapshot(sprint)
  }
}
```

**Vercel cron**: Configure in `vercel.json` to run at midnight daily

### Sprint Health Metrics
```typescript
interface SprintHealthMetrics {
  completionRate: number           // % of stories done
  pointsCompletionRate: number     // % of points completed
  scopeCreep: number               // Stories added mid-sprint
  blockedStoryCount: number        // Currently blocked
  velocity: number                 // Points/day current sprint
  predictedCompletion: number      // Days to complete remaining
  health: 'on-track' | 'at-risk' | 'critical'
}
```

## Comment System with @mentions

### Already Implemented, Enhanced with Real-time
```typescript
// Extract @mentions from comment text
import { extractMentions } from '@/lib/utils/mention-parser'

const mentions = extractMentions(commentText)  // ["johndoe", "janedoe"]

// Create comment with mentions
await commentsRepo.createComment({
  storyId,
  userId,
  content: "Hey @johndoe, can you review this?",
  mentions,
})

// Trigger notifications
for (const username of mentions) {
  await notificationsRepo.createNotification({
    userId: user.id,
    type: 'comment_mention',
    entityType: 'comment',
    entityId: comment.id,
  })
}

// Broadcast real-time event
await realtimeService.broadcastNewComment(orgId, storyId, userId, { comment, mentions })
```

**Database**: `storyComments` table has `mentions: json[]` field, `commentReactions` for emoji reactions

## Key Files to Reference
- `AGENTS.md` - Repository conventions and guidelines
- `AUTHENTICATION.md` - Auth architecture and patterns
- `TESTING.md` - API testing examples with curl
- `REALTIME_COLLABORATION_GUIDE.md` - **Complete guide for all 4 features**
- `lib/db/schema.ts` - Complete database schema (749 lines)
- `lib/middleware/auth.ts` - `withAuth` implementation details
- `lib/services/ai.service.ts` - AI integration patterns
- `lib/services/realtime.service.ts` - **Real-time collaboration service**
- `lib/services/document-processing.service.ts` - **Document AI processing**
- `lib/hooks/useRealtimeCollaboration.ts` - **Client-side real-time hook**
- `lib/repositories/sprints.ts` - Sprint lifecycle operations (694 lines)
- `lib/repositories/story-templates.repository.ts` - Template management (588 lines)
- `lib/repositories/sprint-analytics.repository.ts` - **Metrics & burndown data**
