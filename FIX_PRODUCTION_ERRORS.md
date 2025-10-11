# Fix Production Errors - Action Plan

## Current Issues on synqforge.com

### 1. `/api/epics?projectId=...` → 500 Error
**Error:** "Failed to load epics: APIError: Failed to list epics"

**Likely Causes:**
- Database query timing out or failing
- Project access validation throwing unexpected error
- Missing/malformed organizationId in production database

### 2. `/api/ai/generate-single-story` → 404 Error
**Error:** "Failed to load resource: the server responded with a status of 404"

**Cause:** Stale production deployment - Vercel is serving an old build

### 3. CSS MIME Type Error
**Error:** "Refused to apply style... MIME type ('text/plain') is not a supported stylesheet MIME type"

**Cause:** Vercel edge network serving stale static assets

---

## ✅ IMMEDIATE ACTION REQUIRED

Your code is correct and builds successfully locally. You need to **redeploy to production with a clean build cache**.

### Quick Fix (5 minutes):

#### Option 1: Via Vercel Dashboard (RECOMMENDED)

1. Go to https://vercel.com/dashboard
2. Click on **synqforge** project
3. Go to **Deployments** tab
4. Find the latest production deployment
5. Click the **⋯** (three dots) menu
6. Select **Redeploy**
7. **IMPORTANT:** ✅ Uncheck "Use existing Build Cache"
8. Click **Redeploy** button
9. Wait 2-3 minutes for build to complete

#### Option 2: Via Git Push

```bash
# Force a new deployment
git add .
git commit -m "fix: Force clean production rebuild" --allow-empty
git push origin main
```

#### Option 3: Via Vercel CLI

```bash
vercel --prod --force
```

---

## Verify After Deployment

Once redeployment completes, test these endpoints:

```bash
# 1. Should return 401 (auth required) NOT 404
curl -I https://synqforge.com/api/ai/generate-single-story

# 2. Should return 401 or 200 NOT 500
curl -I https://synqforge.com/api/epics?projectId=test

# 3. Open browser and check CSS loads properly
# https://synqforge.com
# DevTools → Network → Check .css files show Content-Type: text/css
```

---

## If 500 Error Persists on /api/epics

Check production logs for the actual error:

```bash
vercel logs --prod --follow
```

Look for error messages like:
- "Error listing epics: ..."
- "Database connection failed"
- "ForbiddenError: Access denied to this project"

### Debug Database Access

The error happens when calling `epicsRepo.getEpics(projectId)` which validates:
1. Project exists
2. Project belongs to user's organization

Run this query in your production database:

```sql
-- Check if project and user org IDs match
SELECT 
  p.id as project_id,
  p.name as project_name,
  p."organizationId" as project_org,
  u.id as user_id,
  u.email,
  u."organizationId" as user_org,
  CASE 
    WHEN p."organizationId" = u."organizationId" THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM projects p
CROSS JOIN users u
WHERE p.id = 'of0ebixrgge9piiwom7z8'  -- The projectId from your error
LIMIT 10;
```

If you see `❌ MISMATCH`, that's your issue - the user's organizationId doesn't match the project's organizationId.

---

## Clear CDN Cache (For CSS Issues)

If CSS still loads incorrectly after redeployment:

1. In Vercel Dashboard → Project → Domains
2. Click "Purge Cache" for synqforge.com
3. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

## Success Checklist

- [ ] Redeployed with clean cache (no "Use existing Build Cache")
- [ ] Build completed successfully (check Vercel logs)
- [ ] `/api/ai/generate-single-story` returns 401 NOT 404
- [ ] `/api/epics` returns 200/401 NOT 500
- [ ] CSS files load with correct MIME type
- [ ] No console errors in production

---

## Quick Commands Reference

```bash
# Redeploy
vercel --prod --force

# Watch deployment logs
vercel logs --follow

# Check what's deployed
vercel ls synqforge --prod

# Test endpoints
curl -I https://synqforge.com/api/epics
curl -I https://synqforge.com/api/ai/generate-single-story
```

---

## Note About Local .env.local

✅ **It's CORRECT that your `.env.local` is empty/missing**

Environment variables should be:
- ❌ NOT in `.env.local` (only for local dev)
- ✅ Set in Vercel Dashboard (Settings → Environment Variables)
- ✅ Set for "Production" environment

You already have this configured correctly, so no action needed there.
