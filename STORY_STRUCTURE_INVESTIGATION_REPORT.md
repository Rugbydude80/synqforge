# 🔍 STORY DATA STRUCTURE INVESTIGATION REPORT

**Date:** Generated from codebase analysis  
**Purpose:** Complete analysis of story data structure for refinement feature implementation

---

## INVESTIGATION 1: Database Schema ✅

### Table Name
**`stories`** (PostgreSQL table)

### Complete Column List

```typescript
stories {
  // Primary Key
  id: varchar(36) PRIMARY KEY
  
  // Organization & Project Relations
  organizationId: varchar(36) NOT NULL
  epicId: varchar(36) NULLABLE
  projectId: varchar(36) NOT NULL
  parentId: varchar(255) NULLABLE
  splitFromId: varchar(255) NULLABLE
  isEpic: boolean DEFAULT false NOT NULL
  
  // STORY CONTENT FIELDS (KEY FINDING)
  title: varchar(255) NOT NULL
  description: text NULLABLE
  acceptanceCriteria: json NULLABLE (stored as string[])
  
  // Story Metadata
  storyPoints: smallint NULLABLE
  priority: priorityEnum DEFAULT 'medium' ('low' | 'medium' | 'high' | 'critical')
  status: storyStatusEnum DEFAULT 'backlog' ('backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked')
  storyType: storyTypeEnum DEFAULT 'feature' ('feature' | 'bug' | 'task' | 'spike')
  
  // Tags & Labels
  tags: json NULLABLE (stored as string[])
  labels: json NULLABLE (stored as string[])
  
  // AI Metadata
  aiGenerated: boolean DEFAULT false
  aiPrompt: text NULLABLE
  aiModelUsed: varchar(100) NULLABLE
  aiValidationScore: smallint NULLABLE
  aiSuggestions: json NULLABLE (stored as string[])
  aiConfidenceScore: smallint NULLABLE
  
  // Relations
  createdBy: varchar(36) NOT NULL
  assigneeId: varchar(36) NULLABLE
  sourceDocumentId: varchar(36) NULLABLE
  
  // Idempotency
  correlationKey: varchar(64) NULLABLE
  requestId: varchar(36) NULLABLE
  capabilityKey: varchar(100) NULLABLE
  
  // Enhanced AC Tracking
  technicalHints: json NULLABLE (stored as string[])
  manualReviewRequired: boolean DEFAULT false
  readyForSprint: boolean DEFAULT false
  
  // Completion Tracking
  doneAt: timestamp NULLABLE
  
  // Version Tracking
  lastUpdatedAt: timestamp DEFAULT now()
  updateVersion: integer DEFAULT 1
  
  // Template Versioning
  templateVersionId: varchar(36) NULLABLE
  
  // Timestamps
  createdAt: timestamp DEFAULT now()
  updatedAt: timestamp DEFAULT now()
}
```

### Key Findings
- ✅ **Separate columns exist** for `title`, `description`, and `acceptanceCriteria`
- ✅ **No single `content` field** - data is already structured
- ✅ **Acceptance criteria** stored as JSON array (`string[]`)
- ✅ **No separate acceptance criteria table** - stored inline as JSON

---

## INVESTIGATION 2: Sample Story Data Structure ✅

### TypeScript Interface (from `lib/api-client.ts`)

```typescript
export interface Story {
  id: string
  epicId?: string
  projectId: string
  title: string                    // ✅ Separate field
  description?: string             // ✅ Separate field
  acceptanceCriteria?: string[]    // ✅ Separate field (array)
  storyPoints?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  storyType: 'feature' | 'bug' | 'task' | 'spike'
  assignedTo?: string
  tags?: string[]
  aiGenerated: boolean
  aiPrompt?: string
  aiModelUsed?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  // Populated relations
  epic?: Epic
  assignee?: User
  project?: Project
}
```

### Repository Interface (from `lib/repositories/stories.repository.ts`)

```typescript
export interface StoryWithRelations {
  id: string
  projectId: string
  epicId: string | null
  title: string                    // ✅ Separate field
  description: string | null        // ✅ Separate field
  acceptanceCriteria: string[] | null  // ✅ Separate field (array)
  storyPoints: number | null
  storyType: 'feature' | 'bug' | 'task' | 'spike' | null
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked' | null
  assigneeId: string | null
  tags: string[] | null
  aiGenerated: boolean | null
  // ... additional fields
}
```

### Example Story Creation (from `lib/repositories/stories.repository.ts:151-174`)

```typescript
await db.insert(stories).values({
  id: storyId,
  organizationId: project.organizationId,
  projectId: input.projectId,
  epicId: input.epicId || null,
  title: input.title,                    // ✅ Direct field assignment
  description: input.description || null, // ✅ Direct field assignment
  acceptanceCriteria: input.acceptanceCriteria || null, // ✅ Direct field assignment (array)
  storyPoints: input.storyPoints || null,
  priority: input.priority,
  status: input.status || 'backlog',
  storyType: input.storyType || 'feature',
  // ... rest of fields
});
```

---

## INVESTIGATION 3: Story Content Format ✅

### Format Identified: **Format E: Separate Columns** ✅

**NOT** using:
- ❌ Format A: Structured JSON in single field
- ❌ Format B: Markdown in single field
- ❌ Format C: Plain Text in single field
- ❌ Format D: HTML/Rich Text

**IS using:**
- ✅ **Format E: Separate Columns** - `title`, `description`, `acceptanceCriteria` are individual database columns

### Data Storage Details

1. **Title**: `varchar(255)` - Plain text string
2. **Description**: `text` - Plain text string (nullable)
3. **Acceptance Criteria**: `json` column storing `string[]` array

### Example Data Structure

```json
{
  "id": "abc123",
  "title": "As a user, I want to login, so that I can access my account",
  "description": "User should be able to login using email and password...",
  "acceptanceCriteria": [
    "Given I am on the login page",
    "When I enter valid credentials",
    "Then I should be redirected to dashboard"
  ]
}
```

**No parsing needed** - fields are already separate!

---

## INVESTIGATION 4: Current Code Check ✅

### Story Type Definitions Found

1. **`lib/api-client.ts`** - Frontend Story interface
2. **`lib/repositories/stories.repository.ts`** - Backend StoryWithRelations interface
3. **`lib/db/schema.ts`** - Database schema definition (Drizzle ORM)

### Database Schema Definition

**File:** `lib/db/schema.ts:316-382`

```typescript
export const stories = pgTable('stories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 36 }).notNull(),
  epicId: varchar('epic_id', { length: 36 }),
  projectId: varchar('project_id', { length: 36 }).notNull(),
  // ... other fields
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  acceptanceCriteria: json('acceptance_criteria').$type<string[]>(),
  // ... rest of fields
})
```

### Story Creation/Update Logic

**Create Story:** `lib/repositories/stories.repository.ts:113-200`
- Uses separate fields directly
- No parsing required

**Update Story:** `app/api/stories/[storyId]/route.ts:91-283`
- Updates individual fields
- No parsing required

---

## INVESTIGATION 5: Frontend Story Display ✅

### Story Detail Component

**File:** `components/story-detail-client.tsx`

**How stories are accessed:**
```typescript
// Line 348-352: Description display
{story.description ? (
  <p className="text-muted-foreground whitespace-pre-wrap flex-1">
    {story.description}  // ✅ Direct field access
  </p>
) : (
  // Add description button
)}

// Line 378-382: Acceptance Criteria display
<AcceptanceCriteriaSection
  storyId={story.id}
  acceptanceCriteria={story.acceptanceCriteria || []}  // ✅ Direct field access
  onUpdate={handleAcceptanceCriteriaUpdate}
/>
```

**Findings:**
- ✅ UI accesses `story.title` directly
- ✅ UI accesses `story.description` directly
- ✅ UI accesses `story.acceptanceCriteria` directly (as array)
- ✅ **No parsing logic** - fields are used as-is

### Story Page

**File:** `app/stories/[storyId]/page.tsx`
- Fetches story from repository
- Passes to `StoryDetailClient` component
- No transformation/parsing

---

## INVESTIGATION 6: Story Creation/Edit Flow ✅

### Create Story API

**File:** `app/api/stories/route.ts:186-287`

**What fields are set:**
```typescript
const storyData = validationResult.data as CreateStoryInput;
// storyData contains:
// - title: string
// - description?: string
// - acceptanceCriteria?: string[]
// - projectId: string
// - ... other fields

const story = await storiesRepository.create(storyData, context.user.id);
```

**Repository Create Method:** `lib/repositories/stories.repository.ts:113-200`
- Receives structured input with separate fields
- Inserts directly into database columns
- **No parsing needed**

### Update Story API

**File:** `app/api/stories/[storyId]/route.ts:91-283`

**What fields are updated:**
```typescript
const updateData: any = {
  title?: string,
  description?: string,
  acceptanceCriteria?: string[],
  // ... other fields
};

const updatedStory = await storiesRepository.update(storyId, updateData, context.user.id);
```

**Findings:**
- ✅ API expects structured data with separate fields
- ✅ No single `content` field expected
- ✅ Updates individual columns directly

---

## INVESTIGATION 7: Acceptance Criteria Handling ✅

### Storage Method

**Format:** JSON column storing `string[]` array

**Schema Definition:**
```typescript
acceptanceCriteria: json('acceptance_criteria').$type<string[]>()
```

**Database Type:** PostgreSQL `json` column  
**TypeScript Type:** `string[] | null`

### Example Storage

```typescript
// In database (as JSON):
["Given I am on login page", "When I enter credentials", "Then I see dashboard"]

// In TypeScript:
acceptanceCriteria: string[] | null
```

### Related Tables Check

**Result:** ❌ **No separate acceptance criteria table**
- Acceptance criteria stored inline in `stories` table
- No foreign key relationships
- No completion tracking table (though individual AC items could have checkboxes in UI)

### Completion Tracking

- ✅ `doneAt` timestamp exists for story-level completion
- ❌ No per-AC completion tracking in database
- ✅ UI may track AC completion client-side (check `AcceptanceCriteriaSection` component)

---

## INVESTIGATION 8: Current Refinement Implementation ✅

### Refine Route

**File:** `app/api/stories/[storyId]/refine/route.ts`

### What It's Currently Doing

**Step 1: Get Story** (Line 82)
```typescript
const story = await storiesRepository.getById(storyId);
// Returns StoryWithRelations with separate fields:
// - story.title
// - story.description
// - story.acceptanceCriteria
```

**Step 2: Create Original Content JSON** (Line 115-119)
```typescript
const originalContent = JSON.stringify({
  title: story.title,                    // ✅ Using separate field
  description: story.description || '',  // ✅ Using separate field
  acceptanceCriteria: story.acceptanceCriteria || [], // ✅ Using separate field
});
```

**Step 3: Send to AI** (Line 137-145)
```typescript
const refinedStory = await refineCompleteUserStory(
  {
    title: story.title,                    // ✅ Separate field
    description: story.description || '',  // ✅ Separate field
    acceptanceCriteria: story.acceptanceCriteria || [], // ✅ Separate field
  },
  instructions,
  options
);
```

**Step 4: Store Refined Result** (Line 148-152)
```typescript
const refinedContent = JSON.stringify({
  title: refinedStory.title,
  description: refinedStory.description,
  acceptanceCriteria: refinedStory.acceptanceCriteria,
});
```

**Step 5: Return Result** (Line 180-192)
```typescript
return NextResponse.json({
  refinementId,
  originalContent: originalDescription,  // Only description for diff
  refinedContent: refinedDescription,     // Only description for diff
  refinedStory: {                        // ✅ Complete structured story
    title: refinedStory.title,
    description: refinedStory.description,
    acceptanceCriteria: refinedStory.acceptanceCriteria,
  },
  changes: diffResult,
  // ...
});
```

### AI Refinement Service

**File:** `lib/services/aiRefinementService.ts`

**Function:** `refineCompleteUserStory()` (Line 228-284)

**What it does:**
1. Refines title separately
2. Refines description separately
3. Refines each acceptance criterion separately
4. Returns structured object with all three fields

**Current Implementation:**
```typescript
export async function refineCompleteUserStory(
  story: {
    title: string;
    description?: string | null;
    acceptanceCriteria?: string[] | null;
  },
  instructions: string,
  options?: RefinementOptions
): Promise<{
  title: string;
  description: string;
  acceptanceCriteria: string[];
}> {
  // Refines each field separately
  // Returns structured result
}
```

### Current Diff Generation

**File:** `lib/services/diffService.ts` (referenced in refine route)

**What it does:**
- Generates diff for description field only (Line 159)
- Tracks additions, deletions, modifications
- Calculates word count delta

**Current Limitation:**
- Only generates diff for description
- Title and acceptance criteria changes not tracked in diff

---

## SUMMARY REPORT

### STORY DATA STRUCTURE

- **Database Table:** `stories`
- **Storage Format:** ✅ **Separate Fields** (title, description, acceptanceCriteria columns)
- **Content Format:** ✅ **Structured Data** (not JSON/Markdown/Plain Text in single field)

### CURRENT SCHEMA

```
stories {
  id: varchar(36) PRIMARY KEY
  organizationId: varchar(36) NOT NULL
  projectId: varchar(36) NOT NULL
  epicId: varchar(36) NULLABLE
  
  // STORY CONTENT (Separate Columns)
  title: varchar(255) NOT NULL
  description: text NULLABLE
  acceptanceCriteria: json NULLABLE (string[])
  
  // Metadata
  storyPoints: smallint NULLABLE
  priority: priorityEnum DEFAULT 'medium'
  status: storyStatusEnum DEFAULT 'backlog'
  storyType: storyTypeEnum DEFAULT 'feature'
  tags: json NULLABLE (string[])
  labels: json NULLABLE (string[])
  
  // Relations
  createdBy: varchar(36) NOT NULL
  assigneeId: varchar(36) NULLABLE
  
  // Timestamps
  createdAt: timestamp DEFAULT now()
  updatedAt: timestamp DEFAULT now()
  
  // ... additional fields (AI, versioning, etc.)
}
```

### SAMPLE STORY DATA

```typescript
{
  id: "abc123",
  organizationId: "org123",
  projectId: "proj123",
  epicId: null,
  title: "As a user, I want to login, so that I can access my account",
  description: "User should be able to login using email and password. The system should validate credentials and redirect to dashboard.",
  acceptanceCriteria: [
    "Given I am on the login page",
    "When I enter valid email and password",
    "Then I should be redirected to dashboard",
    "And I should see a welcome message"
  ],
  storyPoints: 5,
  priority: "high",
  status: "backlog",
  storyType: "feature",
  tags: ["authentication", "security"],
  createdBy: "user123",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z"
}
```

### PARSING STRATEGY

**Current Status:** ✅ **NO PARSING NEEDED**

- Stories are already stored with separate columns
- Title, description, and acceptance criteria are individual fields
- Current refinement implementation already uses separate fields correctly
- No migration needed

**However, potential enhancements:**
- ✅ Current implementation is correct
- ⚠️ Could enhance diff generation to track title and AC changes
- ⚠️ Could add validation/parsing for edge cases (empty strings, malformed arrays)

### RECOMMENDED APPROACH

**Current Implementation:** ✅ **ALREADY CORRECT**

The refinement feature is **already implemented correctly**:

1. ✅ Reads story with separate fields (`title`, `description`, `acceptanceCriteria`)
2. ✅ Sends structured data to AI service
3. ✅ Receives structured response
4. ✅ Stores refined content as JSON string in `storyRefinements` table
5. ✅ Returns structured `refinedStory` object

**Potential Enhancements:**

1. **Enhanced Diff Generation**
   - Currently only tracks description changes
   - Could track title and acceptance criteria changes separately
   - Could show per-field diffs

2. **Better Error Handling**
   - Validate that acceptanceCriteria is always an array
   - Handle null/undefined edge cases more gracefully

3. **Refinement History**
   - Already stored in `storyRefinements` table
   - Could enhance UI to show full history with all fields

4. **Apply Refinement to Story**
   - Currently refinement is stored but not automatically applied
   - Could add "Apply" button to update story fields directly

### FILES THAT NEED MODIFICATION (if enhancing)

**Current Implementation (Already Working):**
- ✅ `app/api/stories/[storyId]/refine/route.ts` - Correctly uses separate fields
- ✅ `lib/services/aiRefinementService.ts` - Correctly refines each field separately
- ✅ `lib/repositories/stories.repository.ts` - Correctly reads/writes separate fields

**Potential Enhancements:**
1. `lib/services/diffService.ts` - Enhance to track title and AC changes
2. `components/story-refine/RefineStoryModal.tsx` - Show per-field diffs
3. `app/api/stories/[storyId]/refine/route.ts` - Add "apply refinement" endpoint

---

## CONCLUSION

✅ **The story refinement feature is already correctly implemented!**

- Stories use separate database columns (not a single content field)
- Refinement service correctly handles separate fields
- No parsing needed - data is already structured
- Current implementation follows best practices

**The investigation reveals that no changes are needed** - the refinement feature is working as designed with the existing separate-column structure.

If you want to enhance the feature, consider:
1. Enhanced diff tracking for all fields
2. Better UI for showing per-field changes
3. Direct "apply refinement" functionality

---

**Investigation Complete** ✅

