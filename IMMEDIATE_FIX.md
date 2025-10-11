# Immediate Fix for Story Not Found Issue

## TL;DR
The story exists and shows in your list, but clicking it shows "Story Not Found". This is likely due to **stale deployment cache** on the specific story detail page route.

## Quick Fix (Try These in Order)

### Fix 1: Hard Refresh the Browser (30 seconds)
1. Open https://synqforge.com/stories
2. Click on the story
3. When "Story Not Found" appears, do a **hard refresh**:
   - **Mac:** `Cmd + Shift + R`
   - **Windows:** `Ctrl + Shift + R`
4. Check if the story now loads

### Fix 2: Clear Browser Cache (1 minute)
1. Open DevTools (F12)
2. Right-click the refresh button → **Empty Cache and Hard Reload**
3. Or clear all browser cache for synqforge.com
4. Try accessing the story again

### Fix 3: Force Vercel to Rebuild Pages (2 minutes)
The API routes are fixed, but the **page routes** might still be cached.

1. Go to Vercel Dashboard
2. Deployments → Latest → **Redeploy**
3. **UNCHECK** "Use existing Build Cache"
4. Wait for deployment
5. Try again

### Fix 4: Check if Route Exists in Build
```bash
# Check if the story page route was built
npm run build 2>&1 | grep "stories"
```

Expected output:
```
○ /stories
ƒ /stories/[storyId]
```

If `/stories/[storyId]` is missing, there's a build issue.

## Debug: What's Really Happening?

Let me check the actual error. Open DevTools console when you click the story and look for:

### 1. Network Tab
- Find the request to `/api/stories/M9cCXqc2QCcir5lhoKRWP`
- Check:
  - Status code: 404? 403? 500?
  - Response body: What's the error message?
  - Request headers: Is `Cookie` header included?

### 2. Console Tab
Look for errors like:
- `"Story not found"`
- `"Access denied"`
- `"Failed to fetch story"`
- Any 404/403/500 errors

## Most Likely Cause: Page Route Cache

Your API endpoints work (we confirmed with curl), but the **Next.js page route** at `/app/stories/[storyId]/page.tsx` might be serving a cached version.

### Why This Happens:
1. You redeployed → API routes refreshed ✅
2. But Next.js might have cached the page components
3. The page tries to fetch from API
4. API works, but page shows cached "not found" state

### Solution:
**Force a complete cache clear and redeploy**

```bash
# Option 1: Via Vercel
# Dashboard → Settings → General → "Invalidate Cache" button
# Then redeploy

# Option 2: Via CLI
vercel --prod --force --yes

# Option 3: Delete .next and redeploy
rm -rf .next
git add .
git commit -m "chore: Clear build cache" --allow-empty
git push clean New
```

## Test Script

Run this to see the actual API response:

```bash
# This will show you what the API is actually returning
# You'll need to get your session cookie from browser DevTools first

curl -v -H "Cookie: __Secure-next-auth.session-token=YOUR_SESSION_TOKEN" \
  https://synqforge.com/api/stories/M9cCXqc2QCcir5lhoKRWP 2>&1 | tee story-response.txt
```

Look for:
- **200 OK** = Story exists and you have access ✅
- **404 Not Found** = Story doesn't exist or wrong org
- **403 Forbidden** = You don't have permission
- **401 Unauthorized** = Session expired

## Alternative: Check Production Database

If you want to be 100% certain, run this query in production DB:

```sql
-- Check if the story exists and matches your organization
SELECT 
  s.id,
  s.title,
  s."organizationId",
  s.status,
  u.email as your_email,
  u."organizationId" as your_org_id,
  CASE 
    WHEN s."organizationId" = u."organizationId" THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as access_status
FROM stories s
CROSS JOIN users u
WHERE s.id = 'M9cCXqc2QCcir5lhoKRWP'
  AND u.email = 'YOUR_EMAIL@example.com'  -- Replace with your email
LIMIT 1;
```

If you see `❌ MISMATCH`, then update the story:

```sql
-- Fix organization mismatch
UPDATE stories
SET "organizationId" = (
  SELECT "organizationId" 
  FROM users 
  WHERE email = 'YOUR_EMAIL@example.com' 
  LIMIT 1
)
WHERE id = 'M9cCXqc2QCcir5lhoKRWP';
```

## Expected Behavior vs Current

### Expected:
1. User clicks story in list
2. Browser navigates to `/stories/M9cCXqc2QCcir5lhoKRWP`
3. Page makes API call to `/api/stories/M9cCXqc2QCcir5lhoKRWP`
4. API returns story data
5. Page displays story details

### What's Probably Happening:
1. User clicks story in list ✅
2. Browser navigates to `/stories/M9cCXqc2QCcir5lhoKRWP` ✅
3. Page makes API call ❓
4. Either:
   - API returns 404 (story in wrong org) OR
   - API returns 200 but page shows cached "not found" OR
   - API call fails silently

## Action Plan

**Step 1:** Try hard refresh (Fix 1)  
**Step 2:** Check DevTools Network/Console  
**Step 3:** Report back what you see  
**Step 4:** We'll apply the appropriate fix

---

**Most likely you just need to:**
1. Hard refresh the browser, OR
2. Redeploy with clean cache one more time

Let me know what you find! 🔍
