# Quick Test Guide - Epic Association Fix

## Prerequisites
1. Have at least one project created
2. Have at least one epic created in that project
3. Be logged in

## Test Scenarios

### ✅ Test 1: Create Story Without Epic
**Steps:**
1. Navigate to a project
2. Click "Create Story" button
3. Fill in story title: "Test story without epic"
4. Leave Epic dropdown as "No Epic"
5. Click "Create Story"

**Expected Result:**
- Story creates successfully
- No error messages
- Story appears in backlog
- Epic field shows "No Epic"

---

### ✅ Test 2: Create Story With Epic
**Steps:**
1. Navigate to a project
2. Click "Create Story" button
3. Fill in story title: "Test story with epic"
4. Select an epic from the dropdown
5. Click "Create Story"

**Expected Result:**
- Story creates successfully
- Story is associated with selected epic
- Epic badge/label appears on story card

---

### ✅ Test 3: Edit Story to Add Epic
**Steps:**
1. Find a story without an epic
2. Click to open story details
3. In the "Epic" dropdown, select an epic
4. Change should save automatically

**Expected Result:**
- Success toast notification appears
- Epic association is saved
- Story now shows epic badge

---

### ✅ Test 4: Edit Story to Remove Epic
**Steps:**
1. Find a story that has an epic
2. Click to open story details
3. In the "Epic" dropdown, select "No Epic"
4. Change should save automatically

**Expected Result:**
- Success toast notification appears
- Epic association is removed
- Story now shows "No Epic"

---

### ✅ Test 5: AI Generate Story Without Epic
**Steps:**
1. Navigate to a project
2. Click "Create Story"
3. Click "Generate with AI" button
4. Enter a requirement like "Allow users to reset password"
5. DO NOT select an epic
6. Click "Generate Story"
7. Review generated content
8. Click "Create Story"

**Expected Result:**
- AI generates story successfully
- Form populates with AI content
- Story saves without epic
- No validation errors

---

### ✅ Test 6: AI Generate Story With Epic
**Steps:**
1. Navigate to a project
2. Click "Create Story"
3. Select an epic first
4. Click "Generate with AI" button
5. Enter a requirement
6. Click "Generate Story"
7. Review generated content
8. Click "Create Story"

**Expected Result:**
- AI generates story successfully
- Form retains epic selection
- Story saves with epic association

---

## Quick API Test (Optional)

### Using curl:

```bash
# Get your auth token from browser cookies or session
TOKEN="your-session-token"

# Test 1: Create story without epic
curl -X POST http://localhost:3000/api/stories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -d '{
    "projectId": "your-project-id",
    "title": "API Test Story Without Epic",
    "description": "Testing epic fix",
    "priority": "medium"
  }'

# Test 2: Create story with empty epicId
curl -X POST http://localhost:3000/api/stories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -d '{
    "projectId": "your-project-id",
    "title": "API Test Story Empty Epic",
    "description": "Testing epic fix",
    "priority": "medium",
    "epicId": ""
  }'

# Test 3: Create story with epic
curl -X POST http://localhost:3000/api/stories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -d '{
    "projectId": "your-project-id",
    "title": "API Test Story With Epic",
    "description": "Testing epic fix",
    "priority": "medium",
    "epicId": "your-epic-id"
  }'
```

### Expected Responses:
- All three requests should return 201 status
- Response should include created story object
- No validation errors

---

## Browser DevTools Check

### Watch for Errors:
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Perform any of the tests above
4. Check for:
   - ❌ No red error messages
   - ❌ No 400/422 validation errors
   - ✅ Success messages (if any)
   - ✅ Network tab shows 200/201 responses

### Network Tab Inspection:
1. Open Network tab
2. Filter by "Fetch/XHR"
3. Create or update a story
4. Click on the request
5. Check "Payload" tab to see what's being sent
6. Verify epicId is either:
   - Not included (when no epic)
   - Empty string that gets transformed
   - Valid UUID (when epic selected)

---

## Common Issues to Watch For

### ❌ If you see these errors, the fix didn't work:
- "Epic ID is required"
- "Epic ID must be valid"
- "Invalid story data"
- "Validation error" with epicId mentioned

### ✅ What success looks like:
- Stories create/update smoothly
- No unexpected error toasts
- Epic dropdown works naturally
- Can freely add/remove epic associations
- AI generation works with or without epic

---

## Reporting Issues

If you encounter any problems:
1. Note which test scenario failed
2. Copy any error messages
3. Check browser console for details
4. Check Network tab for API responses
5. Report with reproduction steps

---

## Database Verification (Optional)

If you have database access, verify:
```sql
-- Check stories without epics
SELECT id, title, epic_id 
FROM stories 
WHERE epic_id IS NULL;

-- Check stories with epics
SELECT s.id, s.title, s.epic_id, e.title as epic_title
FROM stories s
LEFT JOIN epics e ON s.epic_id = e.id
WHERE s.epic_id IS NOT NULL;
```

Both queries should return results without errors.

