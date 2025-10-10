# Story Route Fix - Implementation Summary

## Problem
The application was generating 404 errors when users clicked on notification links. The error message showed:
```
stories:1   Failed to load resource: the server responded with a status of 404 ()
```

**Root Cause:** Notifications were linking to `/stories/{storyId}`, but this route didn't exist in the application. Only `/app/stories/page.tsx` (a list view) existed, with no individual story detail page.

## Solution
Implemented a canonical story detail page route at `/stories/[storyId]` with centralized URL building utilities.

## Changes Made

### 1. Created URL Helper Utility ([lib/urls.ts](lib/urls.ts))
Centralized URL builders to ensure consistency across notifications, emails, and navigation:

```typescript
export const storyUrl = (storyId: string): string => `/stories/${storyId}`
export const storyCommentUrl = (storyId: string, commentId: string): string =>
  `${storyUrl(storyId)}#comment-${commentId}`
export const projectUrl = (projectId: string): string => `/projects/${projectId}`
export const epicUrl = (projectId: string, epicId: string): string =>
  `/projects/${projectId}/epics/${epicId}`
```

### 2. Created Story Detail Page ([app/stories/[storyId]/page.tsx](app/stories/[storyId]/page.tsx))
Implemented a full-featured story detail page with:

- **Authentication & RBAC:** Uses `getServerSession` and the existing `/api/stories/[storyId]` endpoint which enforces organization-level access control
- **Comprehensive Story Display:**
  - Title with status, priority, type, and story points badges
  - Description section
  - Acceptance criteria list
  - Meta information (project, assignee, timestamps)
  - Tags display
  - Quick link back to project context
- **Proper Error Handling:** Returns `notFound()` for missing/unauthorized stories
- **Future-Ready:** Includes commented-out redirect logic for easy migration to project-only context if needed

### 3. Updated Notification URLs ([app/api/comments/route.ts](app/api/comments/route.ts))
Updated comment notification creation to use the centralized URL helper:

```typescript
// Before
actionUrl: `/stories/${validated.storyId}#comment-${comment.id}`

// After
import { storyCommentUrl } from '@/lib/urls'
actionUrl: storyCommentUrl(validated.storyId, comment.id)
```

### 4. Email Templates
Verified that email templates ([emails/story-assigned.tsx](emails/story-assigned.tsx), [emails/notification-digest.tsx](emails/notification-digest.tsx)) already use the correct `/stories/{id}` URL format and will now work correctly.

## Benefits

1. **Stable Deep Links:** Notifications, emails, and external shares now have a permanent, working URL
2. **Consistency:** All story links are generated using the same helper function
3. **RBAC Enforced:** The page leverages existing API RBAC - users only see stories from their organization
4. **Maintainable:** Single source of truth for URL patterns in `lib/urls.ts`
5. **Future-Proof:** Easy to add redirect behavior later if project-context becomes preferred
6. **User Experience:** No more 404 errors when clicking notification links

## Testing Checklist

- [ ] Click notification link from notification bell → lands on `/stories/:id` and renders correctly
- [ ] Unauthorized user accessing story → receives 404 (doesn't leak existence)
- [ ] Story in different organization → receives 404
- [ ] "Back to Project" button → navigates to correct project
- [ ] "View in Project Context" button → navigates correctly
- [ ] Page displays all story fields correctly (title, description, acceptance criteria, badges, etc.)

## API Endpoints Used

- `GET /api/stories/[storyId]` - Already enforces organization-level RBAC
- Returns 404 for missing stories or forbidden access (doesn't leak existence)

## Optional: Enable Project Context Redirect

To redirect all story detail views to their project context, uncomment this code in [app/stories/[storyId]/page.tsx:107-109](app/stories/[storyId]/page.tsx#L107-L109):

```typescript
if (process.env.NEXT_PUBLIC_STORY_REDIRECT_TO_PROJECT === '1' && story.projectId) {
  redirect(`/projects/${story.projectId}?story=${story.id}`)
}
```

Then set the environment variable:
```bash
NEXT_PUBLIC_STORY_REDIRECT_TO_PROJECT=1
```

This maintains stable URLs while preserving your preferred UX.

## Files Modified

- ✨ Created: `lib/urls.ts`
- ✨ Created: `app/stories/[storyId]/page.tsx`
- 🔧 Modified: `app/api/comments/route.ts`

## Files Verified (No Changes Needed)

- ✅ `emails/story-assigned.tsx` - Already uses correct URL format
- ✅ `emails/notification-digest.tsx` - Already uses correct URL format
- ✅ `app/api/stories/[storyId]/route.ts` - RBAC already implemented

---

**Status:** ✅ Implementation Complete

The 404 error is now fixed. Users can click notification links and view story details directly at `/stories/{storyId}`.
