# Manual Testing Checklist - Production Validation

**Test Date:** ________________
**Tester:** ________________
**Environment:** ________________
**Build/Commit:** ________________

---

## Setup Requirements

### Test Users
- [ ] User A: Organization Owner (has projects/epics/stories)
- [ ] User B: Organization Member (different organization)
- [ ] User C: Organization Admin
- [ ] User D: Organization Member (read-only)

### Test Data
- [ ] Project 1: "Test Project Alpha" (User A)
- [ ] Project 2: "Test Project Beta" (User B)
- [ ] Epic 1: Draft status (User A, Project 1)
- [ ] Epic 2: Published status (User A, Project 1)
- [ ] Epic 3: Draft status (User B, Project 2)
- [ ] 10+ Stories across various states

---

## 1. Permissions & Data Security (MUST-PASS)

### RLS - Cross-Tenant Isolation
- [ ] **Test 1.1:** User A navigates to Stories page → only sees their org's stories
  - **Expected:** No stories from User B's org visible
  - **Result:** _______________

- [ ] **Test 1.2:** User A attempts API call to User B's project
  ```bash
  curl -i -H "Cookie: [UserA-cookies]" \
    "$BASE_URL/api/projects/[UserB-project-id]"
  ```
  - **Expected:** 403 Forbidden
  - **Result:** _______________

- [ ] **Test 1.3:** User A attempts to edit User B's story via API
  - **Expected:** 403 Forbidden with clear error message
  - **Result:** _______________

### Publish Epic Permissions
- [ ] **Test 1.4:** User D (member) attempts to publish Epic 1
  - **Expected:** Publish button disabled OR 403 error with toast
  - **Result:** _______________

- [ ] **Test 1.5:** User A (owner) publishes Epic 1
  - **Expected:** Success, audit trail recorded with User A's ID
  - **Result:** _______________

- [ ] **Test 1.6:** User C (admin) publishes draft epic
  - **Expected:** Success, audit trail recorded with User C's ID
  - **Result:** _______________

### Rate Limits
- [ ] **Test 1.7:** Send 100 requests to `/api/stories` in 10 seconds
  - **Expected:** 429 Too Many Requests after threshold
  - **Result:** _______________

- [ ] **Test 1.8:** Trigger rate limit on AI endpoint
  - **Expected:** 429 with user-friendly toast message
  - **Result:** _______________

- [ ] **Test 1.9:** Wait for rate limit reset and retry
  - **Expected:** Request succeeds after cooldown
  - **Result:** _______________

---

## 2. Publish Epic - End-to-End (MUST-PASS)

### Draft → Published Transition
- [ ] **Test 2.1:** Publish Epic 1 (draft)
  - **Expected:**
    - Status changes to "Published"
    - `publishedAt` timestamp set
    - `publishedBy` set to current user ID
  - **Result:** _______________

- [ ] **Test 2.2:** Verify linked stories become active
  - **Expected:** Stories appear in board view and queries
  - **Result:** _______________

- [ ] **Test 2.3:** Check audit trail
  - **Expected:** Single audit entry with action "EPIC_PUBLISHED"
  - **Result:** _______________

### Notifications & Realtime
- [ ] **Test 2.4:** Publish epic while User B (same org) has board open
  - **Expected:**
    - User B sees notification
    - Board updates within 2 seconds
  - **Result:** _______________

- [ ] **Test 2.5:** Double-click publish button rapidly
  - **Expected:**
    - Only one notification generated
    - Idempotent behavior (no duplicate events)
  - **Result:** _______________

### Revert/Unpublish
- [ ] **Test 2.6:** Attempt to unpublish Epic 2
  - **Expected:**
    - If supported: status reverts, audit trail logged
    - If not supported: button disabled with tooltip
  - **Result:** _______________

---

## 3. CRUD Integrity & Edge Cases (MUST-PASS)

### Create Operations
- [ ] **Test 3.1:** Create project from dashboard "New Project" button
  - **Input:** Valid data
  - **Expected:** Project appears immediately (optimistic) and persists
  - **Result:** _______________

- [ ] **Test 3.2:** Create epic from project detail page
  - **Input:** Valid data
  - **Expected:** Epic appears in project's epic list
  - **Result:** _______________

- [ ] **Test 3.3:** Create story from epic card hover action
  - **Input:** Valid data
  - **Expected:** Story linked to correct epic and project
  - **Result:** _______________

- [ ] **Test 3.4:** Create story with empty title
  - **Input:** Title = ""
  - **Expected:** Validation error, inline message shown
  - **Result:** _______________

### Validation Edge Cases
- [ ] **Test 3.5:** Create epic with extreme title length
  - **Input:** Title = 10,000 characters
  - **Expected:** Truncated to max OR validation error
  - **Result:** _______________

- [ ] **Test 3.6:** Create story with emoji/unicode
  - **Input:** Title = "🚀 Story Title 中文 العربية"
  - **Expected:** Saved correctly, displays without corruption
  - **Result:** _______________

- [ ] **Test 3.7:** Create story with XSS payload
  - **Input:** Description = `<script>alert('xss')</script><img src=x onerror=alert(1)>`
  - **Expected:** HTML escaped, renders as text (no alert)
  - **Result:** _______________

### Edit Operations
- [ ] **Test 3.8:** Edit story title in modal
  - **Expected:** Changes saved, optimistically updated, realtime sync
  - **Result:** _______________

- [ ] **Test 3.9:** Edit epic description with markdown
  - **Input:** Description with `**bold**` and `[link](url)`
  - **Expected:** Markdown rendered correctly in view mode
  - **Result:** _______________

### Concurrency
- [ ] **Test 3.10:** Two users edit same epic simultaneously
  - **Setup:**
    - User A opens Epic 1 edit modal at 10:00:00
    - User B opens Epic 1 edit modal at 10:00:05
    - User A saves at 10:00:10
    - User B saves at 10:00:15
  - **Expected:**
    - Last write (User B) wins
    - User B sees conflict toast (optional)
    - No data loss
  - **Result:** _______________

### Delete Operations
- [ ] **Test 3.11:** Delete project with no epics/stories
  - **Expected:** Deleted successfully, removed from list
  - **Result:** _______________

- [ ] **Test 3.12:** Attempt to delete project with epics
  - **Expected:**
    - EITHER: Blocked with error "Cannot delete project with epics"
    - OR: Cascade delete (epics + stories deleted), clear confirmation
  - **Result:** _______________

- [ ] **Test 3.13:** Delete epic with linked stories
  - **Expected:**
    - EITHER: Stories orphaned to "No Epic"
    - OR: Delete blocked with error
  - **Actual behavior:** _______________

- [ ] **Test 3.14:** Delete story from board view
  - **Expected:** Confirmation dialog, story removed after confirm
  - **Result:** _______________

- [ ] **Test 3.15:** Verify no dangling foreign keys after delete
  - **Check:** Query DB for orphaned records
  - **Expected:** All foreign key constraints intact
  - **Result:** _______________

### Delete Confirmation Copy
- [ ] **Test 3.16:** Review delete confirmation dialogs
  - **Project:** "Delete [project name]? This action cannot be undone. [X] epics and [Y] stories will be affected."
  - **Epic:** "Delete [epic name]? This action cannot be undone. [X] linked stories will be affected."
  - **Story:** "Delete [story title]? This action cannot be undone."
  - **Expected:** Clear, unambiguous language
  - **Result:** _______________

---

## 4. Stories Page Filters/Search (MUST-PASS)

### Individual Filters
- [ ] **Test 4.1:** Filter by Project only
  - **Action:** Select "Test Project Alpha"
  - **Expected:** Only stories from that project shown
  - **Count matches board view:** Yes / No
  - **Result:** _______________

- [ ] **Test 4.2:** Filter by Epic only
  - **Action:** Select "Epic 1"
  - **Expected:** Only stories linked to Epic 1 shown
  - **Result:** _______________

- [ ] **Test 4.3:** Filter by Status only
  - **Action:** Select "In Progress"
  - **Expected:** Only in-progress stories shown
  - **Result:** _______________

- [ ] **Test 4.4:** Filter by Priority only
  - **Action:** Select "High"
  - **Expected:** Only high-priority stories shown
  - **Result:** _______________

### Combined Filters
- [ ] **Test 4.5:** Combine Project + Epic + Status + Priority
  - **Expected:** Correct intersection of all filters
  - **Result:** _______________

- [ ] **Test 4.6:** Search text + filters
  - **Search:** "authentication"
  - **Filters:** Project=Alpha, Status=Backlog
  - **Expected:** Stories matching text AND filters
  - **Result:** _______________

### Persistence & Deep Links
- [ ] **Test 4.7:** Apply filters → browser back → browser forward
  - **Expected:** Filters preserved through navigation
  - **Result:** _______________

- [ ] **Test 4.8:** Apply filters → refresh page
  - **Expected:** Filters restored from URL params
  - **Result:** _______________

- [ ] **Test 4.9:** Copy URL with filters → paste in new tab
  - **Example URL:** `/stories?projectId=123&epicId=456&status=backlog&priority=high&search=auth`
  - **Expected:** Exact filter state reproduced
  - **Result:** _______________

### Pagination & Infinite Scroll
- [ ] **Test 4.10:** Scroll to load more stories (if >20 results)
  - **Expected:** Next page loads, no duplicates
  - **Result:** _______________

- [ ] **Test 4.11:** Apply filters while paginated view is loaded
  - **Expected:** Pagination resets, new results shown
  - **Result:** _______________

### Empty States
- [ ] **Test 4.12:** Apply filters that yield zero results
  - **Expected:**
    - Friendly message "No stories match your filters"
    - "Clear filters" button shown
  - **Result:** _______________

---

## 5. Realtime & Optimistic UI (MUST-PASS)

### Setup: Two Browser Sessions
- [ ] Browser A: Chrome (User A logged in)
- [ ] Browser B: Firefox (User A logged in, same org)

### Create Operations
- [ ] **Test 5.1:** Create story in Browser A
  - **Expected:** Story appears in Browser B within 2 seconds
  - **Latency measured:** ___ ms
  - **Result:** _______________

- [ ] **Test 5.2:** Create epic in Browser A
  - **Expected:** Epic appears in Browser B's project view within 2s
  - **Result:** _______________

### Edit Operations
- [ ] **Test 5.3:** Edit story title in Browser A
  - **Expected:** Title updates in Browser B within 2 seconds
  - **Result:** _______________

- [ ] **Test 5.4:** Change story status (drag-and-drop) in Browser A
  - **Expected:** Story moves to new column in Browser B
  - **Result:** _______________

### Delete Operations
- [ ] **Test 5.5:** Delete story in Browser A
  - **Expected:** Story removed from Browser B within 2 seconds
  - **Result:** _______________

### Publish Operations
- [ ] **Test 5.6:** Publish epic in Browser A
  - **Expected:**
    - Epic status updates in Browser B
    - Linked stories appear in Browser B's board
    - Notification appears in Browser B (if applicable)
  - **Result:** _______________

### Optimistic Updates & Rollback
- [ ] **Test 5.7:** Simulate server error (disconnect network mid-save)
  - **Action:** Edit story, save, immediately disable network
  - **Expected:**
    - UI updates optimistically
    - Error toast appears after timeout
    - UI reverts to previous state
  - **Result:** _______________

- [ ] **Test 5.8:** Trigger validation error on server
  - **Action:** Edit story with invalid data (bypass client validation)
  - **Expected:**
    - Optimistic update shown briefly
    - Server error toast with specific message
    - Original data restored
  - **Result:** _______________

### No Ghost Cards
- [ ] **Test 5.9:** Rapidly create and delete same item
  - **Expected:** No duplicate or orphaned cards remain
  - **Result:** _______________

- [ ] **Test 5.10:** Refresh both browsers after realtime operations
  - **Expected:** State identical in both, no missing/extra items
  - **Result:** _______________

---

## 6. Performance & Loading (MUST-PASS)

### DevTools Setup
- [ ] Chrome DevTools → Network tab (Disable cache)
- [ ] Chrome DevTools → Performance tab
- [ ] Throttling: Fast 3G (for realistic test)

### API Performance (P95 Measurements)
- [ ] **Test 6.1:** Measure GET `/api/stories?projectId=X&epicId=Y&status=backlog`
  - **Iterations:** 20 requests
  - **P95 latency:** ___ ms (Target: <500ms)
  - **Result:** Pass / Fail

- [ ] **Test 6.2:** Measure POST `/api/epics/[id]/publish`
  - **Iterations:** 5 requests
  - **P95 latency:** ___ ms (Target: <1000ms)
  - **Result:** Pass / Fail

### Page Load Performance
- [ ] **Test 6.3:** Stories page TTI (Time to Interactive) - Cold load
  - **Action:** Clear cache, open `/stories` with filters
  - **Iterations:** 3 loads
  - **P95 TTI:** ___ ms (Target: <1500ms)
  - **Result:** Pass / Fail

- [ ] **Test 6.4:** Stories page TTI - Warm load
  - **Action:** Navigate to `/stories` with cache
  - **Iterations:** 3 loads
  - **P95 TTI:** ___ ms (Target: <1000ms)
  - **Result:** Pass / Fail

### Loading States
- [ ] **Test 6.5:** Skeleton shown within 150ms
  - **Measurement:** Time from navigation to skeleton render
  - **Result:** ___ ms (Target: <150ms)

- [ ] **Test 6.6:** No layout shift (CLS)
  - **Measurement:** Cumulative Layout Shift score in Performance tab
  - **CLS score:** ___ (Target: <0.1)
  - **Result:** Pass / Fail

### Large Dataset Performance
- [ ] **Test 6.7:** Load Stories page with 100+ stories
  - **Virtualization active:** Yes / No
  - **Scroll performance:** Smooth / Janky
  - **Result:** _______________

---

## 7. Accessibility & UX Polish (SHOULD-PASS)

### Keyboard Navigation
- [ ] **Test 7.1:** Tab through Epic modal
  - **Expected:**
    - Focus trap works (Tab doesn't escape modal)
    - Logical tab order (title → description → actions)
    - Visible focus indicators
  - **Result:** _______________

- [ ] **Test 7.2:** Press Escape to close modal
  - **Expected:** Modal closes, focus returns to trigger button
  - **Result:** _______________

- [ ] **Test 7.3:** Use Enter/Space on buttons
  - **Expected:** Buttons activate (create, delete, publish)
  - **Result:** _______________

- [ ] **Test 7.4:** Navigate edit/delete/publish with keyboard only
  - **Expected:** All actions accessible without mouse
  - **Result:** _______________

### ARIA & Screen Reader
- [ ] **Test 7.5:** Run axe DevTools on Stories page
  - **Critical issues:** ___ (Target: 0)
  - **Serious issues:** ___
  - **Result:** Pass / Fail

- [ ] **Test 7.6:** Run axe DevTools on Epic modal
  - **Critical issues:** ___ (Target: 0)
  - **Result:** Pass / Fail

- [ ] **Test 7.7:** Check ARIA labels on icon buttons
  - **Edit button:** `aria-label="Edit epic"` ✓ / ✗
  - **Delete button:** `aria-label="Delete story"` ✓ / ✗
  - **Publish button:** `aria-label="Publish epic"` ✓ / ✗

### High Contrast Mode
- [ ] **Test 7.8:** Enable Windows High Contrast mode
  - **Expected:** All text readable, buttons visible
  - **Result:** _______________

- [ ] **Test 7.9:** Enable system dark mode
  - **Expected:** Dark theme applied, sufficient contrast
  - **Result:** _______________

### Error & Toast Visibility
- [ ] **Test 7.10:** Trigger validation error
  - **Expected:**
    - Inline error message visible
    - Positioned clearly near input
    - Color + icon (not color alone)
  - **Result:** _______________

- [ ] **Test 7.11:** Trigger toast notification
  - **Expected:**
    - Sufficient contrast ratio (4.5:1 minimum)
    - Readable font size
    - Auto-dismiss or close button
  - **Result:** _______________

---

## 8. Observability (MUST-PASS)

### Error Tracking (Sentry)
- [ ] **Test 8.1:** Trigger API error (e.g., invalid data)
  - **Expected:** Event captured in Sentry dashboard
  - **Event contains:**
    - ✓ User ID
    - ✓ Organization ID
    - ✓ Request URL
    - ✓ Stack trace
  - **Result:** _______________

- [ ] **Test 8.2:** Trigger frontend error (e.g., unhandled exception)
  - **Expected:** Error captured with component stack
  - **Result:** _______________

### Audit Logging
- [ ] **Test 8.3:** Create project
  - **Expected:** Audit entry with action=PROJECT_CREATED, userId, timestamp
  - **Result:** _______________

- [ ] **Test 8.4:** Update epic
  - **Expected:** Audit entry with action=EPIC_UPDATED, changes recorded
  - **Result:** _______________

- [ ] **Test 8.5:** Delete story
  - **Expected:** Audit entry with action=STORY_DELETED
  - **Result:** _______________

- [ ] **Test 8.6:** Publish epic
  - **Expected:**
    - Audit entry with action=EPIC_PUBLISHED
    - publisherId field populated
  - **Result:** _______________

### Health Check & Uptime
- [ ] **Test 8.7:** Visit `/api/health` or `/api/healthz`
  - **Expected:** 200 OK with JSON response
  - **Response body:** _______________
  - **Result:** _______________

- [ ] **Test 8.8:** Configure uptime monitoring
  - **Service used:** (e.g., Pingdom, UptimeRobot, Vercel)
  - **Alert configured:** Yes / No
  - **Result:** _______________

### Dashboard Review
- [ ] **Test 8.9:** Review audit events in admin dashboard
  - **Events visible:** Yes / No
  - **Filterable by user/action/date:** Yes / No
  - **Result:** _______________

---

## 9. AI Flows Regression (SHOULD-PASS)

### Story Generation
- [ ] **Test 9.1:** Generate stories for published epic
  - **Expected:**
    - Stories created successfully
    - Linked to correct epic
    - Appear in Stories page filters
  - **Result:** _______________

- [ ] **Test 9.2:** Generate stories for draft epic
  - **Expected:** Stories created, status=draft or backlog
  - **Result:** _______________

### Batch Creation
- [ ] **Test 9.3:** Batch create 10 stories via AI
  - **Expected:**
    - All 10 stories created
    - Correct project and epic assignment
    - Appears in filters immediately
  - **Result:** _______________

### Context & Permissions
- [ ] **Test 9.4:** Generate stories with project filter active
  - **Expected:** Generated stories land in filtered project
  - **Result:** _______________

- [ ] **Test 9.5:** Attempt AI generation as read-only user
  - **Expected:** 403 or feature disabled
  - **Result:** _______________

### Rate Limits
- [ ] **Test 9.6:** Trigger AI rate limit
  - **Action:** Generate stories 10 times rapidly
  - **Expected:** 429 response with friendly UI message
  - **Result:** _______________

### Story Validation
- [ ] **Test 9.7:** Validate story with AI endpoint
  - **Expected:** Validation response with suggestions
  - **Result:** _______________

---

## Summary & Sign-Off

### Test Results Summary
- **MUST-PASS Tests Completed:** ___ / 79
- **MUST-PASS Tests Passed:** ___ / 79
- **SHOULD-PASS Tests Completed:** ___ / 23
- **SHOULD-PASS Tests Passed:** ___ / 23

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Blockers for Production
- [ ] No critical RLS/security issues
- [ ] No data loss scenarios
- [ ] Performance targets met
- [ ] Observability functioning

### Go/No-Go Decision
- [ ] **GO** - Ready for production launch
- [ ] **NO-GO** - Blockers must be resolved

**Signed off by:** _______________
**Date:** _______________
**Comments:** _______________________________________________

---

**Generated by:** Production Validation Suite
**Version:** 1.0
**Last Updated:** 2025-10-11
