# SynqForge - Complete Feature Build Tasks

## Context
Read CLAUDE_CODE_CONTEXT.md first to understand the project structure.

## Current State
- Dashboard renders but buttons don't work
- All data is mock data
- No API connections exist
- Missing: Projects pages, Stories pages, AI generation flow
- Backend APIs exist and work (tested separately)
- Auth works (can sign in/up)

## Goal
Build a fully functional application with working CRUD operations for Projects and Stories, connected AI generation, and proper navigation between pages.

---

# TASK 1: Create Type-Safe API Client (Foundation)

**File**: `lib/api-client.ts`

Create a centralized API client with TypeScript types for all endpoints.

## Requirements

```typescript
// Include these features:
- Base fetch wrapper with error handling
- Automatic auth token inclusion (from NextAuth session)
- Type-safe request/response interfaces
- Error types matching backend responses
- Loading state helpers

// API methods needed:
- Projects: list, create, getById, update, delete
- Stories: list, create, getById, update, delete, bulkCreate, assignToSprint, move, getStats
- Epics: list, create, getById, update, delete
- AI: generateStories, generateEpic, analyzeDocument
- Users: getCurrent, search
```

## Implementation Pattern

```typescript
// Type-safe fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new APIError(error.error, response.status, error.details);
  }

  return response.json();
}

// Example method
export const api = {
  projects: {
    list: (filters?: ProjectFilters) => 
      fetchAPI<{ projects: Project[]; total: number }>('/api/projects'),
    create: (data: CreateProjectInput) => 
      fetchAPI<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    // ... more methods
  },
  stories: {
    // ... story methods
  }
};
```

## Success Criteria
- [ ] All API endpoints typed
- [ ] Error handling works
- [ ] Auth token included automatically
- [ ] Can import and use: `import { api } from '@/lib/api-client'`

---

# TASK 2: Create Missing UI Components

**Files**: 
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/ui/textarea.tsx`
- `components/ui/dialog.tsx`
- `components/ui/label.tsx`

Create these Radix UI + Tailwind components following the existing pattern from button.tsx and card.tsx.

## Requirements

Each component should:
- Match the design system (purple/emerald gradient theme)
- Use Tailwind for styling
- Support dark backgrounds
- Have proper TypeScript types
- Include variants where applicable

## Dialog Component Pattern

```typescript
// Must support:
- Open/close state
- Title and description
- Footer with actions
- Overlay backdrop
- Close on escape
- Focus trap

// Example usage:
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Project</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button onClick={handleSubmit}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Success Criteria
- [ ] All 5 components created
- [ ] Match existing design system
- [ ] TypeScript types included
- [ ] Work with dark theme

---

# TASK 3: Build Create Project Flow

**Files**:
- `components/create-project-modal.tsx` (new)
- `app/dashboard/page.tsx` (update)

Make the "New Project" button functional.

## Requirements

### CreateProjectModal Component

```typescript
// Form fields:
- name: string (required, max 100 chars)
- key: string (required, 2-10 uppercase letters, auto-generated from name)
- description: string (optional, max 500 chars)
- startDate: date (optional)
- endDate: date (optional)

// Features:
- Real-time validation (Zod)
- Auto-generate project key from name (e.g., "My Project" → "MP")
- Show loading state during creation
- Show success message and redirect to project
- Show error message if creation fails
- Close modal on cancel or success
```

### Update Dashboard

```typescript
// Changes needed:
1. Add state for modal: const [isCreateOpen, setIsCreateOpen] = useState(false)
2. Wire "New Project" button: onClick={() => setIsCreateOpen(true)}
3. Add <CreateProjectModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
4. After successful creation, refresh projects list
```

## API Call Example

```typescript
const handleCreate = async (data: CreateProjectInput) => {
  try {
    setIsLoading(true);
    const project = await api.projects.create({
      name: data.name,
      key: data.key,
      description: data.description,
      organizationId: user.organizationId, // from session
    });
    
    toast.success('Project created!');
    router.push(`/projects/${project.id}`);
  } catch (error) {
    toast.error(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

## Success Criteria
- [ ] "New Project" button opens modal
- [ ] Form validation works
- [ ] Can create project successfully
- [ ] Shows loading/error/success states
- [ ] Redirects to project page after creation

---

# TASK 4: Build Projects List Page

**File**: `app/projects/page.tsx` (new)

Create a page that shows all user's projects.

## Requirements

### Page Structure

```typescript
// Layout:
- Header with "Projects" title and "Create Project" button
- Search bar (filter by name)
- Filter dropdown (status: active, archived, all)
- Grid of project cards
- Empty state if no projects

// Project Card shows:
- Project name
- Project key (badge)
- Description (truncated)
- Progress bar (% of stories completed)
- Stats: total stories, completed, in progress
- Last updated timestamp
- Click to go to project detail

// Features:
- Client-side search filtering
- Load projects on mount from API
- Loading skeleton while fetching
- Error state with retry button
- Infinite scroll or pagination (30 per page)
```

## Data Fetching Pattern

```typescript
'use client';

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await api.projects.list({
        organizationId: session?.user.organizationId
      });
      setProjects(data.projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render UI...
}
```

## Success Criteria
- [ ] Can access /projects route
- [ ] Shows loading state initially
- [ ] Fetches and displays real projects
- [ ] Search filtering works
- [ ] Can click project to go to detail page
- [ ] "Create Project" button works
- [ ] Shows empty state if no projects

---

# TASK 5: Build Project Detail Page

**File**: `app/projects/[projectId]/page.tsx` (new)

Create the main project workspace with tabs for different views.

## Requirements

### Page Structure

```typescript
// Header:
- Project name (editable on click)
- Project key badge
- Breadcrumb: Projects / [Project Name]
- Actions: Settings, Archive, Delete

// Tabs:
1. Board - Kanban board with stories
2. Stories - List view of all stories
3. Epics - List of epics
4. Sprints - Sprint management
5. Settings - Project settings

// Default tab: Board
```

### Board Tab (Priority)

Use existing `components/kanban-board.tsx` but connect it to real data:

```typescript
// Changes needed to kanban-board.tsx:
1. Accept projectId prop
2. Fetch stories for this project: api.stories.list({ projectId })
3. Group stories by status into columns
4. Implement drag-and-drop: api.stories.move(storyId, newStatus)
5. Add "Create Story" button that opens modal
6. Show loading skeletons
7. Handle empty states per column
8. Optimistic updates (update UI immediately, rollback on error)
```

### Stories Tab

```typescript
// Table view:
- Columns: Title, Epic, Status, Priority, Points, Assignee, Created
- Sortable columns
- Filter by status, priority, assignee
- Click row to open story detail modal
- Bulk actions: delete, assign to sprint
- "Create Story" button
```

## Data Fetching

```typescript
const [project, setProject] = useState<Project | null>(null);
const [stories, setStories] = useState<Story[]>([]);
const [activeTab, setActiveTab] = useState<'board' | 'stories' | 'epics' | 'sprints'>('board');

useEffect(() => {
  fetchProjectData();
}, [projectId]);

const fetchProjectData = async () => {
  const [projectData, storiesData] = await Promise.all([
    api.projects.getById(projectId),
    api.stories.list({ projectId })
  ]);
  
  setProject(projectData);
  setStories(storiesData.stories);
};
```

## Success Criteria
- [ ] Can access /projects/[id]
- [ ] Shows project details
- [ ] Tabs work and switch views
- [ ] Board tab shows kanban board with real stories
- [ ] Can drag and drop stories (updates status)
- [ ] Stories tab shows list view
- [ ] Can navigate back to projects list

---

# TASK 6: Build Story Creation Flow

**Files**:
- `components/story-form.tsx` (new)
- `components/story-modal.tsx` (new)

Create reusable story creation/editing components.

## Requirements

### StoryForm Component

```typescript
// Props:
interface StoryFormProps {
  projectId: string;
  initialData?: Partial<Story>; // for editing
  onSubmit: (data: CreateStoryInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Form fields:
- title: string (required)
- description: textarea (optional)
- acceptanceCriteria: array of strings (add/remove items)
- epic: select dropdown (optional)
- priority: select (low, medium, high, critical)
- storyPoints: number input (0-100)
- assignee: user search/select (optional)
- tags: multi-select or chips (optional)

// Features:
- Zod validation
- Show field errors inline
- Disable submit while loading
- Auto-focus title on mount
```

### StoryModal Component

```typescript
// Wrapper around StoryForm
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{story ? 'Edit Story' : 'Create Story'}</DialogTitle>
    </DialogHeader>
    <StoryForm
      projectId={projectId}
      initialData={story}
      onSubmit={handleSubmit}
      onCancel={() => setIsOpen(false)}
    />
  </DialogContent>
</Dialog>
```

### Integration

Add "Create Story" buttons to:
1. Project detail page (Board tab)
2. Dashboard quick actions
3. Stories list page (when built)

## Success Criteria
- [ ] Form renders with all fields
- [ ] Validation works
- [ ] Can create story successfully
- [ ] Shows in kanban board immediately
- [ ] Can edit existing stories
- [ ] All dropdowns populated (epics, users)

---

# TASK 7: Connect AI Generation

**Files**:
- `app/ai-generate/page.tsx` (update)

Make the AI Generate page functional.

## Current State
The page exists but doesn't connect to the AI service.

## Requirements

### Update AI Generate Page

```typescript
// Features to implement:
1. File upload (PDF, DOCX, TXT)
   - Show upload area
   - Validate file type and size (max 10MB)
   - Upload to backend: POST /api/ai/analyze-document
   - Show analysis results

2. Manual prompt input
   - Textarea for requirements
   - "Generate Stories" button
   - Send to: POST /api/ai/generate-stories

3. Select project for generated stories
   - Dropdown to choose project
   - Required before generating

4. Review generated stories
   - Show list of AI-generated stories
   - Checkboxes to select which to create
   - Edit story before creating
   - Batch create: POST /api/stories/bulk

5. Success flow
   - Show success message
   - Link to view stories in project
   - Option to generate more
```

## Document Analysis Flow

```typescript
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', selectedProjectId);

  try {
    setIsAnalyzing(true);
    const result = await fetch('/api/ai/analyze-document', {
      method: 'POST',
      body: formData,
    }).then(r => r.json());

    setDocumentAnalysis(result.analysis);
    setGeneratedStories(result.suggestedStories);
  } catch (error) {
    toast.error('Failed to analyze document');
  } finally {
    setIsAnalyzing(false);
  }
};
```

## Story Generation Flow

```typescript
const handleGenerate = async () => {
  try {
    setIsGenerating(true);
    const response = await api.ai.generateStories({
      projectId: selectedProjectId,
      prompt: prompt,
      context: documentAnalysis,
      count: 5,
    });

    setGeneratedStories(response.stories);
    setStep('review'); // Move to review step
  } catch (error) {
    toast.error('Failed to generate stories');
  } finally {
    setIsGenerating(false);
  }
};
```

## Batch Creation Flow

```typescript
const handleCreateStories = async () => {
  const selectedStories = generatedStories.filter(s => s.selected);
  
  try {
    setIsCreating(true);
    await api.stories.bulkCreate({
      projectId: selectedProjectId,
      stories: selectedStories.map(s => ({
        title: s.title,
        description: s.description,
        acceptanceCriteria: s.acceptanceCriteria,
        priority: s.priority,
        aiGenerated: true,
      })),
    });

    toast.success(`${selectedStories.length} stories created!`);
    router.push(`/projects/${selectedProjectId}`);
  } catch (error) {
    toast.error('Failed to create stories');
  } finally {
    setIsCreating(false);
  }
};
```

## Success Criteria
- [ ] Can upload document
- [ ] Document analysis works
- [ ] Can generate stories from prompt
- [ ] Shows generated stories for review
- [ ] Can edit stories before creating
- [ ] Batch creation works
- [ ] Redirects to project after creation
- [ ] All loading states work

---

# TASK 8: Connect Dashboard to Real Data

**File**: `app/dashboard/page.tsx` (update)

Replace all mock data with real API calls.

## Requirements

### Metrics Cards

```typescript
// Fetch real data:
const [metrics, setMetrics] = useState({
  activeProjects: 0,
  totalStories: 0,
  completedPercentage: 0,
  aiGenerated: 0,
});

useEffect(() => {
  fetchDashboardData();
}, []);

const fetchDashboardData = async () => {
  const [projects, allStories] = await Promise.all([
    api.projects.list({ organizationId: user.organizationId }),
    api.stories.list({ 
      organizationId: user.organizationId,
      limit: 1000 // Get all for stats
    }),
  ]);

  setMetrics({
    activeProjects: projects.projects.filter(p => p.status === 'active').length,
    totalStories: allStories.total,
    completedPercentage: Math.round(
      (allStories.stories.filter(s => s.status === 'done').length / allStories.total) * 100
    ),
    aiGenerated: allStories.stories.filter(s => s.aiGenerated).length,
  });
};
```

### Recent Activity

```typescript
// Fetch from activities API:
const [activities, setActivities] = useState<Activity[]>([]);

const fetchActivities = async () => {
  const data = await api.activities.list({
    organizationId: user.organizationId,
    limit: 10,
  });
  setActivities(data.activities);
};

// Display:
{activities.map(activity => (
  <ActivityItem
    key={activity.id}
    type={activity.type}
    user={activity.user.name}
    metadata={activity.metadata}
    timestamp={activity.createdAt}
  />
))}
```

### Quick Actions

Wire up all buttons:
1. New Project → Open create project modal
2. AI Generate → Navigate to /ai-generate
3. Upload Document → Navigate to /ai-generate with file upload focused

## Success Criteria
- [ ] Metrics show real numbers
- [ ] Recent activity loads from API
- [ ] All quick action buttons work
- [ ] Page refreshes data automatically
- [ ] Loading states during fetch
- [ ] Error handling if API fails

---

# TASK 9: Build Stories List Page

**File**: `app/stories/page.tsx` (new)

Create a dedicated stories management page.

## Requirements

### Page Structure

```typescript
// Layout:
- Header: "Stories" + filters + "Create Story" button
- Filter bar:
  - Search by title
  - Filter by project (dropdown)
  - Filter by status (multi-select)
  - Filter by priority (multi-select)
  - Filter by assignee (dropdown)
  - Filter by AI generated (checkbox)
- Story table/cards
- Pagination (50 per page)
```

### Story Table

```typescript
// Columns:
- Checkbox (for bulk actions)
- Story ID (clickable)
- Title (clickable to open detail)
- Project (badge)
- Epic (if assigned)
- Status (badge with color)
- Priority (badge with color)
- Points (number)
- Assignee (avatar + name)
- Created date

// Features:
- Sortable columns
- Click row to open story detail modal
- Bulk actions: Delete, Assign to sprint, Change status
```

### Filters

```typescript
const [filters, setFilters] = useState({
  search: '',
  projectId: '',
  status: [],
  priority: [],
  assigneeId: '',
  aiGenerated: false,
});

const filteredStories = stories.filter(story => {
  if (filters.search && !story.title.toLowerCase().includes(filters.search.toLowerCase())) {
    return false;
  }
  if (filters.projectId && story.projectId !== filters.projectId) {
    return false;
  }
  // ... other filters
  return true;
});
```

## Success Criteria
- [ ] Can access /stories route
- [ ] Shows all user's stories
- [ ] Filters work correctly
- [ ] Sorting works
- [ ] Can click story to view detail
- [ ] Bulk actions work
- [ ] Pagination works

---

# TASK 10: Add Story Detail Modal

**File**: `components/story-detail-modal.tsx` (new)

Create a modal to view/edit story details.

## Requirements

### Layout

```typescript
// Three modes:
1. View mode (default)
   - Display all story information
   - "Edit" button to switch to edit mode
   - "Delete" button
   - Activity history at bottom

2. Edit mode
   - Show StoryForm with current values
   - "Save" and "Cancel" buttons

3. Loading mode
   - Show skeleton while fetching story details
```

### Story Information

```typescript
// Display sections:
- Header: Title, status badge, priority badge
- Description (markdown formatted)
- Acceptance criteria (checklist)
- Details:
  - Epic (if assigned)
  - Story points
  - Assignee
  - Tags
  - Sprint (if assigned)
  - Created by + date
  - Last updated + date
- Activity timeline (who did what when)
```

### Actions

```typescript
// Available actions:
- Edit story (opens edit mode)
- Delete story (with confirmation)
- Assign to sprint (dropdown)
- Change status (dropdown)
- Change assignee (search/select)
- Add comment (future feature)
```

## Success Criteria
- [ ] Modal opens when clicking story
- [ ] Shows complete story details
- [ ] Edit mode works
- [ ] Can update story
- [ ] Can delete story
- [ ] Shows activity history
- [ ] Quick actions work

---

# TASK 11: Add Navigation Updates

**Files**:
- Update sidebar navigation in dashboard
- Add breadcrumbs to all pages

## Requirements

### Sidebar Navigation

```typescript
// Update links to be functional:
- Dashboard → /dashboard
- Projects → /projects (make active)
- Stories → /stories (make active)
- AI Tools → /ai-generate (make active)
- Team → /team (future)
- Settings → /settings (future)

// Show active state for current page
// Add user menu at bottom with:
- Profile
- Settings
- Sign out
```

### Breadcrumbs

Add to pages:
- Projects → `Home / Projects`
- Project Detail → `Home / Projects / [Project Name]`
- Stories → `Home / Stories`
- AI Generate → `Home / AI Tools / Generate`

## Success Criteria
- [ ] All nav links work
- [ ] Active state shows correctly
- [ ] Breadcrumbs on all pages
- [ ] User menu works
- [ ] Sign out works

---

# TASK 12: Add Loading & Error States

**Files**: All pages need consistent loading/error handling

## Requirements

### Loading States

```typescript
// Use consistent loading pattern:
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" /> {/* Title */}
      <Skeleton className="h-64 w-full" /> {/* Content */}
    </div>
  );
}
```

### Error States

```typescript
// Use consistent error pattern:
if (error) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-red-400 mb-4">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-400 mb-4">{error}</p>
      <Button onClick={retry}>Try Again</Button>
    </div>
  );
}
```

### Empty States

```typescript
// Use consistent empty pattern:
if (items.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-gray-500 mb-4">
        <Inbox className="w-16 h-16" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        No {itemType} yet
      </h3>
      <p className="text-gray-400 mb-4">
        Get started by creating your first {itemType}
      </p>
      <Button onClick={onCreate}>Create {itemType}</Button>
    </div>
  );
}
```

## Success Criteria
- [ ] All pages show loading state while fetching
- [ ] All pages show error state on failure
- [ ] All lists show empty state when no items
- [ ] Retry buttons work

---

# TASK 13: Add Toast Notifications

**File**: `components/toast-provider.tsx` (new)

Add toast notifications for user feedback.

## Requirements

Use a library like `sonner` or build custom:

```bash
npm install sonner
```

```typescript
// Add to app/layout.tsx:
import { Toaster } from 'sonner';

<body>
  <Providers>
    {children}
    <Toaster 
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgb(31 41 55)',
          border: '1px solid rgb(55 65 81)',
          color: '#fff',
        },
      }}
    />
  </Providers>
</body>
```

## Usage Throughout App

```typescript
import { toast } from 'sonner';

// Success
toast.success('Project created successfully!');

// Error
toast.error('Failed to create project');

// Loading
const toastId = toast.loading('Creating project...');
// Later...
toast.success('Project created!', { id: toastId });

// With action
toast.success('Story deleted', {
  action: {
    label: 'Undo',
    onClick: () => handleUndo()
  }
});
```

## Success Criteria
- [ ] Toast provider added
- [ ] Shows success messages
- [ ] Shows error messages
- [ ] Shows loading states
- [ ] Matches design system

---

# EXECUTION ORDER

Execute tasks in this exact order:

1. Task 1: API Client (foundation for everything)
2. Task 2: UI Components (needed for forms)
3. Task 3: Create Project Flow
4. Task 4: Projects List Page
5. Task 5: Project Detail Page (with Board)
6. Task 6: Story Creation Flow
7. Task 13: Toast Notifications (helpful for remaining tasks)
8. Task 8: Connect Dashboard
9. Task 7: AI Generation
10. Task 9: Stories List Page
11. Task 10: Story Detail Modal
12. Task 11: Navigation Updates
13. Task 12: Loading & Error States (polish)

---

# TESTING CHECKLIST

After all tasks complete, test this flow:

## Happy Path
1. [ ] Sign up / Sign in
2. [ ] Land on dashboard, see "No projects yet"
3. [ ] Click "New Project"
4. [ ] Create project "Test Project"
5. [ ] Redirected to project detail page
6. [ ] See empty Kanban board
7. [ ] Click "Create Story"
8. [ ] Create story "Test Story"
9. [ ] See story in Backlog column
10. [ ] Drag story to "In Progress"
11. [ ] Click story to view detail
12. [ ] Edit story, change title
13. [ ] Save changes
14. [ ] Go to Stories page via sidebar
15. [ ] See story in list
16. [ ] Go to AI Generate
17. [ ] Generate stories from prompt
18. [ ] Review and create stories
19. [ ] See stories in project
20. [ ] Sign out

## Error Cases
- [ ] Create project with duplicate key → Error
- [ ] Create story without title → Validation error
- [ ] Delete project with stories → Confirmation
- [ ] Network error during creation → Error toast + retry

---

# CODE QUALITY REQUIREMENTS

## Every component must have:
- [ ] TypeScript types (no `any`)
- [ ] Error handling
- [ ] Loading states
- [ ] Proper cleanup (useEffect)
- [ ] Accessible (keyboard nav, ARIA labels)

## Every API call must have:
- [ ] Try-catch error handling
- [ ] Loading state
- [ ] Success/error toast
- [ ] Type-safe request/response

## Every form must have:
- [ ] Zod validation
- [ ] Field-level errors
- [ ] Disabled submit while loading
- [ ] Clear error messages

---

# FINAL DELIVERABLE

After completing all tasks, the app should:

✅ Have working authentication  
✅ Create/view/edit/delete projects  
✅ Create/view/edit/delete stories  
✅ Drag and drop stories on Kanban board  
✅ Generate stories with AI  
✅ Upload and analyze documents  
✅ Show real-time activity  
✅ Navigate between all pages  
✅ Display loading/error/empty states  
✅ Show toast notifications  
✅ Work completely end-to-end  

No mock data. Everything functional. Production-ready.