# Story Not Found - Debugging Guide

## Problem
When clicking on a story from `/stories` page, you see "Story Not Found" error even though the story appears in the list.

**Story ID:** `M9cCXqc2QCcir5lhoKRWP`  
**URL:** `https://synqforge.com/stories/M9cCXqc2QCcir5lhoKRWP`

---

## ✅ Good News
The API endpoints are now working correctly after your redeployment:
- ✅ `/api/stories/[storyId]` - Returns 307 (auth redirect) instead of 404
- ✅ `/api/ai/generate-single-story` - Returns 307 instead of 404
- ✅ `/api/epics` - Returns 307 instead of 500

---

## 🔍 Root Causes (Most Likely)

### 1. **Organization Mismatch** (Most Common)
The story exists in the database but belongs to a different organization than your logged-in user.

**How it happens:**
- You switched organizations
- Story was created under a test/old organization
- Database was reset but some data remained

**Symptoms:**
- Story shows in `/stories` list (which might not filter correctly)
- Clicking story shows "Story Not Found"
- API returns 404 even when authenticated

### 2. **Story Was Deleted**
The story was deleted from the database but is cached in the UI or in a stale query.

### 3. **Database Query Issue**
The story exists but the database query is failing silently.

---

## 🔧 Debugging Steps

### Step 1: Check Vercel Logs

```bash
vercel logs --prod --follow
```

Then try accessing the story in your browser. Look for errors like:
- `"Story not found"` - from `assertStoryAccessible`
- `"Error fetching story: ..."` - database error
- SQL errors or timeouts

### Step 2: Check Database Directly

I've created a SQL diagnostic file: `check-story-db.sql`

1. Connect to your production database
2. Update the SQL file with your email address (search for `YOUR_EMAIL_HERE`)
3. Run the queries to check:
   - Does the story exist?
   - What organization does it belong to?
   - What organization are you in?
   - Do they match?

**Quick check:**
```sql
-- Check if story exists and its organization
SELECT 
  s.id,
  s.title,
  s."organizationId",
  o.name as org_name
FROM stories s
JOIN organizations o ON s."organizationId" = o.id
WHERE s.id = 'M9cCXqc2QCcir5lhoKRWP';

-- Check your user's organization
SELECT 
  email,
  "organizationId",
  (SELECT name FROM organizations WHERE id = users."organizationId") as org_name
FROM users
WHERE email = 'your-email@example.com';
```

### Step 3: Test API with Authentication

Use the `debug-story-access.sh` script:

```bash
./debug-story-access.sh
```

Follow the instructions to:
1. Get your session cookie from browser DevTools
2. Make authenticated API request
3. See the actual error response

---

## 🎯 Solutions

### Solution 1: Organization Mismatch

If the story belongs to a different organization, you have options:

**A. Update story's organizationId:**
```sql
-- Move story to your current organization
UPDATE stories
SET "organizationId" = 'YOUR_ORG_ID_HERE'
WHERE id = 'M9cCXqc2QCcir5lhoKRWP';
```

**B. Switch to the story's organization:**
- Check what organizations you have access to
- Switch organizations in the UI
- Try accessing the story again

**C. Fix the /stories list query:**
The `/stories` page should already filter by organizationId. If it's showing stories from other orgs, that's a separate bug we need to fix.

### Solution 2: Story Doesn't Exist

If the story was deleted:

1. Clear any cached data
2. Remove it from the UI listing
3. Check why it's still appearing in the `/stories` list

### Solution 3: Database Connection Issue

If you see database errors in logs:
1. Check `DATABASE_URL` environment variable in Vercel
2. Verify database is accessible from Vercel
3. Check for connection pool limits
4. Look for slow query warnings

---

## 🔎 Additional Debugging

### Check Story List Query

The `/stories` page should filter by organizationId. Let's verify:

```bash
# In your codebase, find the query that populates /stories
grep -r "SELECT.*stories" app/stories/page.tsx
```

### Check Browser Console

Open DevTools → Console and look for:
- Failed fetch requests
- JavaScript errors
- Auth token issues

### Check Network Tab

Open DevTools → Network tab:
1. Reload `/stories` page
2. Click on the story
3. Check the API request to `/api/stories/M9cCXqc2QCcir5lhoKRWP`
4. Look at:
   - Status code (404? 403? 500?)
   - Response body (what error message?)
   - Request headers (is auth cookie included?)

---

## 📝 Quick Test Commands

```bash
# 1. Check production logs
vercel logs --prod | grep -i "story\|error" | tail -50

# 2. Test API endpoint (no auth)
curl -I https://synqforge.com/api/stories/M9cCXqc2QCcir5lhoKRWP

# 3. Test with auth (get cookie from browser first)
curl -H "Cookie: __Secure-next-auth.session-token=YOUR_TOKEN" \
  https://synqforge.com/api/stories/M9cCXqc2QCcir5lhoKRWP

# 4. Check what's deployed
vercel ls synqforge --prod
```

---

## 🐛 Code to Review

If the issue persists, check these files:

1. **`/app/api/stories/[storyId]/route.ts`** (Line 10-23)
   - The `getStory` function
   - Error handling
   
2. **`/lib/permissions/story-access.ts`** (Line 15-30)
   - The `assertStoryAccessible` function
   - Organization filtering

3. **`/lib/repositories/stories.repository.ts`** (Line 201-243)
   - The `getById` method
   - Missing organizationId filter?

4. **`/app/stories/page.tsx`**
   - How is the story list generated?
   - Is it filtering by organizationId?

---

## 🎓 Expected Behavior

**Correct flow:**
1. User sees list of stories from THEIR organization
2. Clicks a story
3. API checks:
   - User is authenticated ✅
   - Story exists ✅
   - Story belongs to user's organization ✅
4. Story details displayed

**Current flow (broken):**
1. User sees story in list (maybe from wrong org?)
2. Clicks story
3. API checks:
   - User is authenticated ✅
   - Story exists ✅
   - Story belongs to user's organization ❌ FAILS
4. "Story Not Found" error

---

## 📞 Next Steps

1. **Run the SQL diagnostic queries** (`check-story-db.sql`)
2. **Check Vercel logs** while accessing the story
3. **Report back with:**
   - Does the story exist in the database?
   - What's the story's organizationId?
   - What's your user's organizationId?
   - What error appears in Vercel logs?

Then we can provide the exact fix!

---

## 🔑 Most Likely Fix

Based on similar issues, this is probably an **organization mismatch**. The fix:

```sql
-- Find the story's current org
SELECT "organizationId" FROM stories WHERE id = 'M9cCXqc2QCcir5lhoKRWP';

-- Find your user's org
SELECT "organizationId" FROM users WHERE email = 'your-email@example.com';

-- Update story to your organization
UPDATE stories 
SET "organizationId" = (
  SELECT "organizationId" FROM users WHERE email = 'your-email@example.com' LIMIT 1
)
WHERE id = 'M9cCXqc2QCcir5lhoKRWP';

-- Also update the project if needed
UPDATE projects
SET "organizationId" = (
  SELECT "organizationId" FROM users WHERE email = 'your-email@example.com' LIMIT 1
)
WHERE id = (SELECT "projectId" FROM stories WHERE id = 'M9cCXqc2QCcir5lhoKRWP');
```

**⚠️ Only run this after confirming the organization mismatch!**
