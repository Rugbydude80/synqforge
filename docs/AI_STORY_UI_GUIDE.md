# AI Story Generation - UI Guide

## Visual Walkthrough

### 1. Story Creation Modal - Initial State

```
┌─────────────────────────────────────────────────────┐
│  Create New Story                              [X]  │
│  Add a new story to your project                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│                    [✨ Generate with AI] ←── NEW!   │
│                                                      │
│  Title *                                             │
│  ┌────────────────────────────────────────────────┐ │
│  │ As a user, I want to...                        │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Description                                         │
│  ┌────────────────────────────────────────────────┐ │
│  │ Describe the story in detail...                │ │
│  │                                                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ... (rest of form)                                  │
└─────────────────────────────────────────────────────┘
```

### 2. AI Input Section - Expanded

```
┌─────────────────────────────────────────────────────┐
│  Create New Story                              [X]  │
│  Add a new story to your project                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ╔═══════════════════════════════════════════════╗  │
│  ║ ✨ AI Story Generation                    [X] ║  │
│  ║                                                ║  │
│  ║ ┌────────────────────────────────────────────┐ ║  │
│  ║ │ Describe what you want this story to      │ ║  │
│  ║ │ accomplish... (e.g., 'Allow users to      │ ║  │
│  ║ │ reset their password via email')          │ ║  │
│  ║ └────────────────────────────────────────────┘ ║  │
│  ║                                                ║  │
│  ║  0/500 characters      [✨ Generate Story]    ║  │
│  ╚═══════════════════════════════════════════════╝  │
│                                                      │
│  Title *                                             │
│  ┌────────────────────────────────────────────────┐ │
│  │                                                 │ │
│  └────────────────────────────────────────────────┘ │
│  ... (rest of form)                                  │
└─────────────────────────────────────────────────────┘
```

### 3. AI Input Section - User Typing

```
╔═══════════════════════════════════════════════╗
║ ✨ AI Story Generation                    [X] ║
║                                                ║
║ ┌────────────────────────────────────────────┐ ║
║ │ Allow users to reset their password via    │ ║
║ │ email with a secure link                   │ ║
║ │                                             │ ║
║ └────────────────────────────────────────────┘ ║
║                                                ║
║  56/500 characters     [✨ Generate Story]    ║  ← Button enabled
╚═══════════════════════════════════════════════╝
```

### 4. AI Generation - Loading State

```
╔═══════════════════════════════════════════════╗
║ ✨ AI Story Generation                    [X] ║
║                                                ║
║ ┌────────────────────────────────────────────┐ ║
║ │ Allow users to reset their password via    │ ║
║ │ email with a secure link                   │ ║
║ │                                             │ ║
║ └────────────────────────────────────────────┘ ║
║                                                ║
║  56/500 characters     [⏳ Generating...]     ║  ← Loading
╚═══════════════════════════════════════════════╝
```

### 5. Form Auto-Populated - Success!

```
┌─────────────────────────────────────────────────────┐
│  Create New Story                              [X]  │
│  Add a new story to your project                    │
├─────────────────────────────────────────────────────┤
│                    [✨ Generate with AI]            │
│                                                      │
│  Title *                                             │
│  ┌────────────────────────────────────────────────┐ │
│  │ As a user, I want to reset my password via   │ │ ← AI Generated!
│  │ email so that I can regain access to my...   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Description                                         │
│  ┌────────────────────────────────────────────────┐ │
│  │ This feature enables users to securely reset │ │ ← AI Generated!
│  │ their password through an email verification │ │
│  │ process. When a user requests a password...  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Priority          Story Points                      │
│  [High ▼]         [5    ]                          │ ← AI Suggested!
│                                                      │
│  Epic (optional)                                     │
│  [No Epic ▼]                                        │
│                                                      │
│  Acceptance Criteria            [Add Criteria]       │
│  ┌────────────────────────────────────────────────┐ │
│  │ User can request password reset from login   │ │ ← AI Generated!
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ Email contains secure reset link with token  │ │ ← AI Generated!
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ Link expires after 24 hours                  │ │ ← AI Generated!
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ User can set new password meeting security... │ │ ← AI Generated!
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Cancel]                    [Create Story]          │
└─────────────────────────────────────────────────────┘

✅ Story generated successfully! Review and adjust as needed.
```

## UI Elements

### Button States

**Generate with AI Button (Collapsed)**
- Default: `✨ Generate with AI` - Purple outline, small size
- Hover: Slight purple glow
- Click: Expands AI input section

**AI Input Close Button**
- Icon: `X` (close icon)
- Position: Top-right of AI section
- Click: Closes AI input, clears requirement text

**Generate Story Button (In AI Section)**
- Disabled (< 10 chars): `✨ Generate Story` - Grayed out
- Enabled (≥ 10 chars): `✨ Generate Story` - Purple, clickable
- Loading: `Generating...` - Disabled during API call

### Color Scheme

```css
AI Section Border:    border-purple-500/30
AI Section Background: bg-purple-500/5
AI Label Text:        text-purple-400
AI Icon:              Sparkles (✨)
Character Counter:    text-gray-400 (text-xs)
```

### Spacing & Layout

```css
AI Section Padding:   p-4
Gap between elements: gap-3
Border Radius:        rounded-lg
Button Spacing:       gap-2 (icon + text)
```

## Responsive Design

### Desktop (> 600px)
- Modal: 600px max width
- Full AI section visible
- Buttons side-by-side

### Mobile (< 600px)
- Modal: Full width with padding
- AI section collapses by default
- Buttons stack vertically

## Accessibility

- ✅ Keyboard navigable (Tab, Enter, Esc)
- ✅ Screen reader friendly labels
- ✅ Loading states announced
- ✅ Error messages clearly displayed
- ✅ Focus management (auto-focus on expand)
- ✅ Character counter for length feedback

## Toast Notifications

### Success
```
✅ Story generated successfully! Review and adjust as needed.
```

### Error
```
❌ Failed to generate story. Please try again.
❌ Requirement must be at least 10 characters
❌ Please enter a requirement to generate a story
```

## Animation Details

### AI Section Expand/Collapse
- Duration: 200ms
- Easing: ease-in-out
- Properties: height, opacity

### Button Loading
- Spinner animation on "Generating..."
- Disabled state with reduced opacity

### Form Population
- Instant (no animation)
- Success toast appears after population

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close modal or collapse AI section |
| `Enter` | Submit form (if all fields valid) |
| `Tab` | Navigate between fields |
| `Shift + Tab` | Navigate backwards |

## Example User Flows

### Happy Path
1. Click "New Story"
2. Click "Generate with AI"
3. Type requirement: "Add dark mode toggle"
4. Click "Generate Story"
5. Wait 10 seconds
6. Review generated content
7. Click "Create Story"

### Edit After Generation
1. Follow steps 1-6 above
2. Modify title slightly
3. Add another acceptance criterion
4. Change priority from Medium to High
5. Click "Create Story"

### Cancel and Start Over
1. Follow steps 1-4 above
2. Click X to close AI section
3. Manually fill in form fields
4. Click "Create Story"

## Best Practices for Users

### Good Requirements
- Be specific about the user action
- Mention the expected outcome
- Include context if needed

Examples:
- ✅ "Allow users to filter stories by priority"
- ✅ "Add email notifications for sprint deadlines"
- ✅ "Enable bulk import of stories from CSV"

### Poor Requirements
- Too vague
- Single words
- Unclear intent

Examples:
- ❌ "Filter"
- ❌ "Notifications"
- ❌ "Make better"

## Developer Notes

### Component Structure
```typescript
StoryFormModal
├── Dialog (shadcn/ui)
│   ├── DialogHeader
│   ├── DialogContent
│   │   ├── [AI Generation Section] ← NEW
│   │   │   ├── Toggle Button
│   │   │   └── Expandable Input + Generate Button
│   │   ├── Title Input
│   │   ├── Description Textarea
│   │   ├── Priority Select
│   │   ├── Story Points Input
│   │   ├── Epic Select
│   │   └── Acceptance Criteria List
│   └── DialogFooter
│       ├── Cancel Button
│       └── Submit Button
```

### State Management
```typescript
- isLoading: boolean          // Form submission
- isGenerating: boolean       // AI generation
- showAIInput: boolean        // AI section visibility
- aiRequirement: string       // User's requirement input
- formData: StoryFormData     // All form fields
- error: string | null        // Error messages
```
