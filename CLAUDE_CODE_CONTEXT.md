# SynqForge - Claude Code Context & Instructions

## Project Overview

**SynqForge** is an AI-powered agile project management platform that transforms requirements into user stories using AI, with intelligent sprint planning and real-time collaboration.

### Core Value Proposition
- Transform requirements into user stories instantly using AI
- AI-powered epic and story generation from documents
- Intelligent sprint planning and velocity tracking
- Real-time collaboration with Kanban boards

## Current Project State (As of January 2025)

### Overall Completeness: 65%
- Backend: 80% complete (solid foundation)
- Frontend: 40% complete (UI exists, needs API integration)
- Authentication: 95% complete (just implemented)

## Tech Stack

### Frontend
- Next.js 14.2.33 (App Router)
- React 18.3.0
- TypeScript
- Tailwind CSS 3.4.1
- Framer Motion (for animations)
- Lucide React (icons)
- NextAuth.js 4.24.0 (authentication)

### Backend
- Next.js API Routes
- Drizzle ORM 0.33.0
- MySQL2 3.11.0
- Zod 3.23.0 (validation)
- bcryptjs (password hashing)
- nanoid 5.0.0 (ID generation)

### AI Integration
- OpenRouter API
- Model: anthropic/claude-sonnet-4
- Supports: story generation, epic generation, document analysis

## Project Structure

```
synqforge/
├── app/
│   ├── page.tsx                    # Landing page (complete)
│   ├── layout.tsx                  # Root layout with SessionProvider
│   ├── providers.tsx               # Session provider wrapper
│   ├── globals.css                 # Tailwind + custom styles
│   ├── auth/
│   │   ├── signin/page.tsx        # Sign-in page (just built)
│   │   ├── signup/page.tsx        # Sign-up page (just built)
│   │   └── error/page.tsx         # Error handling page
│   ├── dashboard/
│   │   └── page.tsx               # Dashboard (uses mock data - needs API connection)
│   ├── ai-generate/
│   │   └── page.tsx               # AI generation UI (needs API connection)
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts  # NextAuth handler
│       │   └── signup/route.ts         # User registration
│       ├── stories/
│       │   ├── route.ts                # List/create stories
│       │   ├── [storyId]/route.ts      # Story CRUD
│       │   ├── bulk/route.ts           # Bulk creation
│       │   ├── [storyId]/sprint/route.ts  # Sprint assignment
│       │   ├── [storyId]/move/route.ts    # Kanban moves
│       │   └── stats/route.ts             # Statistics
│       ├── projects/
│       │   └── [projectId]/             # Project endpoints
│       ├── ai/
│       │   └── *.ts                     # AI generation endpoints
│       └── users/
│           └── *.ts                     # User management
├── components/
│   ├── ui/
│   │   ├── button.tsx              # Button component
│   │   ├── card.tsx                # Card component
│   │   └── badge.tsx               # Badge component
│   └── kanban-board.tsx            # Kanban board (uses mock data)
├── lib/
│   ├── db/
│   │   ├── schema.ts               # Database schema (15 tables)
│   │   └── index.ts                # DB connection
│   ├── auth/
│   │   ├── options.ts              # NextAuth config (COMPLETE)
│   │   └── index.ts                # Auth wrapper
│   ├── middleware/
│   │   └── auth.ts                 # Auth middleware for API routes
│   ├── repositories/
│   │   ├── stories.repository.ts   # Stories CRUD (JUST BUILT)
│   │   ├── projects.repository.ts  # Projects CRUD
│   │   ├── epics.repository.ts     # Epics CRUD
│   │   ├── sprints.repository.ts   # Sprints CRUD
│   │   └── users.repository.ts     # Users CRUD
│   ├── services/
│   │   ├── ai.service.ts           # OpenRouter integration
│   │   └── file-processor.service.ts  # File processing
│   ├── validations/
│   │   ├── story.ts                # Story validation schemas (JUST BUILT)
│   │   ├── ai.ts                   # AI validation schemas
│   │   └── file-upload.ts          # File upload validation
│   └── types/
│       └── index.ts                # TypeScript definitions
├── middleware.ts                    # Route protection (JUST BUILT)
└── tailwind.config.ts              # Tailwind configuration
```

## Database Schema (Complete - 15 Tables)

### Core Tables
1. **organizations** - Company/team workspaces
2. **users** - User accounts with roles (owner, admin, member)
3. **projects** - Projects with metadata
4. **epics** - Epic organization with progress tracking
5. **stories** - User stories with AI tracking
6. **sprints** - Sprint management
7. **sprint_stories** - Many-to-many sprint-story relationship

### Supporting Tables
8. **ai_generations** - AI usage tracking
9. **documents** - Document storage metadata
10. **activities** - Activity logging
11. **user_sessions** - Session management
12. **credit_transactions** - Billing tracking
13. **sprint_metrics** - Performance metrics

### Relationships
- Users → Organizations (many-to-one)
- Projects → Organizations (many-to-one)
- Epics → Projects (many-to-one)
- Stories → Projects (many-to-one)
- Stories → Epics (many-to-one, optional)
- Stories → Users (assignee, many-to-one, optional)
- Sprints → Projects (many-to-one)
- Stories ↔ Sprints (many-to-many via sprint_stories)

## What's Complete ✅

### Backend (80%)
- ✅ Database schema (15 tables, fully designed)
- ✅ Stories repository with full CRUD
- ✅ Projects repository with stats
- ✅ Epics repository with progress tracking
- ✅ Sprints repository
- ✅ Users repository
- ✅ AI service (OpenRouter integration)
- ✅ File processor service
- ✅ Authentication (NextAuth with Google OAuth + credentials)
- ✅ Auth middleware for API protection
- ✅ Route-level middleware for page protection
- ✅ Comprehensive validation schemas (Zod)

### Frontend (40%)
- ✅ Landing page (beautiful, gradient design)
- ✅ Sign-in page (Google OAuth + credentials)
- ✅ Sign-up page (with validation)
- ✅ Error page (auth errors)
- ✅ Dashboard layout (sidebar, metrics)
- ✅ AI Generate page layout
- ✅ Kanban board component
- ✅ UI components (button, card, badge)
- ✅ Design system (purple/emerald gradient theme)

## What Needs Work ⚠️

### Critical (Must Do Next)
1. **Fix Sign-in Page Styling** - Custom page not showing, NextAuth default showing
2. **Connect Dashboard to APIs** - Replace mock data with real API calls
3. **Connect Kanban Board to APIs** - Real-time story updates
4. **Connect AI Generate to APIs** - Wire up AI generation flow
5. **Add Missing UI Components** - Input, Select, Modal, Dialog

### High Priority
6. **Project Management Pages**
   - Projects list page (`/projects`)
   - Project detail page (`/projects/[id]`)
   - Create project modal
   
7. **Story Management**
   - Story detail modal
   - Story creation form
   - Story edit form

8. **User Management**
   - User profile page
   - Settings page
   - Organization management

### Medium Priority
9. **File Upload Implementation** - Actual file storage (currently just processing)
10. **Real-time Updates** - WebSocket or polling for live updates
11. **Dark Mode** - CSS variables ready but not implemented
12. **Error Boundaries** - Better error handling UI

## Environment Variables Required

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<32-char-random-string>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# OpenRouter AI
OPENROUTER_API_KEY=<your-openrouter-key>
```

## Code Style & Patterns

### TypeScript
- Strict mode enabled
- Explicit types for all function parameters and returns
- No `any` types (use `unknown` if needed)
- Interface for complex objects, type for unions/primitives

### React/Next.js
- Use Server Components by default
- Add `'use client'` only when needed (hooks, interactivity)
- Async Server Components for data fetching
- No data fetching in Client Components (pass as props)

### API Routes
- Always use `withAuth` wrapper for protected routes
- Zod validation for all inputs
- Consistent error responses:
  ```typescript
  return NextResponse.json(
    { error: 'Message', details: optional },
    { status: 400 }
  );
  ```

### Repository Pattern
- All database operations go through repositories
- Repositories return typed objects (not raw DB rows)
- Activity logging for all mutations
- Error messages, not throwing generic errors

### Styling
- Tailwind utility classes (v3.4.1)
- Custom colors: `brand-purple-*` and `brand-emerald-*`
- Gradient text: `bg-gradient-to-r from-purple-400 to-emerald-400 text-transparent bg-clip-text`
- Dark theme: `bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900`
- Glass effect: `bg-gray-800/50 backdrop-blur-sm border-gray-700`

### File Naming
- Components: PascalCase (`KanbanBoard.tsx`)
- Utilities: camelCase (`ai.service.ts`)
- Pages: lowercase (`page.tsx`)
- Types: PascalCase interfaces/types in `types/index.ts`

## Current Issues to Fix

### Issue 1: Sign-in Page Showing NextAuth Default
**Problem**: Custom sign-in page exists but NextAuth default white page shows instead
**Location**: `/auth/signin`
**Expected**: Dark themed gradient page with Google OAuth button
**Actual**: Plain white NextAuth default UI

### Issue 2: Mock Data Everywhere
**Problem**: Frontend uses hardcoded mock data
**Files Affected**:
- `app/dashboard/page.tsx` - Mock projects, stories, metrics
- `components/kanban-board.tsx` - Mock story cards
- `app/ai-generate/page.tsx` - Not connected to AI service

**Need**: Connect to real API endpoints, handle loading states, error states

### Issue 3: Missing API Client
**Problem**: No centralized API client for frontend
**Need**: Create `lib/api-client.ts` with:
- Typed fetch wrapper
- Error handling
- Auth token management
- Type-safe API calls

## Immediate Next Steps (Priority Order)

### Step 1: Fix Sign-in Page
Ensure custom sign-in page renders instead of NextAuth default.

### Step 2: Create API Client
Build `lib/api-client.ts` with typed fetch functions for all endpoints.

### Step 3: Connect Dashboard
Replace mock data with real API calls:
- Fetch user's projects
- Fetch recent stories
- Fetch activity feed
- Calculate real metrics

### Step 4: Connect Kanban Board
Make Kanban board functional:
- Fetch stories by status
- Drag and drop to update status
- Real-time updates
- Optimistic UI updates

### Step 5: Build Project Pages
Create missing pages:
- Projects list with search/filter
- Project detail with tabs (stories, epics, sprints, settings)
- Create project modal

## Testing Strategy

### Manual Testing Checklist
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google
- [ ] Access protected routes (should redirect if not authed)
- [ ] Create project via API
- [ ] Create story via API
- [ ] List stories with filters
- [ ] Update story status
- [ ] Assign story to sprint
- [ ] Generate stories with AI

### API Testing
Use Thunder Client or Postman with these base scenarios:
```bash
# Create story
POST http://localhost:3000/api/stories
{
  "projectId": "proj_xxx",
  "title": "Test Story",
  "priority": "high"
}

# List stories
GET http://localhost:3000/api/stories?projectId=proj_xxx&status=backlog,in_progress
```

## Common Commands

```bash
# Development
npm run dev

# Build
npm run build

# Database migrations
npm run db:push
npm run db:studio

# Type checking
npm run type-check

# Linting
npm run lint
```

## Key Design Decisions

### Why Drizzle ORM?
- Type-safe queries
- Excellent TypeScript support
- Lightweight vs Prisma
- Direct SQL access when needed

### Why Repository Pattern?
- Separation of concerns
- Easier to test
- Consistent data access layer
- Activity logging centralized

### Why NextAuth?
- Battle-tested auth solution
- OAuth providers built-in
- JWT session strategy
- Middleware support

### Why OpenRouter?
- Access to multiple AI models
- Cost-effective
- Simple API
- Good rate limits

## Success Criteria

### For Each Feature
1. **Works** - Feature functions as intended
2. **Types** - Full TypeScript coverage, no `any`
3. **Validated** - Zod schemas for inputs
4. **Protected** - Auth checked where needed
5. **Logged** - Activity logged for audit
6. **Error Handled** - Graceful error states
7. **Loading States** - UI feedback during operations
8. **Responsive** - Works on mobile/tablet/desktop

### For API Endpoints
- Returns correct status codes (200, 201, 400, 401, 403, 404, 500)
- Consistent error format
- Proper validation errors with field details
- Auth middleware applied
- Activity logged
- Returns typed data matching TypeScript interfaces

### For UI Components
- Matches design system (purple/emerald gradient)
- Accessible (keyboard navigation, ARIA labels)
- Loading states during async operations
- Error states with retry options
- Empty states with helpful messaging
- Responsive across screen sizes

## Notes for Claude Code

### When Building Features
1. Check existing patterns first (look at stories repository as reference)
2. Use existing validation schemas (extend, don't recreate)
3. Follow repository pattern for all DB access
4. Always add activity logging for mutations
5. Use `withAuth` wrapper for protected API routes
6. Match existing UI component patterns

### When Fixing Bugs
1. Check file exists in correct location
2. Verify imports are correct
3. Check environment variables are set
4. Clear Next.js cache (`.next` folder) if needed
5. Restart dev server after major changes

### When Adding Dependencies
1. Check if similar package already installed
2. Prefer packages that work well with Next.js App Router
3. Update this document with new dependencies
4. Test in both dev and build modes

---

**Current Focus**: Fix sign-in page rendering, then connect dashboard to real APIs.

**Last Updated**: January 2025
**Project Status**: Active Development
**Target Launch**: Q1 2025