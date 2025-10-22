# Epics & Stories File Structure Summary

## Core Files (Must Read)

### 1. Database Schema
**File:** `/lib/db/schema.ts` (Lines 237-319)
```
epics table (237-274)
- id, projectId, organizationId, title, description, goals
- color, status, priority, aiGenerated, aiGenerationPrompt
- createdBy, assignedTo, startDate, targetDate
- aggregate fields: totalStories, completedStories, totalPoints, completedPoints, progressPct
- indexes for project, org, status, assignee, progress, org-status

stories table (276-319)
- id, organizationId, epicId, projectId, title, description
- acceptanceCriteria, storyPoints, priority, status
- storyType (feature | bug | task | spike)
- tags, labels, aiGenerated, aiPrompt, aiModelUsed
- aiValidationScore, aiSuggestions, aiConfidenceScore
- sourceDocumentId, createdBy, assigneeId, doneAt
- indexes for org, epic, project, status, assignee, priority, sourceDoc, done_at, sprint_done
```

### 2. Epic Repository
**File:** `/lib/repositories/epics.ts`
```
EpicsRepository class (requires UserContext)
- getEpics(projectId?) - List epics with story counts
- getEpicById(epicId) - Get single epic, verifies access
- getEpicProgress(epicId) - Calculate progress metrics
- getEpicStories(epicId) - Get stories in epic
- createEpic(data) - Create new epic, validate project/assignee
- updateEpic(epicId, updates) - Update epic, log changes
- publishEpic(epicId) - Publish epic, update story statuses
- deleteEpic(epicId) - Delete if no stories
- Permission checks: canModify(), canModifyEpic(), canPublishEpic()
```

### 3. Story Repository
**File:** `/lib/repositories/stories.repository.ts`
```
StoriesRepository class (singleton pattern)
- create(input, userId) - Create story, validate project/epic/assignee
- getById(storyId) - Get story with all relations (project, epic, assignee, creator, sprint)
- update(storyId, input, userId) - Update story, track changes
- delete(storyId, userId) - Hard delete, log before deletion, remove from sprints
- list(filters, options) - List with filters (org, project, epic, assignee, status, priority, aiGenerated)
              Supports pagination, ordering, returns total count
```

### 4. Story Validation
**File:** `/lib/validations/story.ts`
```
createStorySchema - projectId, epicId, title, description, acceptanceCriteria, storyPoints, priority, status, tags, aiGenerated, aiPrompt, aiModelUsed
updateStorySchema - same as create but all optional
storyFiltersSchema - projectId, epicId, assigneeId, status (single/array), priority (single/array), aiGenerated, tags, limit, offset, orderBy, orderDirection
```

### 5. Epic Validation
**File:** `/lib/types/index.ts`
```
CreateEpicSchema - projectId, title, description, goals, priority, assignedTo, startDate, targetDate, aiGenerated, aiGenerationPrompt
UpdateEpicSchema - all fields optional plus status
```

## API Route Files

### Epic API Routes
**File:** `/app/api/projects/[projectId]/epics/route.ts`
```
GET - List epics for project
POST - Create epic in project
```

**File:** `/app/api/epics/[epicId]/stories/route.ts`
```
GET - Get stories for epic
```

### Story API Routes
**File:** `/app/api/stories/route.ts`
```
GET - List stories with filters & pagination
POST - Create story
```

**File:** `/app/api/stories/[storyId]/route.ts`
```
GET - Get single story
PATCH - Update story
DELETE - Delete story
```

**Other Story Routes:**
- `/app/api/stories/bulk/route.ts` - Create multiple stories
- `/app/api/stories/stats/route.ts` - Get project statistics
- `/app/api/stories/[storyId]/move/route.ts` - Change story status
- `/app/api/stories/[storyId]/sprint/route.ts` - Assign to sprint
- `/app/api/stories/export/route.ts` - Export stories

## UI Component Files

### Epic Components
**File:** `/components/epic-form-modal.tsx`
```
EpicFormModal component
- Props: open, onOpenChange, projectId, epic?, onSuccess?
- Features: Create/edit epic, publish epic
- Form: title, description, goals, priority, color, startDate, targetDate
- Handles: Form submission, epic publishing
```

**File:** `/components/epic-detail-drawer.tsx`
```
Epic detail view component
```

### Story Components
**File:** `/components/story-form-modal.tsx`
```
StoryFormModal component
- Props: open, onOpenChange, projectId, story?, onSuccess?
- Features: Create/edit story, AI generation, epic selection
- Form: title, description, priority, storyPoints, epicId, acceptanceCriteria
- Loads: Epic list for dropdown
```

**File:** `/components/story-detail-client.tsx`
```
Story detail view component
```

## Supporting Files

### Type Definitions
**File:** `/lib/types/index.ts` (lines 1-244)
```
CreateStorySchema, UpdateStorySchema, StoryFiltersSchema
CreateEpicSchema, UpdateEpicSchema
Error classes: AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError
```

### Database Access
**File:** `/lib/db/index.ts`
```
Database connection setup using Drizzle ORM
```

### Row-Level Security (RLS)
**File:** `/lib/db/rls.ts`
```
Organization-level access controls
```

## Migration Files

**File:** `/drizzle/migrations/0013_add_epic_aggregates.sql`
```
Adds: totalStories, completedStories, totalPoints, completedPoints, progressPct to epics
Creates: Indexes for progress and org-status filtering
```

**File:** `/drizzle/migrations/0014_add_story_completion_tracking.sql`
```
Adds: doneAt timestamp to stories (when story was marked done)
Creates: Indexes for done_at and sprint_done queries
Backfills: Sets done_at = updated_at for existing done stories
```

## Permission & Auth Files

**File:** `/lib/middleware/auth.ts`
```
withAuth middleware - Checks authentication and allowed roles
canModify() - Checks if user can create/modify/delete resources
```

**File:** `/lib/permissions/story-access.ts`
```
assertStoryAccessible() - Verifies organization access to story
```

## Utility Files

**File:** `/lib/repositories/stories.ts`
```
Alternative/older stories implementation (check which one is actively used)
```

**File:** `/lib/api-client.ts`
```
Frontend API client for consuming epic/story endpoints
- api.epics.list(), api.epics.create(), api.epics.update(), api.epics.publish()
- api.stories.list(), api.stories.create(), api.stories.update(), api.stories.delete()
```

## Test Files

**File:** `/tests/e2e/story-journey.spec.ts`
```
End-to-end tests for story creation and management
```

**File:** `/tests/unit/validate-story-schema.test.ts`
```
Unit tests for story validation schemas
```

## Documentation Files

**File:** `/EPIC_NAVIGATION_FEATURE.md`
```
Epic navigation feature documentation
```

**File:** `/EPIC_403_TROUBLESHOOTING_GUIDE.md`
```
Troubleshooting guide for epic access issues
```

**File:** `/UNIVERSAL_USER_STORY_IMPLEMENTATION.md`
```
Universal story implementation documentation
```

---

## Quick Navigation Map

```
Want to...                          Go to file
---------------------------------------
See epics table structure           /lib/db/schema.ts line 237
See stories table structure         /lib/db/schema.ts line 276
Create epic (backend)               /lib/repositories/epics.ts
Create story (backend)              /lib/repositories/stories.repository.ts
Validate story input                /lib/validations/story.ts
List epics API                      /app/api/projects/[projectId]/epics/route.ts
List stories API                    /app/api/stories/route.ts
Get story API                       /app/api/stories/[storyId]/route.ts
Update story API                    /app/api/stories/[storyId]/route.ts
Epic UI form                        /components/epic-form-modal.tsx
Story UI form                       /components/story-form-modal.tsx
Type definitions                    /lib/types/index.ts
Frontend API client                 /lib/api-client.ts
Permission checks                   /lib/middleware/auth.ts
Activity logging                    /lib/db/schema.ts activities table
```

---

## Key Tables Reference

### Stories Table Fields
- **Identity:** id, organizationId, projectId, createdBy
- **Content:** title, description, acceptanceCriteria
- **Classification:** storyPoints, priority, status, storyType (feature|bug|task|spike)
- **Metadata:** tags, labels
- **Relations:** epicId (optional), assigneeId (optional), sourceDocumentId
- **AI:** aiGenerated, aiPrompt, aiModelUsed, aiValidationScore, aiSuggestions, aiConfidenceScore
- **Tracking:** doneAt (when marked done), createdAt, updatedAt

### Epics Table Fields
- **Identity:** id, projectId, organizationId, createdBy
- **Content:** title, description, goals, color
- **Status:** status (draft|published|planned|in_progress|completed|archived)
- **Priority:** priority (low|medium|high|critical)
- **Assignment:** assignedTo (optional)
- **Dates:** startDate, targetDate
- **AI:** aiGenerated, aiGenerationPrompt
- **Aggregates:** totalStories, completedStories, totalPoints, completedPoints, progressPct
- **Tracking:** createdAt, updatedAt

---

## Access Patterns

### Organization-Level Security
Every query includes: `where: eq(stories.organizationId, userContext.organizationId)`

### Cascading Relationships
```
Organization contains Projects
Project contains Epics
Project contains Stories (with optional epicId)
Epic contains Stories (via epicId)
```

### Permission Hierarchy
```
Route level (withAuth middleware) → Validates role
Repository level → Validates organization access
Query level → Filters by organizationId
```

---

## Known Missing Features

1. **Story Type Filtering:** storyType not in validation schema, can't filter by type via API
2. **Task Subtasks:** No recursive hierarchy support
3. **Task Dependencies:** No blocked_by relationships
4. **Soft Deletes:** Stories are hard-deleted
5. **Epic Aggregate Triggers:** Aggregates not auto-updated on story changes
6. **Sprint Auto-Calculation:** Sprint velocity not auto-calculated
7. **Batch Updates:** No multi-story update endpoint
8. **Time Tracking:** No time estimation or actual time logging

