# Synqforge Epics & Stories Documentation Index

This directory contains comprehensive documentation on the Epics and Stories implementation in Synqforge. Use this index to navigate the documentation.

## Documentation Files

### 1. EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md
**Comprehensive technical deep-dive (15 sections)**
- Executive summary with key findings
- Complete database schema documentation (epics, stories, projects, sprints)
- All API endpoints with detailed specifications
- Repository methods and class documentation
- Validation schemas and TypeScript types
- Permission model and access control
- Relationship and dependency rules
- Task implementation (important: tasks are story types!)
- Activity logging system
- AI integration capabilities
- Database migrations
- Component documentation
- Architecture patterns
- Key observations and recommendations

**Start here if:** You need to understand the entire system, modify core functionality, or add new features.

**Key sections:**
- Section 1: Database Schema (epics table structure and all fields)
- Section 2: API Routes (complete endpoint specifications)
- Section 3: Repositories (business logic implementation)
- Section 8: Current Task Implementation (how tasks work)

---

### 2. QUICK_REFERENCE_EPICS_STORIES.md
**Quick lookup guide with practical examples**
- File locations for all key components
- Common API call examples (create epic, create story, create task, filter stories)
- Key concepts and status/type enums
- Permission model overview
- Database relationship diagram
- Common queries
- Validation constraints
- Task vs Feature comparison table
- Activity logging format
- Common issues and solutions
- Next steps for enhancement

**Start here if:** You want quick answers or practical examples.

**Quick sections:**
- File locations for quick navigation
- API Examples section for copy-paste usage
- Common Queries section for filtering stories

---

### 3. FILE_STRUCTURE_SUMMARY.md
**Navigation guide for the codebase**
- Core files (must read) with line numbers
- API route files listing
- UI component files
- Supporting files (types, auth, permissions)
- Migration files
- Test files
- Quick navigation map (want to... go to)
- Key tables reference
- Access patterns
- Known missing features

**Start here if:** You're looking for where specific code is located.

**Key sections:**
- Quick Navigation Map (fastest way to find things)
- Core Files section (essential reading)
- Key Tables Reference section (database schema summary)

---

## How to Use This Documentation

### If you want to...

**Understand the overall architecture**
1. Read: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 1-5)
2. Reference: FILE_STRUCTURE_SUMMARY.md (Core Files section)

**Create a new epic or story**
1. Check: QUICK_REFERENCE_EPICS_STORIES.md (API Examples)
2. Reference: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 4: Validation Schemas)

**Create a task (which is a story with storyType='task')**
1. Check: QUICK_REFERENCE_EPICS_STORIES.md (Create Task example)
2. Read: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 8: Current Task Implementation)

**Query/filter stories**
1. Check: QUICK_REFERENCE_EPICS_STORIES.md (Common Queries)
2. Reference: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 2: API Routes - GET /api/stories)

**Modify the Epic repository**
1. Find: FILE_STRUCTURE_SUMMARY.md (Quick Navigation Map → Epic Repository)
2. Read: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 3: Epics Repository)
3. Edit: `/lib/repositories/epics.ts`

**Add new story fields**
1. Update: `/lib/db/schema.ts` (stories table definition)
2. Update: `/lib/validations/story.ts` (validation schemas)
3. Create: New migration in `/drizzle/migrations/`
4. Update: API route handlers in `/app/api/stories/`

**Find a specific file**
1. Use: FILE_STRUCTURE_SUMMARY.md (Quick Navigation Map)
2. Reference: FILE_STRUCTURE_SUMMARY.md (Core Files section with line numbers)

**Debug permission issues**
1. Check: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 6: Permission Model)
2. Check: QUICK_REFERENCE_EPICS_STORIES.md (Permission Model section)
3. Reference: FILE_STRUCTURE_SUMMARY.md (Permission & Auth Files)

**Understand AI integration**
1. Read: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 10: AI Integration)
2. Reference: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 1: Database Schema - AI fields)

**Add a new feature**
1. Understand: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 13: Architecture Patterns)
2. Plan: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Section 15: Recommendations for Enhancement)
3. Code: Use FILE_STRUCTURE_SUMMARY.md to find where to add code

---

## Key Facts

### What are Epics?
- Container for grouping related work
- Project-scoped (must belong to a project)
- Can have multiple stories
- Have lifecycle statuses: draft → published → in_progress → completed
- Optional assignment to single user
- Aggregate progress from contained stories
- Support AI generation

### What are Stories?
- Individual work items (features, bugs, tasks, spikes)
- Can belong to an epic (optional)
- Have lifecycle statuses: backlog → ready → in_progress → review → done/blocked
- Include acceptance criteria
- Estimated with story points
- Can be assigned to sprint
- Support AI generation

### What are Tasks?
- Implemented as `storyType: 'task'` within stories table
- NOT a separate entity
- Same features as stories (AC, points, assignment, etc.)
- Can be grouped in epics
- Cannot have subtasks (no recursive hierarchy)
- Filter by `storyType: 'task'`

### What are Sprints?
- Time-boxed work periods (e.g., 2 weeks)
- Contain stories via many-to-many relationship
- Track capacity and velocity
- Can be active, planning, completed, or cancelled

### Projects?
- Organizational container for epics, stories, and sprints
- Have team members with roles
- Track project status and settings

### Organization?
- Top-level container
- Contains projects, users, epics, stories, sprints
- All queries filtered by organizationId for security

---

## Important Implementation Details

### Tasks are Story Types (Not Separate Entities)
```
storyType: 'feature' | 'bug' | 'task' | 'spike'
```

This means:
- No separate tasks table
- Tasks use the stories table
- Filter by `storyType: 'task'`
- All story operations work for tasks

### Organization-Level Security
Every query includes organization filtering:
```
where: eq(stories.organizationId, userContext.organizationId)
```

This ensures:
- Users can only access their organization's data
- Cross-organization queries are impossible

### Epic-Story Relationship
- Story's epicId is **nullable** - stories can exist without an epic
- One epic can have many stories
- Epic aggregates (progress, total points) calculated from stories

### Story-Sprint Relationship
- Many-to-many via sprint_stories junction table
- Story.currentSprint shows only active sprints
- Deleting story removes it from all sprints

---

## Common Navigation Patterns

### By Role
**Database Developer:** Start with FILE_STRUCTURE_SUMMARY.md → EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md Section 1
**API Developer:** Start with QUICK_REFERENCE_EPICS_STORIES.md → EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md Section 2
**Frontend Developer:** Start with QUICK_REFERENCE_EPICS_STORIES.md → Components section in FILE_STRUCTURE_SUMMARY.md
**DevOps/Infrastructure:** Check Section 11 (Migrations) in EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md

### By Time Constraint
**5 minutes:** QUICK_REFERENCE_EPICS_STORIES.md (specific section needed)
**15 minutes:** EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (relevant sections)
**30+ minutes:** Full read-through starting with this document

### By Knowledge Level
**New to project:** EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md (Executive Summary) → QUICK_REFERENCE_EPICS_STORIES.md
**Familiar with project:** QUICK_REFERENCE_EPICS_STORIES.md or FILE_STRUCTURE_SUMMARY.md as needed
**Expert contributor:** FILE_STRUCTURE_SUMMARY.md + specific file review

---

## Documentation Maintenance

These files were generated to reflect the current implementation in:
- `/lib/db/schema.ts` - Lines 237-319 (epics & stories tables)
- `/lib/repositories/` - Epic and story repository files
- `/app/api/` - All API route handlers
- `/lib/validations/` - Validation schemas
- `/components/` - React components

If you modify core epic/story functionality, please update:
1. The implementation files
2. This documentation
3. Add/update tests
4. Create migration if schema changes

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **No story dependencies** - Can't specify "blocked by" relationships
2. **No task subtasks** - Tasks can't have child tasks
3. **No soft deletes** - Deleted stories are permanently removed
4. **No time tracking** - No hours estimation or logging
5. **No story templates** - Can't save story types as templates
6. **Task type filtering** - storyType not in public validation schema

### Recommended Enhancements
1. Add story dependency tracking
2. Enable story templates per type
3. Implement soft deletes with archive
4. Add time estimation/tracking
5. Support task subtasks (hierarchical tasks)
6. Enable custom fields per story type
7. Add bulk operations (update multiple stories)
8. Add due dates for individual stories

See EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md Section 15 for detailed enhancement recommendations.

---

## Getting Help

### Question: "Where is the epics table defined?"
Answer: `/lib/db/schema.ts` line 237. See FILE_STRUCTURE_SUMMARY.md

### Question: "How do I create a task?"
Answer: QUICK_REFERENCE_EPICS_STORIES.md "Create Task" example

### Question: "How do I filter stories?"
Answer: QUICK_REFERENCE_EPICS_STORIES.md "Common Queries" section

### Question: "What permissions do I need?"
Answer: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md Section 6 "Permission Model"

### Question: "How do tasks work?"
Answer: EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md Section 8 "Current Task Implementation"

### Question: "How do I add a new field to stories?"
Answer: Follow FILE_STRUCTURE_SUMMARY.md "Known Missing Features" and reference EPICS_STORIES_IMPLEMENTATION_OVERVIEW.md Section 13 "Architecture Patterns"

---

## Version Information

Documentation reflects the state of the codebase as of the latest commit with these key versions:
- Database: Drizzle ORM with PostgreSQL
- API: Next.js API routes
- Validation: Zod schemas
- Frontend: React with TypeScript

---

**Last Updated:** 2025-10-22
**Scope:** Epics, Stories, Tasks, and related functionality
**Status:** Current and comprehensive

