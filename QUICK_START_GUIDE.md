# Quick Start Guide - CRUD Operations

## Fixed Issue
The 404 error on `/stories/M9cCXqc2QCcir5IhoKRWP` was due to a non-existent story ID. The application now has full CRUD functionality, so you can create your own stories instead of trying to access ones that don't exist.

## Getting Started

### 1. Create Your First Project

**Via Projects Page:**
1. Navigate to **Projects** page
2. Click **"New Project"** button (top right)
3. Fill in:
   - Project Name (required)
   - Project Key (auto-generated, editable, 2-10 uppercase chars)
   - Description (optional)
4. Click **"Create Project"**

**Result:** You'll be redirected to the project detail page.

### 2. Edit or Delete a Project

**On Projects Page:**
1. Find your project card
2. **Hover over the card** → Settings icon appears (top right)
3. Click the **Settings icon**
4. In the modal:
   - Edit name, description, or status
   - Or click **"Delete Project"** button (left side)

### 3. Create an Epic

**Via Project Detail Page:**
1. Navigate to your project
2. Click the **"Epics" tab**
3. Click **"New Epic"** button
4. Fill in:
   - Title (required)
   - Description
   - Goals
   - Priority (low/medium/high/critical)
   - Color (for visual identification)
   - Start Date & Target Date (optional)
5. Click **"Create Epic"**

**Epic Status:**
- New epics start as **"draft"**
- Draft epics are visible but stories aren't active yet
- Publish when ready to activate

### 4. Edit, Delete, or Publish an Epic

**On Project Detail Page → Epics Tab:**
1. Find your epic card
2. **Hover over the card** → Action buttons appear (right side)
3. Options:
   - **Rocket icon** (green) - Publish epic (only for draft epics)
   - **Edit icon** - Edit epic details
   - **Delete icon** (red) - Delete epic (confirms first)

**What Publishing Does:**
- Changes epic status from "draft" to "published"
- Makes all linked stories active and visible
- Sends notifications to team members assigned to linked stories
- Broadcasts real-time updates to all connected users

### 5. Create a Story

**Option A - From Project Detail Page:**
1. Navigate to your project
2. Stay on **"Stories" tab**
3. Click **"New Story"** button
4. Fill in the form (or use AI generation)
5. Link to an epic (optional)
6. Click **"Create Story"**

**Option B - From Global Stories Page:**
1. Navigate to **Stories** page (shows all stories across projects)
2. Click **"New Story"** button
3. If you have a project filter selected, it auto-selects that project
4. Otherwise, uses the first available project
5. Fill and submit

**AI Story Generation:**
- Click **"Generate with AI"** button in the form
- Describe what you want (min 10 characters)
- AI will generate title, description, points, and acceptance criteria
- Review and adjust before creating

### 6. Edit or Delete a Story

**On Global Stories Page:**
1. Find your story card
2. **Hover over the card** → Edit and Delete icons appear (top right)
3. Click:
   - **Edit icon** → Opens edit form
   - **Delete icon** → Confirms, then deletes

**On Project Detail Page:**
1. Stories use drag-and-drop for status changes
2. Drag story cards between columns (Backlog → In Progress → Review → Done)
3. For edit/delete, go to the global Stories page

### 7. Filter and Search Stories

**On Global Stories Page:**

**Filters Available:**
- **Search bar** - Search by title or description
- **Status filter** - Backlog, Ready, In Progress, Review, Done, Blocked
- **Project filter** - Show stories from specific project
- **Epic filter** - Show stories from specific epic or "No Epic"
- **Priority filter** - Low, Medium, High, Critical

**Pro Tip:** Combine filters for precise results (e.g., "High priority stories in Epic X that are In Progress")

## Common Workflows

### Workflow 1: Start a New Project from Scratch
1. Create Project
2. Create Epics (draft mode)
3. Create Stories and link to epics
4. Review and organize
5. Publish Epics when ready to start work
6. Move stories through workflow (drag & drop)

### Workflow 2: Quick Story Creation
1. Go to Stories page
2. Filter by your project
3. Click "New Story"
4. Create directly without leaving the page

### Workflow 3: Manage Existing Epics
1. Go to Project → Epics tab
2. Edit draft epics as needed
3. Publish when all stories are ready
4. Team gets notified automatically

## UI Tips

### Hover Actions
Most edit/delete buttons appear on hover to keep the interface clean. If you don't see action buttons, try hovering over the card.

### Status Badges
- **Draft** (gray) - Epic not yet published
- **Published** (green) - Epic is active
- **In Progress** (purple) - Work ongoing
- **Done/Completed** (emerald) - Finished

### Color Coding
- **Priority**: Red (Critical) → Orange (High) → Yellow (Medium) → Green (Low)
- **Stories**: Can see priority and status at a glance
- **Epics**: Custom color dots for visual grouping

## Keyboard Shortcuts

- **Click card** → View details (stories only)
- **Hover** → Show actions
- **Escape** → Close modal
- **Enter** in modal → Submit form

## Troubleshooting

### "No projects found"
- Click "New Project" to create your first project
- Or adjust filters if you have projects

### "No epics yet"
- Go to project → Epics tab
- Click "Create Epic"

### "No stories match filters"
- Clear filters (set all to "All")
- Or create stories that match your criteria

### Story form says "No project selected"
- Create a project first via Projects page
- Or select a project from the dropdown

### Can't publish epic
- Check if epic status is "draft"
- Publish button only appears for draft epics
- Already published epics show "published" status

## Next Steps

Now that you have full CRUD functionality:

1. **Create your first project** to organize work
2. **Add epics** to group related stories
3. **Create stories** for specific tasks
4. **Publish epics** when ready to begin
5. **Use the global Stories page** to manage across projects
6. **Drag stories** through workflow stages on project board

## Development Server

The development server is currently running at:
- Local: http://localhost:3000
- Network: http://192.168.0.176:3000

Navigate to any of these URLs to start using the application!
