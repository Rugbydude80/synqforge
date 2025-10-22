# Quick Reference: Epics & Stories

## File Locations Summary

### Database Schema
- **Schema Definition:** `/lib/db/schema.ts` (lines 237-319)
  - `epics` table - Epic definitions with aggregates
  - `stories` table - Story/Bug/Task/Spike items
  - `projects`, `sprints`, `sprint_stories`, `users` - Related entities

### Repositories (Business Logic)
- **Epics:** `/lib/repositories/epics.ts`
  - Create, read, update, delete, publish epics
  - Get epic progress and stories
  
- **Stories:** `/lib/repositories/stories.repository.ts`
  - Create, read, update, delete, list stories
  - Filter by multiple criteria
  - Handles relations and activity logging

### API Routes
- **Epic Routes:** `/app/api/projects/[projectId]/epics/route.ts`
  - GET /api/projects/[projectId]/epics - List epics
  - POST /api/projects/[projectId]/epics - Create epic
  - GET /api/epics/[epicId]/stories - Get epic's stories

- **Story Routes:** `/app/api/stories/route.ts`
  - GET /api/stories - List stories (filterable)
  - POST /api/stories - Create story
  
- **Single Story:** `/app/api/stories/[storyId]/route.ts`
  - GET /api/stories/[storyId] - Get story
  - PATCH /api/stories/[storyId] - Update story
  - DELETE /api/stories/[storyId] - Delete story

### Validation
- **Story Validation:** `/lib/validations/story.ts`
  - `createStorySchema`, `updateStorySchema`
  - `storyFiltersSchema` - Query parameter validation
  - Support for title, description, AC, points, priority, status, tags, AI fields

- **Epic Validation:** `/lib/types/index.ts`
  - `CreateEpicSchema`, `UpdateEpicSchema`

### Components
- **Epic Form:** `/components/epic-form-modal.tsx`
- **Story Form:** `/components/story-form-modal.tsx`

### Tests & Docs
- **E2E Tests:** `/tests/e2e/story-journey.spec.ts`
- **Migrations:** `/drizzle/migrations/0013_*.sql`, `0014_*.sql`

---

## Quick API Examples

### Create Epic
```javascript
POST /api/projects/proj-123/epics
{
  "title": "Mobile App Redesign",
  "description": "Redesign mobile app UI/UX",
  "goals": "Improve user retention by 20%",
  "priority": "high",
  "startDate": "2024-01-01",
  "targetDate": "2024-03-31",
  "color": "#ef4444"
}
```

### Create Story (in Epic)
```javascript
POST /api/stories
{
  "projectId": "proj-123",
  "epicId": "epic-456",
  "title": "Add dark mode toggle",
  "description": "Allow users to switch between light and dark themes",
  "acceptanceCriteria": [
    "Toggle button visible in settings",
    "Theme preference persists across sessions",
    "All UI elements properly styled in dark mode"
  ],
  "storyPoints": 8,
  "priority": "high",
  "storyType": "feature",
  "assigneeId": "user-789"
}
```

### Create Task (in Epic)
```javascript
POST /api/stories
{
  "projectId": "proj-123",
  "epicId": "epic-456",
  "title": "Set up dark mode variables",
  "storyType": "task",    // <- This makes it a task!
  "priority": "high",
  "assigneeId": "user-789",
  "storyPoints": 3
}
```

### List Stories with Filters
```javascript
GET /api/stories?projectId=proj-123&epicId=epic-456&status=in_progress&priority=high&limit=20
```

### List Tasks Only
```javascript
GET /api/stories?projectId=proj-123&storyType=task
```

### Update Story Status
```javascript
PATCH /api/stories/story-123
{
  "status": "done"
}
```

### Get Epic Progress
```javascript
const epic = await epicRepository.getEpicProgress('epic-456')
// Returns: {
//   totalStories, completedStories,
//   inProgressStories, backlogStories,
//   totalStoryPoints, completedStoryPoints,
//   completionPercentage, pointsCompletionPercentage,
//   averagePointsPerStory, aiGeneratedCount
// }
```

---

## Key Concepts

### Tasks
- **Modeled as:** `storyType: 'task'` in stories table
- **Not separate entity:** No tasks table, tasks are a story classification
- **Full features:** Tasks support all story features (AC, points, assignment, etc.)
- **Example filter:** `storyType: 'task'` in query parameters

### Epic Statuses
```
'draft'       - Editable, not visible to team yet
'published'   - Active, team can see and work on stories
'planned'     - In future planning
'in_progress' - Currently being worked on
'completed'   - Finished
'archived'    - Old/historical
```

### Story Statuses
```
'backlog'     - Not yet started
'ready'       - Ready for development
'in_progress' - Currently being worked
'review'      - Waiting for code review
'done'        - Completed and merged
'blocked'     - Blocked by dependency
```

### Story Types
```
'feature' - New functionality
'bug'     - Fix for bug
'task'    - Non-feature work item
'spike'   - Research/investigation
```

### Story Priority
```
'low'      - Nice to have
'medium'   - Standard work
'high'     - Important
'critical' - Urgent/breaking
```

---

## Permission Model

### Route-Level Authorization
Handled by `withAuth` middleware:
```typescript
withAuth(handler, { allowedRoles: ['admin', 'member'] })
```

### Repository-Level Authorization
Methods validate and throw `ForbiddenError`:
```typescript
if (!this.canModify()) {
  throw new ForbiddenError('Cannot create epics')
}
```

### Organization Scoping
Every query filters by user's organizationId:
```typescript
where: eq(stories.organizationId, userContext.organizationId)
```

---

## Database Relationships Diagram

```
Organization
├── Projects
│   ├── Epics
│   │   └── Stories (epicId)
│   ├── Stories (without epic)
│   └── Sprints
│       └── SprintStories (junction)
│           └── Stories
└── Users
    ├── Created Stories
    ├── Assigned Stories
    └── Created Epics

Story Fields:
- projectId (required)
- epicId (optional - can exist without epic)
- assigneeId (optional)
- createdBy (required)
- status (backlog → ready → in_progress → review → done)
- storyType (feature | bug | task | spike)
```

---

## Common Queries

### Get all stories for a project
```
GET /api/stories?projectId=proj-123
```

### Get stories in specific epic
```
GET /api/stories?epicId=epic-456
```

### Get stories assigned to me
```
GET /api/stories?assigneeId=user-123
```

### Get high priority stories not done
```
GET /api/stories?priority=high,critical&status=backlog,ready,in_progress,review
```

### Get all tasks in project
```
GET /api/stories?projectId=proj-123&storyType=task
```

### Get AI-generated stories
```
GET /api/stories?projectId=proj-123&aiGenerated=true
```

---

## Validation Constraints

### Story Title
- Required
- 1-200 characters

### Story Description
- Optional
- Max 2000 characters

### Acceptance Criteria
- Optional array
- Max 20 items
- Each item max 500 characters

### Story Points
- Optional
- Integer 0-100

### Tags
- Optional array
- Max 10 tags
- Each tag max 50 characters

### Epic Title
- Required
- 1-255 characters

### Epic Color
- Optional
- Hex color (e.g., #a855f7)
- Default: #a855f7 (purple)

---

## Key Differences: Tasks vs Features

| Aspect | Feature | Task |
|--------|---------|------|
| Type | storyType: 'feature' | storyType: 'task' |
| Table | stories | stories (same) |
| AC Support | Yes | Yes |
| Points | Usually has | Sometimes has |
| Epic Grouping | Can be grouped | Can be grouped |
| User Stories | Typical format | Simpler format |
| Technical | Product feature | Implementation work |

---

## Activity Logging

All changes logged to `activities` table:
```
{
  action: 'story_created' | 'story_updated' | 'story_deleted'
           'created_epic' | 'updated_epic' | 'deleted_epic'
  resourceType: 'story' | 'epic'
  resourceId: uuid
  oldValues: { /* previous values */ }
  newValues: { /* new values */ }
  metadata: { /* additional context */ }
  userId: /* who made the change */
  createdAt: timestamp
}
```

---

## Common Issues & Solutions

### Can't filter by storyType
- The validation schema doesn't include storyType in filters yet
- But the database supports it in the stories table
- Workaround: Query and filter client-side or extend schema

### Epic can't be deleted
- Epics with stories can't be deleted
- Move/delete all stories first

### Epic doesn't show progress
- Progress calculated on-the-fly from story counts
- No aggregates auto-updated (trigger-based updates needed)

### Task shows as story in UI
- Tasks are just stories with storyType='task'
- Filter by storyType or display accordingly

---

## Next Steps for Enhancement

1. **Support story dependencies** - Add blocked_by relationships
2. **Add task subtasks** - Enable hierarchical tasks
3. **Implement soft deletes** - Archive instead of hard delete
4. **Add time tracking** - estimatedHours, loggedHours
5. **Batch operations** - Update multiple stories at once
6. **Story templates** - Per-story-type templates
7. **Custom fields** - Allow custom metadata

