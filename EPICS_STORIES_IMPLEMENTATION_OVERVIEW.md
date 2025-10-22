# Synqforge: Epics and Stories Implementation Overview

## Executive Summary

The Synqforge codebase implements a comprehensive project management system with support for **Epics**, **Stories**, **Projects**, and **Sprints**. The architecture follows a modern Next.js backend pattern with Drizzle ORM for database access, organized repositories for business logic, and REST API endpoints for client consumption.

**Key Finding:** Stories have a `storyType` enum that includes `'feature' | 'bug' | 'task' | 'spike'`, meaning the system currently models **tasks as a story type rather than as a separate first-class entity**.

---

## 1. DATABASE SCHEMA

### Location
`/Users/chrisrobertson/Desktop/synqforge/lib/db/schema.ts`

### Key Tables

#### **Epics Table**
```
epics {
  id: varchar(36) PRIMARY KEY
  projectId: varchar(36) NOT NULL - Foreign key to projects
  organizationId: varchar(36) NOT NULL - For org-level access control
  title: varchar(255) NOT NULL
  description: text
  goals: text
  color: varchar(7) DEFAULT '#a855f7'
  status: enum('draft', 'published', 'planned', 'in_progress', 'completed', 'archived')
  priority: enum('low', 'medium', 'high', 'critical') DEFAULT 'medium'
  
  // AI Integration
  aiGenerated: boolean DEFAULT false
  aiGenerationPrompt: text
  
  // Assignment & Dates
  createdBy: varchar(36) NOT NULL
  assignedTo: varchar(36) - Optional assignee
  startDate: date
  targetDate: date
  
  // Aggregate Fields (auto-calculated by triggers)
  totalStories: integer DEFAULT 0
  completedStories: integer DEFAULT 0
  totalPoints: integer DEFAULT 0
  completedPoints: integer DEFAULT 0
  progressPct: decimal(5,1) DEFAULT 0
  
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()
}
```

**Indexes:**
- `idx_epics_project` - Filter by project
- `idx_epics_org` - Filter by organization
- `idx_epics_status` - Filter by status within project
- `idx_epics_assignee` - Find epics assigned to user
- `idx_epics_progress` - Query by completion %
- `idx_epics_org_status` - Cross-org status queries

#### **Stories Table**
```
stories {
  id: varchar(36) PRIMARY KEY
  organizationId: varchar(36) NOT NULL
  epicId: varchar(36) - Foreign key to epics (NULLABLE - stories can exist without epic)
  projectId: varchar(36) NOT NULL
  
  // Content
  title: varchar(255) NOT NULL
  description: text
  acceptanceCriteria: json array<string> - Up to 20 criteria max
  
  // Classification
  storyPoints: smallint NULLABLE
  priority: enum('low', 'medium', 'high', 'critical') DEFAULT 'medium'
  status: enum('backlog', 'ready', 'in_progress', 'review', 'done', 'blocked') DEFAULT 'backlog'
  storyType: enum('feature', 'bug', 'task', 'spike') DEFAULT 'feature'
  
  // Tagging & Metadata
  tags: json array<string> - Up to 10 tags
  labels: json array<string>
  
  // AI Integration
  aiGenerated: boolean DEFAULT false
  aiPrompt: text
  aiModelUsed: varchar(100)
  aiValidationScore: smallint - 0-100
  aiSuggestions: json array<string>
  aiConfidenceScore: smallint
  
  // Sourcing
  sourceDocumentId: varchar(36) - Links to project documents for traceability
  
  // Assignment & Tracking
  createdBy: varchar(36) NOT NULL
  assigneeId: varchar(36) - Optional assignee
  doneAt: timestamp - When story was marked done (for velocity calculations)
  
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()
}
```

**Indexes:**
- `idx_stories_org` - Organization access control
- `idx_stories_epic` - Find stories within epic
- `idx_stories_project` - Find project stories
- `idx_stories_status` - Status-based filtering
- `idx_stories_assignee` - Assigned to user
- `idx_stories_priority` - Priority filtering
- `idx_stories_source_doc` - Document traceability
- `idx_stories_done_at` - Velocity calculations
- `idx_stories_sprint_done` - Sprint velocity metrics

#### **Projects Table** (Referenced by Epics & Stories)
```
projects {
  id: varchar(36) PRIMARY KEY
  organizationId: varchar(36) NOT NULL
  name: varchar(255) NOT NULL
  key: varchar(10) NOT NULL - Project code (e.g., "PROJ")
  description: text
  slug: varchar(100) NOT NULL
  status: enum('planning', 'active', 'on_hold', 'completed', 'archived')
  ownerId: varchar(36) NOT NULL
  settings: json
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### **Sprint Tables** (For sprint planning with stories)
```
sprints {
  id: varchar(36) PRIMARY KEY
  projectId: varchar(36) NOT NULL
  name: varchar(255) NOT NULL
  goal: text
  status: enum('planning', 'active', 'completed', 'cancelled')
  startDate: date NOT NULL
  endDate: date NOT NULL
  
  // Capacity & Velocity
  capacityPoints: integer
  plannedPoints: integer DEFAULT 0
  completedPoints: integer DEFAULT 0
  velocity: integer
  completionPercentage: smallint DEFAULT 0
  velocityCached: integer DEFAULT 0
  
  createdBy: varchar(36)
  createdAt: timestamp
  updatedAt: timestamp
}

sprint_stories (Junction table) {
  sprintId: varchar(36)
  storyId: varchar(36)
  addedAt: timestamp
  addedBy: varchar(36)
  PRIMARY KEY (sprintId, storyId)
}
```

#### **Users Table** (For assignment & creation tracking)
```
users {
  id: varchar(36) PRIMARY KEY
  email: varchar(255) NOT NULL UNIQUE
  name: varchar(255)
  password: varchar(255)
  avatar: text
  organizationId: varchar(36) NOT NULL
  role: enum('owner', 'admin', 'member', 'viewer')
  isActive: boolean DEFAULT true
  preferences: json
  lastActiveAt: timestamp
  createdAt: timestamp
}
```

### Database Relationships

```
Organization (1) ──→ (Many) Projects
                 ├──→ (Many) Epics
                 ├──→ (Many) Stories
                 └──→ (Many) Users

Project (1) ──→ (Many) Epics
        └──→ (Many) Stories
        └──→ (Many) Sprints

Epic (1) ──→ (Many) Stories

Sprint (1) ──→ (Many) Stories (via sprint_stories junction)

Story:
  - Has optional Epic (epicId nullable)
  - Has required Project
  - Has optional Assignee (user)
  - Has required Creator (user)
  - Can belong to active Sprint
  - Can reference source ProjectDocument
```

---

## 2. API ROUTES

### Epic API Routes

#### **GET /api/projects/[projectId]/epics**
- **Handler:** `app/api/projects/[projectId]/epics/route.ts`
- **Authentication:** Required
- **Method:** GET
- **Allowed Roles:** admin, member, viewer
- **Purpose:** List all epics for a project
- **Returns:** Array of epics with metadata

```javascript
// Response includes:
{
  data: [
    {
      id, projectId, title, description, goals, status, priority,
      createdBy, assignedTo, startDate, targetDate,
      totalStories, completedStories, totalStoryPoints, completedStoryPoints,
      creatorName, creatorEmail
    }
  ],
  total: number
}
```

#### **POST /api/projects/[projectId]/epics**
- **Handler:** Same as above
- **Method:** POST
- **Allowed Roles:** admin, member
- **Purpose:** Create new epic
- **Validation:** Uses `CreateEpicSchema`
- **Required Fields:** projectId, title
- **Optional Fields:** description, goals, priority, assignedTo, startDate, targetDate

#### **GET /api/epics/[epicId]/stories**
- **Handler:** `app/api/epics/[epicId]/stories/route.ts`
- **Purpose:** Get all stories within an epic
- **Returns:** Array of StoryWithRelations objects

### Story API Routes

#### **GET /api/stories**
- **Handler:** `app/api/stories/route.ts` (getStories function)
- **Method:** GET
- **Authentication:** Required
- **Allowed Roles:** admin, member, viewer
- **Purpose:** List stories with filtering and pagination
- **Query Parameters:**
  ```
  projectId?: string
  epicId?: string
  assigneeId?: string
  status?: string | string[] (backlog, ready, in_progress, review, done, blocked)
  priority?: string | string[] (low, medium, high, critical)
  aiGenerated?: boolean
  tags?: string[]
  limit?: number (default: 50, max: 1000)
  offset?: number (default: 0)
  orderBy?: 'createdAt' | 'updatedAt' | 'priority' | 'storyPoints' (default: createdAt)
  orderDirection?: 'asc' | 'desc' (default: desc)
  ```
- **Returns:**
  ```javascript
  {
    data: StoryWithRelations[],
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
  ```

#### **POST /api/stories**
- **Handler:** Same file (createStory function)
- **Method:** POST
- **Allowed Roles:** admin, member
- **Purpose:** Create new story
- **Required Fields:** projectId, title, priority
- **Optional Fields:** epicId, description, acceptanceCriteria, storyPoints, storyType, assigneeId, status, tags, labels, aiGenerated, aiPrompt, aiModelUsed
- **Validation:** Uses `createStorySchema`

#### **GET /api/stories/[storyId]**
- **Handler:** `app/api/stories/[storyId]/route.ts` (getStory function)
- **Purpose:** Get single story by ID with all relations
- **Returns:** StoryWithRelations object

#### **PATCH /api/stories/[storyId]**
- **Handler:** Same file (updateStory function)
- **Allowed Roles:** admin, member
- **Purpose:** Update story fields
- **Validation:** Uses `updateStorySchema`
- **Updatable Fields:** title, description, acceptanceCriteria, storyPoints, priority, status, assigneeId, tags, epicId

#### **DELETE /api/stories/[storyId]**
- **Handler:** Same file (deleteStory function)
- **Allowed Roles:** admin, member
- **Purpose:** Hard delete a story
- **Side Effects:** Removes story from all sprints, logs activity

#### **Other Story Routes:**
- **POST /api/stories/bulk** - Create multiple stories at once
- **GET /api/stories/stats** - Get project statistics
- **POST /api/stories/[storyId]/move** - Move story between statuses (Kanban)
- **POST /api/stories/[storyId]/sprint** - Assign/unassign from sprint
- **GET /api/stories/export** - Export stories

---

## 3. REPOSITORIES & BUSINESS LOGIC

### Epics Repository
**Location:** `/Users/chrisrobertson/Desktop/synqforge/lib/repositories/epics.ts`

**Class:** `EpicsRepository`

**Key Methods:**
```typescript
class EpicsRepository {
  // Requires UserContext for permission checking
  constructor(private userContext: UserContext)
  
  // Read operations
  async getEpics(projectId?: string): Promise<Epic[]>
    - Gets all epics (optionally filtered by project)
    - Includes creator info and story counts
  
  async getEpicById(epicId: string): Promise<Epic>
    - Get single epic with validation
    - Throws NotFoundError or ForbiddenError
  
  async getEpicProgress(epicId: string): Promise<EpicProgress>
    - Calculate progress metrics:
      - totalStories, completedStories
      - totalStoryPoints, completedStoryPoints
      - completionPercentage, pointsCompletionPercentage
      - averagePointsPerStory
      - aiGeneratedCount
      - inProgressStories, backlogStories
  
  async getEpicStories(epicId: string): Promise<Story[]>
    - Get all stories in an epic (ordered by priority)
  
  // Write operations
  async createEpic(data: CreateEpicInput): Promise<Epic>
    - Validates project access
    - Validates assigned user exists
    - Creates epic and logs activity
  
  async updateEpic(epicId: string, updates: UpdateEpicInput): Promise<Epic>
    - Validates permissions
    - Logs changes in activity table
  
  async publishEpic(epicId: string): Promise<Epic>
    - Epic publishing workflow:
      - Requires epic to be in 'draft' status
      - Requires at least one story
      - Changes epic status to 'published'
      - Updates linked stories from 'backlog' to 'ready'
      - Only admins or epic creator can publish
  
  async deleteEpic(epicId: string): Promise<void>
    - Prevents deletion if epic has stories
    - Logs deletion
  
  // Permission checks
  private canModify(): boolean
    - Checks if admin or member
  
  private canModifyEpic(epic: any): boolean
    - Admins, members, or creator can modify
  
  private canPublishEpic(epic: any): boolean
    - Only admins or creators can publish
  
  // Helpers
  private async logActivity(...)
    - Records changes to activities table
}
```

### Stories Repository
**Location:** `/Users/chrisrobertson/Desktop/synqforge/lib/repositories/stories.repository.ts`

**Class:** `StoriesRepository`

**Key Methods:**
```typescript
class StoriesRepository {
  // Must be instantiated singleton: export const storiesRepository = new StoriesRepository()
  
  async create(input: CreateStoryInput, userId: string): Promise<StoryWithRelations>
    - Validates project exists
    - Validates epic exists if provided
    - Validates assignee exists if provided
    - Creates story record
    - Logs activity with newValues
    - Returns full story with relations
  
  async getById(storyId: string): Promise<StoryWithRelations>
    - Fetches story with all relations:
      - project (id, name, key)
      - epic (id, title, color)
      - assignee (id, name, email, avatar)
      - creator (id, name, email)
      - currentSprint (if active)
    - Throws error if not found
  
  async update(
    storyId: string,
    input: UpdateStoryInput,
    userId: string
  ): Promise<StoryWithRelations>
    - Validates story exists
    - Validates epic if changing
    - Validates assignee if changing
    - Tracks changes for activity log
    - Updates record
    - Logs changed fields
  
  async delete(storyId: string, userId: string): Promise<void>
    - Logs deletion BEFORE hard delete
    - Removes from all sprints
    - Hard deletes story record
  
  async list(
    filters: StoryFilters = {},
    options?: { limit, offset, orderBy, orderDirection }
  ): Promise<{ stories: StoryWithRelations[]; total: number }>
    - Filters by:
      - organizationId (security)
      - projectId, epicId, assigneeId
      - status (single or array)
      - priority (single or array)
      - aiGenerated
    - Pagination with limit/offset
    - Ordering by createdAt, updatedAt, priority, storyPoints
    - Returns stories with all relations and current sprint
}
```

---

## 4. VALIDATION SCHEMAS

### Story Validation
**Location:** `/Users/chrisrobertson/Desktop/synqforge/lib/validations/story.ts`

Uses Zod for validation. Key schemas:

```typescript
// Create Story
{
  projectId: string (required)
  epicId?: string
  title: string (required, 1-200 chars)
  description?: string (max 2000 chars)
  acceptanceCriteria?: string[] (max 20 items, each max 500 chars)
  storyPoints?: number (0-100)
  priority: 'low' | 'medium' | 'high' | 'critical' (required)
  status?: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  tags?: string[] (max 10 tags, each max 50 chars)
  aiGenerated?: boolean
  aiPrompt?: string (max 1000 chars)
  aiModelUsed?: string (max 100 chars)
}

// Update Story (all fields optional)
{
  projectId?: string
  title?: string
  description?: string
  acceptanceCriteria?: string[]
  storyPoints?: number
  priority?: enum
  status?: enum
  tags?: string[]
  aiGenerated?: boolean
  aiPrompt?: string
  aiModelUsed?: string
}

// Story Filters
{
  projectId?: string
  epicId?: string
  assigneeId?: string
  status?: enum | enum[]
  priority?: enum | enum[]
  aiGenerated?: boolean
  tags?: string[]
  limit?: number (1-1000, default 50)
  offset?: number (default 0)
  orderBy?: 'createdAt' | 'updatedAt' | 'priority' | 'storyPoints'
  orderDirection?: 'asc' | 'desc'
}
```

### Epic Validation
**Location:** `/Users/chrisrobertson/Desktop/synqforge/lib/types/index.ts`

```typescript
// Create Epic
{
  projectId: string (uuid, required)
  title: string (1-255 chars, required)
  description?: string
  goals?: string
  priority?: 'low' | 'medium' | 'high' | 'critical' (default: medium)
  assignedTo?: string (uuid)
  startDate?: string (ISO date)
  targetDate?: string (ISO date)
  aiGenerated?: boolean
  aiGenerationPrompt?: string
}

// Update Epic (all optional)
{
  title?: string
  description?: string
  goals?: string
  status?: 'draft' | 'planned' | 'in_progress' | 'completed' | 'archived'
  priority?: enum
  assignedTo?: string | null
  startDate?: string | null
  targetDate?: string | null
}
```

---

## 5. TYPESCRIPT TYPES

### StoryWithRelations
```typescript
interface StoryWithRelations {
  id: string
  projectId: string
  epicId: string | null
  title: string
  description: string | null
  acceptanceCriteria: string[] | null
  storyPoints: number | null
  storyType: 'feature' | 'bug' | 'task' | 'spike' | null  // ← Tasks are a story type!
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked' | null
  assigneeId: string | null
  tags: string[] | null
  aiGenerated: boolean | null
  aiPrompt: string | null
  aiModelUsed: string | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
  
  // Relations (optional)
  project?: {
    id: string
    name: string
    key: string
  }
  epic?: {
    id: string
    title: string
    color: string | null
  } | null
  assignee?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  } | null
  creator?: {
    id: string
    name: string | null
    email: string
  }
  currentSprint?: {
    id: string
    name: string
    startDate: Date
    endDate: Date
  } | null
}
```

---

## 6. PERMISSION MODEL

### Role-Based Access Control

```
OWNER: Organization owner
  - Full access to all resources
  - Can invite/remove team members

ADMIN: Project administrators
  - Create/edit/delete epics and stories
  - Publish epics
  - Manage project settings
  - Create/manage sprints

MEMBER: Team members (default)
  - Create/edit/delete their own and others' stories
  - Create/edit/delete their own and others' epics
  - Cannot delete if resources have dependencies

VIEWER: Read-only access
  - Can view epics and stories
  - Cannot create/edit/delete
```

### Organization-Level Security
All resources are scoped to organizationId:
- Users can only access resources in their organization
- Project access verified before epic/story operations
- Epic must belong to the project being accessed
- Story must belong to the project being accessed

---

## 7. RELATIONSHIP & DEPENDENCY RULES

### Epic-Story Relationship
- **Optional:** Stories may NOT have an epic (epicId nullable)
- **One-to-Many:** One epic can have many stories
- **Cascading Concerns:** Epics have aggregate fields calculated from stories
  - totalStories, completedStories
  - totalPoints, completedPoints
  - progressPct (calculated from points or story count)

### Story-Sprint Relationship
- **Many-to-Many:** Stories and sprints via sprint_stories junction table
- **Active Sprint Only:** Story.currentSprint only returns active sprints
- **On Delete Story:** Story is removed from all sprints

### Story-Assignee Relationship
- **Optional:** assigneeId is nullable
- **User Validation:** Assignee must exist in same organization

### Project Requirements
- **Mandatory:** Every epic must have projectId
- **Mandatory:** Every story must have projectId
- **Organization Scope:** Project must be in same organization as user

---

## 8. CURRENT TASK IMPLEMENTATION

### Important Finding: Tasks are Story Types, NOT Separate Entities

**Current Design:**
```typescript
// Tasks implemented as a story type:
storyType: 'feature' | 'bug' | 'task' | 'spike'
```

**Implications:**
1. **No separate tasks table** - Tasks use the stories table
2. **Task filtering** - Filter stories by `storyType: 'task'`
3. **Task operations** - All story operations work for tasks
4. **Task hierarchy** - Tasks can belong to epics just like features

**Example: Creating a Task**
```javascript
const task = await storiesRepository.create({
  projectId: 'proj-123',
  epicId: 'epic-456',
  title: 'Implement API validation',
  storyType: 'task',  // ← Marked as task
  priority: 'high',
  assigneeId: 'user-789'
}, userId);
```

**Example: Finding All Tasks in Project**
```javascript
const tasks = await api.get('/api/stories', {
  params: {
    projectId: 'proj-123',
    storyType: 'task'  // ← Note: storyType not in validation schema yet
  }
});
```

---

## 9. ACTIVITY LOGGING

Every epic and story change is logged in the `activities` table:

```typescript
activities {
  id: varchar(36)
  organizationId: varchar(36)
  projectId: varchar(36)
  userId: varchar(36) - Who made the change
  action: 'created_epic' | 'updated_epic' | 'deleted_epic' | 
          'story_created' | 'story_updated' | 'story_deleted'
  resourceType: 'epic' | 'story'
  resourceId: varchar(36)
  oldValues: json - Previous values
  newValues: json - New/changed values
  metadata: json - Additional context
  createdAt: timestamp
}
```

---

## 10. AI INTEGRATION

Stories and epics support AI generation:

### Story AI Fields
```
aiGenerated: boolean
aiPrompt: string - The prompt used to generate
aiModelUsed: string - Which model generated it
aiValidationScore: smallint (0-100) - Quality score
aiSuggestions: string[] - Suggested improvements
aiConfidenceScore: smallint (0-100) - Confidence in generation
```

### Epic AI Fields
```
aiGenerated: boolean
aiGenerationPrompt: string
```

### AI Generation Type Enum
```
'story_generation'
'story_validation'
'epic_creation'
'requirements_analysis'
'backlog_autopilot'
'ac_validation'
'test_generation'
'planning_forecast'
'effort_scoring'
'impact_scoring'
'knowledge_search'
'inbox_parsing'
'repo_analysis'
'pr_summary'
```

---

## 11. MIGRATION HISTORY

### Migration 0013: Epic Aggregates
- Adds totalStories, completedStories, totalPoints, completedPoints, progressPct
- Creates indexes for progress and org-status filtering
- Used for epic progress calculation without N+1 queries

### Migration 0014: Story Completion Tracking
- Adds doneAt timestamp to stories
- Tracks when story was marked done
- Used for sprint velocity calculations
- Backfills existing done stories with updated_at value

---

## 12. COMPONENTS

### Epic Form Modal
**Location:** `/Users/chrisrobertson/Desktop/synqforge/components/epic-form-modal.tsx`

**Features:**
- Create new epic
- Edit existing epic
- Publish epic (if in draft status)
- Form validation
- Toast notifications

**Form Fields:**
- Title (required)
- Description
- Goals
- Priority (dropdown)
- Color picker
- Start date
- Target date

### Story Form Modal
**Location:** `/Users/chrisrobertson/Desktop/synqforge/components/story-form-modal.tsx`

**Features:**
- Create new story
- Edit existing story
- AI generation support
- Epic selection (with prompts)
- Acceptance criteria management

**Form Fields:**
- Title (required)
- Description
- Priority (dropdown)
- Story points
- Epic (dropdown, loads from project)
- Acceptance criteria (array, up to 20)
- AI requirement input

---

## 13. ARCHITECTURE PATTERNS

### Request Flow
```
API Route (route.ts)
  ↓
withAuth middleware (checks authentication & permissions)
  ↓
Validation (Zod schema parsing)
  ↓
Repository Method (business logic)
  ↓
Drizzle ORM (database operations)
  ↓
Activity Logging (async, logged but not blocking)
  ↓
Response (API response helpers)
```

### Data Access Pattern
```typescript
// Always use repositories, never direct db access in routes
const repository = new StoriesRepository();
const story = await repository.getById(storyId);
```

### Permission Checking Pattern
```typescript
// Two levels:
1. Route-level: withAuth middleware checks role
2. Repository-level: Methods validate access, throw ForbiddenError if denied
```

### Organization Scoping Pattern
```typescript
// Every query filters by organizationId
where: and(
  eq(stories.organizationId, userContext.organizationId),
  ...otherFilters
)
```

---

## 14. KEY OBSERVATIONS

### Strengths
1. **Well-organized:** Repositories, validations, API routes clearly separated
2. **Security-first:** Organization scoping, permission checks at multiple levels
3. **Audit trail:** Activities logged for all changes
4. **AI-ready:** First-class support for AI generation and validation
5. **Flexible:** Epic-story relationship is optional, stories can exist independently
6. **Type-safe:** Full TypeScript with Zod validation

### Current Limitations
1. **No task subtasks:** Tasks can't have subtasks (no recursive hierarchy)
2. **No task dependencies:** Stories don't track dependencies on other stories
3. **Sprint queries:** Sprint associations require manual joins
4. **Aggregate updating:** Epic aggregates need trigger-based updates (not implemented in migration shown)
5. **Soft deletes:** Stories are hard-deleted, not soft-deleted
6. **Story type filtering:** Validation schema doesn't expose storyType in filter queries

### Missing for Task Management
1. **Task checklists:** No subtask/checklist support within stories
2. **Time tracking:** No time estimation or tracking beyond story points
3. **Task priority queuing:** No forced queue/order within a status
4. **Task dependencies:** No "blocks" or "depends on" relationships
5. **Task templates:** No per-task-type templates

---

## 15. RECOMMENDATIONS FOR ENHANCEMENT

### If Adding Separate Task Entity
1. Create `tasks` table similar to `stories`
2. Add foreign key: story → tasks (one-to-many)
3. Update sprint_stories → sprint_tasks junction
4. Create TasksRepository following StoriesRepository pattern
5. Add new API routes: /api/stories/[storyId]/tasks
6. Update Epics to track task aggregates separately

### If Enhanced Task Features Needed
1. Add `parentStoryId` field to enable subtasks
2. Add `checklistItems` JSON array for task checklists
3. Add `estimatedHours` and `loggedHours` for time tracking
4. Add `taskDependencies` junction table for blocking relationships
5. Add `taskOrder` field for priority queue within status

---

## CONCLUSION

Synqforge's implementation provides a solid foundation for agile project management with **epics grouping work**, **stories describing features**, and **tasks modeled as a story type**. The architecture is clean, secure, and extensible. For advanced task management features (subtasks, checklists, dependencies), the system would need targeted enhancements while maintaining the current story-as-story-type design.
