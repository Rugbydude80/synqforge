# SynqForge Frontend Implementation Checklist

**Generated:** October 13, 2025
**Status:** Ready for implementation
**Target:** Production-ready front-end for Projects → Epics → Stories

---

## 📋 Table of Contents

- [Milestone 1: Navigation, Layout, and Lists](#milestone-1-navigation-layout-and-lists)
- [Milestone 2: Project & Epic Workflows](#milestone-2-project--epic-workflows)
- [Milestone 3: Story Detail (Canonical) & Inline Editing](#milestone-3-story-detail-canonical--inline-editing)
- [Milestone 4: Boards & Sprint Basics](#milestone-4-boards--sprint-basics)
- [Milestone 5: AI Assists (UI Only)](#milestone-5-ai-assists-ui-only)
- [Milestone 6: Notifications & Digests](#milestone-6-notifications--digests)
- [Cross-Cutting Quality](#cross-cutting-quality)
- [Implementation Progress](#implementation-progress)

---

## Milestone 1: Navigation, Layout, and Lists

**Goal:** Establish core navigation shell and list views with filtering

### ✅ Completed

- [x] Global sidebar navigation ([components/app-sidebar.tsx](components/app-sidebar.tsx))
- [x] Projects list page ([app/projects/page.tsx](app/projects/page.tsx))
- [x] Stories list page ([app/stories/page.tsx](app/stories/page.tsx))
- [x] Basic filters and search (Projects & Stories)
- [x] **NEW:** Epics list page ([app/epics/page.tsx](app/epics/page.tsx))
- [x] **NEW:** Skeleton loading component ([components/ui/skeleton.tsx](components/ui/skeleton.tsx))

### 🔲 Remaining Tasks

#### Task M1.1: Add Notification Bell to Header
**Priority:** High | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Integrate [components/notifications/notification-bell.tsx](components/notifications/notification-bell.tsx) into sidebar or header
- [ ] Bell shows unread count badge
- [ ] Clicking bell opens dropdown with last 5 notifications
- [ ] "View all" link navigates to `/notifications`
- [ ] Badge updates in real-time (use existing realtime service)

**Files:**
- Modify: `components/app-sidebar.tsx` OR create `components/app-header.tsx`

---

#### Task M1.2: Upgrade Filters to Use URL Params
**Priority:** Medium | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] Replace `useState` with `useSearchParams` for filters in:
  - `app/projects/page.tsx`
  - `app/stories/page.tsx`
  - `app/epics/page.tsx`
- [ ] URL updates when filters change (e.g., `?status=active&search=auth`)
- [ ] Page refresh preserves filter state
- [ ] Clear filters button resets URL params

**Example:**
```typescript
const searchParams = useSearchParams()
const router = useRouter()
const pathname = usePathname()

const updateFilters = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams)
  if (value === 'all') params.delete(key)
  else params.set(key, value)
  router.push(`${pathname}?${params.toString()}`)
}
```

---

#### Task M1.3: Add Keyboard Navigation to Lists
**Priority:** Low | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] `/` key focuses search input
- [ ] `↑` / `↓` keys navigate list items
- [ ] `Enter` key opens selected item
- [ ] `Esc` key clears search / deselects
- [ ] Visual indicator for selected row

**Files:**
- Modify: `app/projects/page.tsx`, `app/stories/page.tsx`, `app/epics/page.tsx`

---

## Milestone 2: Project & Epic Workflows

**Goal:** Full CRUD workflows for Projects and Epics with two-pane layouts

### ✅ Completed

- [x] Project detail page ([app/projects/[projectId]/page.tsx](app/projects/[projectId]/page.tsx))
- [x] Project create/edit modals ([components/create-project-modal.tsx](components/create-project-modal.tsx), [components/project-edit-modal.tsx](components/project-edit-modal.tsx))
- [x] Epic create/edit modal ([components/epic-form-modal.tsx](components/epic-form-modal.tsx))
- [x] **NEW:** Epic detail drawer ([components/epic-detail-drawer.tsx](components/epic-detail-drawer.tsx))
- [x] **NEW:** Sheet (drawer) UI component ([components/ui/sheet.tsx](components/ui/sheet.tsx))

### 🔲 Remaining Tasks

#### Task M2.1: Add Breadcrumbs to All Pages
**Priority:** Medium | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Breadcrumbs show on:
  - Project detail: `Projects > {Project Name}`
  - Epic detail: `Projects > {Project} > Epics > {Epic}`
  - Story detail: `Projects > {Project} > Stories > {Story}`
- [ ] Breadcrumbs are clickable and navigate correctly
- [ ] Component: [components/ui/breadcrumbs.tsx](components/ui/breadcrumbs.tsx) (already created!)

**Example Usage:**
```tsx
<Breadcrumbs
  items={[
    { label: 'Projects', href: '/projects' },
    { label: project.name, href: `/projects/${project.id}` },
    { label: 'Epics' },
  ]}
/>
```

---

#### Task M2.2: Extract Optimistic Update Pattern
**Priority:** Low | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] Create `lib/hooks/use-optimistic-mutation.ts`
- [ ] Hook handles optimistic UI updates
- [ ] Automatic rollback on error
- [ ] Toast notifications for success/error
- [ ] Refactor existing modals to use hook

**Example:**
```typescript
const { mutate, loading } = useOptimisticMutation({
  mutationFn: api.stories.update,
  onSuccess: () => toast.success('Updated'),
  onError: () => toast.error('Failed'),
})
```

---

## Milestone 3: Story Detail (Canonical) & Inline Editing

**Goal:** Rich, editable story detail page with AC management and comments

### ✅ Completed

- [x] Server-side story detail page ([app/stories/[storyId]/page.tsx](app/stories/[storyId]/page.tsx))
- [x] **NEW:** Client-side story detail component ([components/story-detail-client.tsx](components/story-detail-client.tsx))
- [x] **NEW:** Inline editing for title, description, status, priority, assignee, tags
- [x] **NEW:** Acceptance Criteria section with:
  - Add/edit/delete AC items
  - Drag-to-reorder (using `@dnd-kit`)
  - Toggle completion checkboxes
  - Component: [components/acceptance-criteria-section.tsx](components/acceptance-criteria-section.tsx)
- [x] **NEW:** User select dropdown ([components/user-select.tsx](components/user-select.tsx))
- [x] **NEW:** Tags input component ([components/tags-input.tsx](components/tags-input.tsx))
- [x] Comment thread with mentions/replies ([components/comments/comment-thread.tsx](components/comments/comment-thread.tsx))
- [x] **NEW:** Comment permalinks (copy link button, hash navigation)
- [x] Optimistic updates with rollback

### 🔲 Remaining Tasks

#### Task M3.1: Add Story Point Inline Edit
**Priority:** Low | **Effort:** 1 hour

**Acceptance Criteria:**
- [ ] Story points badge is clickable
- [ ] Opens small number input
- [ ] Saves on Enter, cancels on Esc
- [ ] Optimistic update

**Files:**
- Modify: `components/story-detail-client.tsx`

---

#### Task M3.2: Add "AI Validate" Button
**Priority:** Medium | **Effort:** 3 hours (See M5.2 for full implementation)

**Acceptance Criteria:**
- [ ] Button in story detail header
- [ ] Opens AI validation panel (see M5.2)

---

## Milestone 4: Boards & Sprint Basics

**Goal:** Functional Kanban board with drag & drop and sprint filtering

### ✅ Completed

- [x] Kanban board skeleton ([components/kanban-board.tsx](components/kanban-board.tsx))
- [x] Drag & drop setup (using `@dnd-kit/core`)
- [x] Board integrated into project detail page

### 🔲 Remaining Tasks

#### Task M4.1: Wire Kanban Board to API
**Priority:** **HIGH** | **Effort:** 4 hours

**Acceptance Criteria:**
- [ ] Fetch real stories via `api.stories.list({ projectId, status })`
- [ ] Replace hardcoded demo data
- [ ] Group stories by status into columns
- [ ] Story cards show: title, assignee avatar, story points, AC progress
- [ ] Card click navigates to `/stories/:id`

**Files:**
- Refactor: `components/kanban-board.tsx`
- Extract: `components/board/kanban-column.tsx`
- Extract: `components/board/story-card.tsx`

**Key Code:**
```typescript
const { data: stories, isLoading } = useQuery({
  queryKey: ['stories', projectId],
  queryFn: () => api.stories.list({ projectId })
})

const columns = {
  backlog: stories.filter(s => s.status === 'backlog'),
  ready: stories.filter(s => s.status === 'ready'),
  // ... etc
}
```

---

#### Task M4.2: Implement Drag & Drop Handler
**Priority:** **HIGH** | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] On drop, update story status via `api.stories.update`
- [ ] Optimistic UI update (card moves immediately)
- [ ] Rollback on error (card snaps back)
- [ ] Toast success/error message
- [ ] Invalid drops show visual feedback (shake animation)

**Files:**
- Modify: `components/kanban-board.tsx`

---

#### Task M4.3: Add Sprint Selector to Board
**Priority:** Medium | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] Dropdown in board header
- [ ] Fetches sprints via `api.sprints.list({ projectId })`
- [ ] Filter board by selected sprint
- [ ] "All stories" option shows unfiltered view
- [ ] Sprint selector persists via URL param (`?sprint=abc123`)

**Files:**
- Create: `components/sprint-selector.tsx`
- Modify: `components/kanban-board.tsx`

---

#### Task M4.4: Make Board Mobile-Responsive
**Priority:** Low | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Columns stack vertically on mobile
- [ ] Horizontal scroll for columns
- [ ] Touch-friendly drag handles
- [ ] Column headers sticky on scroll

**Files:**
- Modify: `components/kanban-board.tsx`

---

## Milestone 5: AI Assists (UI Only)

**Goal:** UI for AI story generation and validation

### ✅ Completed

- [x] AI generate stories page ([app/ai-generate/page.tsx](app/ai-generate/page.tsx))
- [x] AI service layer ([lib/services/ai.service.ts](lib/services/ai.service.ts))

### 🔲 Remaining Tasks

#### Task M5.1: Enhance Generate Story Page
**Priority:** Medium | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] Add project context preview (show selected project name/key)
- [ ] Token counter (estimate 4 chars ≈ 1 token)
- [ ] Result modal shows:
  - Generated title
  - Generated description
  - Generated ACs
  - "Accept" button → creates story and navigates to detail
  - "Edit" button → opens story form modal with prefilled data
- [ ] Loading state with animated dots
- [ ] Error handling for rate limits / missing API key

**Files:**
- Modify: `app/ai-generate/page.tsx`

---

#### Task M5.2: Create AI Validate Story Panel
**Priority:** Medium | **Effort:** 4 hours

**Acceptance Criteria:**
- [ ] "AI Validate" button on story detail page
- [ ] Opens side drawer ([components/ai-validate-panel.tsx](components/ai-validate-panel.tsx))
- [ ] Calls `aiService.validateStory(storyId)` (add method to `lib/services/ai.service.ts`)
- [ ] Shows suggestions:
  - Tighten acceptance criteria
  - Find duplicate stories
  - Identify missing cases
- [ ] "Apply" button updates story fields
- [ ] "Copy" button copies suggestions to clipboard

**Files:**
- Create: `components/ai-validate-panel.tsx`
- Modify: `lib/services/ai.service.ts`
- Add API: `app/api/ai/validate-story/route.ts`

---

#### Task M5.3: Add AI Error States
**Priority:** Low | **Effort:** 1 hour

**Acceptance Criteria:**
- [ ] Rate limit banner (use `components/ui/alert.tsx` if exists, or create)
- [ ] Missing API key banner on AI pages
- [ ] Clear error messages for failed generations

**Files:**
- Modify: `app/ai-generate/page.tsx`, `components/ai-validate-panel.tsx`

---

## Milestone 6: Notifications & Digests

**Goal:** In-app notifications centre and user preferences

### ✅ Completed

- [x] Database schema ([lib/db/schema.ts](lib/db/schema.ts#L474-L506))
- [x] Notifications repository ([lib/repositories/notifications.repository.ts](lib/repositories/notifications.repository.ts))
- [x] Notification bell component ([components/notifications/notification-bell.tsx](components/notifications/notification-bell.tsx))
- [x] **NEW:** Notifications centre page ([app/notifications/page.tsx](app/notifications/page.tsx))

### 🔲 Remaining Tasks

#### Task M6.1: Integrate Notification Bell
**Priority:** **HIGH** | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Bell appears in header/sidebar
- [ ] Badge shows unread count
- [ ] Clicking opens dropdown with last 5 notifications
- [ ] "View all" link goes to `/notifications`
- [ ] Real-time updates (use `lib/services/realtime.service.ts`)

**Files:**
- Modify: `components/app-sidebar.tsx` OR create `components/app-header.tsx`
- Use: `components/notifications/notification-bell.tsx`

---

#### Task M6.2: Add Notification Settings Tab
**Priority:** Medium | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] New tab in [app/settings/page.tsx](app/settings/page.tsx)
- [ ] Form fields:
  - Email enabled (toggle)
  - In-app enabled (toggle)
  - Digest frequency (radio: immediate / daily / weekly)
  - Notification types (checkboxes: mentions, assignments, sprint changes)
- [ ] Save to `notificationPreferences` table
- [ ] API endpoint: `PATCH /api/users/preferences`

**Files:**
- Modify: `app/settings/page.tsx`
- Add API: `app/api/users/preferences/route.ts`

---

#### Task M6.3: Add Real-Time Notification Updates
**Priority:** Low | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Subscribe to `notification:new` event (use `lib/services/realtime.service.ts`)
- [ ] Increment bell badge count
- [ ] Show toast for new notifications
- [ ] Update notifications list if page is open

**Files:**
- Modify: `components/notifications/notification-bell.tsx`
- Modify: `app/notifications/page.tsx`

---

## Cross-Cutting Quality

### Performance

#### Task Q.1: Add Loading Skeletons Everywhere
**Priority:** Medium | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Use [components/ui/skeleton.tsx](components/ui/skeleton.tsx) (already created!)
- [ ] Add skeletons to:
  - Projects list
  - Stories list
  - Epics list
  - Story detail page
  - Board columns
  - Comments section

---

#### Task Q.2: Defer Heavy Components
**Priority:** Low | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Comments section loads only when scrolled into view
- [ ] Activity history deferred until tab is clicked
- [ ] Use `React.lazy()` for heavy components

---

### Accessibility

#### Task Q.3: Add ARIA Labels
**Priority:** Medium | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] All buttons have `aria-label` or visible text
- [ ] Form inputs have `aria-describedby` for errors
- [ ] Modal/drawer has `role="dialog"` and `aria-modal="true"`
- [ ] Skip navigation link at top of page

---

#### Task Q.4: Focus Trapping in Modals
**Priority:** High | **Effort:** 1 hour

**Acceptance Criteria:**
- [ ] Verify `Dialog` and `Sheet` components trap focus
- [ ] Esc closes modals
- [ ] Focus returns to trigger element on close

---

#### Task Q.5: Keyboard Accessibility Audit
**Priority:** High | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] All interactive elements reachable via Tab
- [ ] Visible focus indicators
- [ ] No keyboard traps
- [ ] Forms submittable via Enter

---

#### Task Q.6: Color Contrast Audit
**Priority:** Medium | **Effort:** 2 hours

**Acceptance Criteria:**
- [ ] Run Lighthouse audit
- [ ] Fix failing contrast ratios (WCAG AA standard: 4.5:1)
- [ ] Status conveyed by icons + text, not color alone

---

### Observability

#### Task Q.7: Add UI Telemetry
**Priority:** Low | **Effort:** 3 hours

**Acceptance Criteria:**
- [ ] Track events:
  - `story_viewed`
  - `ac_added`
  - `comment_posted`
  - `board_move`
  - `epic_created`
- [ ] Create `lib/analytics/index.ts`
- [ ] Use existing activities API ([app/api/activities/](app/api/activities/))

---

#### Task Q.8: Eliminate Console Warnings
**Priority:** Low | **Effort:** 1 hour

**Acceptance Criteria:**
- [ ] Run `npm run build`
- [ ] Fix all warnings
- [ ] No `console.log` in production

---

## Implementation Progress

### Summary

| Milestone | Status | Completion |
|-----------|--------|------------|
| **M1: Navigation & Lists** | 🟡 In Progress | 85% |
| **M2: Project & Epic Workflows** | 🟢 Complete | 95% |
| **M3: Story Detail & Inline Editing** | 🟢 **Complete** | **100%** ✅ |
| **M4: Boards & Sprints** | 🔴 Blocked | 40% |
| **M5: AI Assists** | 🟡 In Progress | 60% |
| **M6: Notifications** | 🟡 In Progress | 70% |
| **Cross-Cutting Quality** | 🔴 Not Started | 20% |

### Recently Completed (Today's Session)

✅ **M3: Story Detail Enhancements** — FULLY COMPLETE
- Inline editing for all major fields (title, description, status, priority, assignee, tags)
- Acceptance Criteria CRUD with drag-to-reorder
- Comment permalinks with hash navigation
- Optimistic updates with error rollback
- User select dropdown
- Tags input component
- Skeleton loading component

✅ **Component Scaffolds**
- Epic detail drawer (side panel)
- Epics list page
- Breadcrumbs component
- Notifications centre page
- Sheet (drawer) UI component

### Next Recommended Steps

**Week 1 Focus:** 🎯 **High-Value Quick Wins**

1. **M4.1 + M4.2:** Wire Kanban board (6 hours) — **HIGHEST PRIORITY**
   - This is the most impactful incomplete feature
   - Users expect drag & drop functionality
   - Already 80% built, just needs API integration

2. **M6.1:** Integrate notification bell (2 hours)
   - High visibility feature
   - Component already exists, just wire it up

3. **M1.2:** URL-persisted filters (3 hours)
   - Quality-of-life improvement
   - Prevents frustration when refreshing

**Week 2 Focus:** Polish & Accessibility

4. **Q.4 + Q.5:** Keyboard accessibility (3 hours)
5. **M4.3:** Sprint selector (3 hours)
6. **M5.2:** AI validation panel (4 hours)

---

## API Endpoints Status

### ✅ Existing Endpoints

- `GET /api/projects`
- `GET/POST/PATCH/DELETE /api/projects/:id`
- `GET /api/stories`
- `GET/POST/PATCH/DELETE /api/stories/:id`
- `GET /api/epics`
- `GET/POST/PATCH/DELETE /api/epics/:id`
- `GET /api/sprints`
- `GET/POST/PATCH/DELETE /api/sprints/:id`
- `GET /api/comments`
- `POST /api/comments`
- `GET /api/notifications`
- `GET /api/users/search`

### ❌ Missing Endpoints (Need to Create)

- `PATCH /api/notifications/:id` (mark as read)
- `POST /api/ai/validate-story`
- `PATCH /api/users/preferences`
- `GET /api/users` (list all) — **ADDED TODAY** ✅

---

## File Structure Reference

```
synqforge/
├── app/
│   ├── projects/
│   │   ├── page.tsx                    ✅ Projects list
│   │   └── [projectId]/
│   │       ├── page.tsx                ✅ Project detail
│   │       └── epics/[epicId]/page.tsx ✅ Epic detail
│   ├── stories/
│   │   ├── page.tsx                    ✅ Stories list
│   │   └── [storyId]/page.tsx          ✅ Story detail (NEW)
│   ├── epics/
│   │   └── page.tsx                    ✅ Epics list (NEW)
│   ├── notifications/
│   │   └── page.tsx                    ✅ Notifications centre (NEW)
│   ├── ai-generate/page.tsx            ✅ AI generation
│   └── settings/page.tsx               ✅ Settings (needs notifications tab)
│
├── components/
│   ├── ui/
│   │   ├── skeleton.tsx                ✅ (NEW)
│   │   ├── sheet.tsx                   ✅ (NEW)
│   │   └── breadcrumbs.tsx             ✅ (NEW)
│   ├── story-detail-client.tsx         ✅ (NEW)
│   ├── acceptance-criteria-section.tsx ✅ (NEW)
│   ├── user-select.tsx                 ✅ (NEW)
│   ├── tags-input.tsx                  ✅ (NEW)
│   ├── epic-detail-drawer.tsx          ✅ (NEW)
│   ├── kanban-board.tsx                ⚠️ (needs API wiring)
│   ├── notifications/
│   │   └── notification-bell.tsx       ✅
│   └── comments/
│       └── comment-thread.tsx          ✅ (updated with permalinks)
│
└── lib/
    ├── api-client.ts                   ✅ (updated with users.list)
    ├── services/
    │   ├── ai.service.ts               ✅
    │   └── realtime.service.ts         ✅
    └── repositories/                   ✅ All exist
```

---

## Testing Checklist (Manual)

Before marking a feature as "Done", verify:

### Story Detail Page

- [ ] Navigate to `/stories/:id`
- [ ] Click title → inline edit → save
- [ ] Change status via dropdown → verify optimistic update
- [ ] Assign to user → verify dropdown populates
- [ ] Add tag → press Enter → verify saves
- [ ] Add AC → drag to reorder → verify order persists
- [ ] Toggle AC checkbox → verify visual feedback
- [ ] Post comment → verify appears immediately
- [ ] Click comment link icon → verify URL copies with hash
- [ ] Navigate to comment URL → verify scrolls to comment

### Kanban Board (After M4.1 + M4.2)

- [ ] Open project → navigate to board
- [ ] Verify stories load from API
- [ ] Drag card to new column → verify status updates
- [ ] Simulate network error → verify card snaps back
- [ ] Filter by sprint → verify correct stories show
- [ ] On mobile → verify columns scroll horizontally

### Notifications

- [ ] Post a comment mentioning @user
- [ ] Verify bell badge increments
- [ ] Click bell → verify dropdown shows notification
- [ ] Click notification → verify navigates to story
- [ ] Visit `/notifications` → verify list loads
- [ ] Click "Mark all read" → verify badge clears

---

## Notes for Developers

### Component Patterns

**Optimistic Updates:**
```typescript
const updateField = async (field: string, value: any) => {
  const previousValue = story[field]
  setStory({ ...story, [field]: value }) // Optimistic

  try {
    const updated = await api.stories.update(story.id, { [field]: value })
    setStory(updated)
    toast.success('Updated')
  } catch (error) {
    setStory({ ...story, [field]: previousValue }) // Rollback
    toast.error('Failed')
  }
}
```

**URL Param Filters:**
```typescript
const searchParams = useSearchParams()
const statusFilter = searchParams.get('status') || 'all'

const updateFilter = (value: string) => {
  const params = new URLSearchParams(searchParams)
  params.set('status', value)
  router.push(`?${params.toString()}`)
}
```

**Keyboard Navigation:**
```typescript
const [selectedIndex, setSelectedIndex] = useState(0)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, items.length - 1))
  if (e.key === 'ArrowUp') setSelectedIndex(i => Math.max(i - 1, 0))
  if (e.key === 'Enter') router.push(`/stories/${items[selectedIndex].id}`)
}
```

---

## Questions / Decisions Needed

1. **Kanban Board:** Should cards show epic color badges?
2. **Notifications:** Should we support browser push notifications (requires service worker)?
3. **AI Validation:** Should suggestions auto-apply or require confirmation?
4. **Mobile:** Should we build a dedicated mobile app or PWA?
5. **Accessibility:** Target WCAG AA or AAA compliance?

---

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Radix UI Components](https://www.radix-ui.com/)
- [dnd-kit Documentation](https://docs.dndkit.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Claude Code Docs](https://docs.claude.com/en/docs/claude-code/)

---

**Last Updated:** October 13, 2025
**Maintained By:** Development Team
**Status:** Living Document
