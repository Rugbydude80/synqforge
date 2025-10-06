# AI Story Generation - User Journey

## Overview
Users can generate AI-powered user stories through two entry points:
1. **Document Upload** - Upload requirements documents (PDF, DOCX, TXT, MD)
2. **Text Description** - Provide a brief text description of requirements

---

## User Journey Flow

### Entry Points
Users can access AI generation from multiple locations:
- **Dashboard** - "AI Generate" quick action button
- **Projects List** - "AI Generate" button in header
- **Project Detail** - "AI Generate" button in Kanban header

---

## Path 1: Document Upload Journey

### Step 1: Upload Document
**Screen:** AI Generate Page - Upload Mode
- Large drag-and-drop zone
- File type indicators (PDF, DOCX, TXT, MD)
- "Browse Files" button as alternative
- Accepted file types clearly shown

**User Actions:**
- Drag and drop file OR click to browse
- File preview shows: filename, size, file icon

**Next:** Proceed to Step 3 (Analysis)

---

## Path 2: Text Description Journey

### Step 2: Enter Description
**Screen:** AI Generate Page - Text Mode
- Large textarea for requirements description
- Character count (minimum 50 characters recommended)
- Helpful prompt examples shown
- Project selector (optional - pre-filled if coming from project page)

**Example Prompts Shown:**
```
"Create a user authentication system with email/password login,
OAuth (Google/GitHub), password reset, and 2FA support."

"Build an e-commerce checkout flow with cart management,
payment integration (Stripe), order confirmation, and email receipts."

"Design a real-time chat feature with direct messages,
group channels, file sharing, and read receipts."
```

**User Actions:**
- Type or paste requirements description
- Optionally select target project
- Click "Analyze Requirements" button

**Validation:**
- Minimum 20 characters
- Shows warning if description is too vague

**Next:** Proceed to Step 3 (Analysis)

---

## Step 3: AI Analysis (Both Paths Merge Here)

### Analysis Phase
**Screen:** AI Generate Page - Analyzing
- Loading animation with progress indicator
- Shows: "AI is reading your requirements..."
- Estimated time: 10-30 seconds

**Backend Process:**
- Send to OpenRouter API
- Extract key requirements
- Identify user roles and actions
- Estimate complexity

### Analysis Results
**Screen:** AI Generate Page - Analysis Complete
- **Summary Card** showing:
  - Brief overview of identified requirements
  - Key features detected (bulleted list)
  - Suggested number of epics
  - Estimated number of stories
  - Complexity assessment (Simple/Medium/Complex)

**User Actions:**
- Review analysis results
- Option to "Edit Requirements" (go back)
- Option to "Refine Analysis" (re-analyze with feedback)
- Click "Generate Stories" to proceed

---

## Step 4: Story Generation

### Generation Phase
**Screen:** AI Generate Page - Generating Stories
- Loading animation with progress
- Shows: "Crafting user stories from requirements..."
- Estimated time: 20-60 seconds

**Backend Process:**
- Generate user stories with AI
- Create acceptance criteria
- Assign story points
- Set priority levels
- Associate with epics (if applicable)

### Generated Stories Display
**Screen:** AI Generate Page - Results
- Grid/list of generated stories
- Each story shows:
  - Title
  - Description (As a [role], I want [action], so that [benefit])
  - Acceptance criteria (checkboxes)
  - Story points estimate
  - Priority badge (Low/Medium/High/Critical)
  - Epic assignment (if applicable)
  - AI confidence score (subtle indicator)

**Story Card Features:**
- Expand/collapse for details
- Edit inline (title, description, criteria)
- Remove story from batch
- Adjust story points
- Change priority

---

## Step 5: Review & Edit

**Screen:** AI Generate Page - Review Mode
- All generated stories visible
- Batch operations toolbar:
  - Select all / Deselect all
  - Bulk edit project assignment
  - Bulk edit epic assignment
  - Bulk delete selected

**User Actions Per Story:**
- ✏️ Edit - Modify any field
- 🗑️ Delete - Remove from batch
- ✅ Accept - Mark as ready to create

**Validation:**
- At least one story must be selected
- Each story must have: title, description, project
- Warning if no acceptance criteria

---

## Step 6: Project & Epic Assignment

**Screen:** AI Generate Page - Assignment
- **Project Selector:**
  - Dropdown of user's projects
  - Pre-selected if came from project page
  - Option to "Create New Project"

- **Epic Grouping (Optional):**
  - AI suggests epic groupings
  - User can accept/modify groupings
  - Checkboxes: "Create new epics" or "Assign to existing epic"
  - Epic selector for each group

**User Actions:**
- Select target project (required)
- Choose epic strategy:
  - Create new epics from AI suggestions
  - Assign to existing epics
  - Skip epic assignment (stories go to backlog)

---

## Step 7: Final Confirmation

**Screen:** AI Generate Page - Confirmation
- Summary card showing:
  - Total stories to create: X
  - Target project: [Project Name]
  - Epics: [List of new/existing epics]
  - Total estimated story points: XX

**User Actions:**
- Review summary
- Click "Create All Stories" (primary button)
- Or "Go Back to Edit"

---

## Step 8: Creation & Success

### Creating Stories
**Screen:** AI Generate Page - Creating
- Progress bar with count: "Creating story 3 of 12..."
- Shows each story as it's created
- Estimated time: 5-15 seconds

**Backend Process:**
- Create epics first (if new epics)
- Create stories in database
- Link stories to epics
- Link stories to project
- Log activity
- Track AI usage/tokens

### Success Screen
**Screen:** AI Generate Page - Success
- Success message with confetti animation
- Summary:
  - ✅ X stories created successfully
  - ✅ Y epics created
  - 📊 Total story points: XX

**Action Buttons:**
- "View in Project" → Navigate to project Kanban board
- "Generate More Stories" → Reset and start over
- "View All Projects" → Go to projects list

---

## Error Handling

### Upload Errors
- **File too large:** "File must be under 10MB"
- **Invalid format:** "Please upload PDF, DOCX, TXT, or MD files"
- **No content:** "File appears to be empty"

### AI Errors
- **Analysis failed:** "Couldn't analyze requirements. Please try again or simplify your description."
- **Generation failed:** "Story generation failed. Please try again."
- **Partial failure:** "Created X of Y stories. The following failed: [list]"

### Validation Errors
- **No project selected:** "Please select a target project"
- **No stories selected:** "Please select at least one story to create"
- **Description too short:** "Please provide more detail (minimum 20 characters)"

---

## Mode Switching

**Screen:** AI Generate Page - Mode Toggle
- Tab/button toggle at top:
  - 📄 Upload Document
  - ✍️ Describe Requirements

- Switching modes:
  - Shows confirmation if work in progress
  - Clears previous input
  - Maintains selected project (if any)

---

## State Persistence

**During Session:**
- Generated stories persist in browser state
- Can navigate away and return (warning shown)
- Project selection persists across modes

**After Creation:**
- AI generation tracked in user's activity log
- Shows "Recently generated" badge on stories (7 days)
- AI metrics tracked (stories generated, tokens used)

---

## Success Criteria

### A successful AI generation flow includes:
1. ✅ Clear entry point (document OR description)
2. ✅ Helpful guidance and examples
3. ✅ Transparent AI processing with progress
4. ✅ Editable results before commitment
5. ✅ Flexible project/epic assignment
6. ✅ Clear confirmation before creation
7. ✅ Success feedback with next actions
8. ✅ Graceful error handling

### Key Metrics:
- Time from start to created stories: < 3 minutes
- User satisfaction with generated stories: > 80%
- Stories accepted without edits: > 60%
- Return rate for second generation: > 40%
