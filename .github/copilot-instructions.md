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

## Key Files to Reference
- `AGENTS.md` - Repository conventions and guidelines (this file)
- `AUTHENTICATION.md` - Auth architecture and patterns
- `TESTING.md` - API testing examples with curl
- `lib/db/schema.ts` - Complete database schema (749 lines)
- `lib/middleware/auth.ts` - `withAuth` implementation details
- `lib/services/ai.service.ts` - AI integration patterns
