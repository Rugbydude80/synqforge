# Fix Production Errors - SynqForge

## Error Summary
You're experiencing these errors in production (synqforge.com):

1. ❌ `/api/epics?projectId=...` → **500 Internal Server Error**
2. ❌ `/api/ai/generate-single-story` → **404 Not Found**  
3. ❌ CSS files serving with wrong MIME type (`text/plain` instead of `text/css`)

## Root Cause
These are **deployment issues**, not code issues. The routes exist in your codebase but aren't properly deployed or compiled in production.

## Immediate Fixes

### Fix 1: Force Clean Rebuild & Redeploy

```bash
# 1. Clean local build cache
rm -rf .next
rm -rf node_modules/.cache

# 2. Rebuild locally to verify everything works
npm run build

# 3. If build succeeds, commit and push
git add .
git commit -m "fix: Force rebuild for production API routes"
git push origin main  # or your production branch
```

### Fix 2: Clear Vercel Build Cache

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `synqforge` project
3. Go to **Deployments** tab
4. Find the latest deployment
5. Click **⋯** (three dots) → **Redeploy**
6. **IMPORTANT:** Uncheck "Use existing Build Cache"
7. Click **Redeploy**

### Fix 3: Verify Environment Variables

Make sure these are set in Vercel:

```bash
# Required in Vercel → Settings → Environment Variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://synqforge.com
ANTHROPIC_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Set for: Production, Preview, Development
```

### Fix 4: Check Vercel Function Logs

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Pull your project
vercel link

# View real-time logs
vercel logs --follow

# Or check specific deployment logs
vercel logs [deployment-url]
```

## Debugging the Specific Errors

### Error 1: Epic API 500 Error

The `/api/epics` route exists but is throwing a server error. Check:

**Possible Causes:**
- Database connection issue in production
- Missing or incorrect `organizationId` in user session
- Project access validation failing

**Debug Steps:**
1. Check Vercel logs for the actual error message
2. Verify `DATABASE_URL` is correct and accessible
3. Test the endpoint after redeployment:

```bash
# Test with curl (need to be authenticated)
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  "https://synqforge.com/api/epics?projectId=YOUR_PROJECT_ID"
```

### Error 2: AI Story Generation 404

The endpoint file exists at `app/api/ai/generate-single-story/route.ts` but returns 404.

**Possible Causes:**
- Route not compiled during build
- Vercel function deployment failed
- File system case sensitivity issue

**Debug Steps:**
1. Check if the route file was included in deployment:
   - Go to Vercel deployment details
   - Check "Source Files" to see if `app/api/ai/generate-single-story/route.ts` is present

2. Verify the route exports are correct:
```typescript
// app/api/ai/generate-single-story/route.ts should have:
export const POST = withAuth(generateSingleStory);
```

3. Check Next.js build output for route compilation errors

### Error 3: CSS MIME Type Issue

This suggests static assets aren't being served correctly by Vercel/CDN.

**Fix:**
- Usually resolved by a clean rebuild
- May be a CDN cache issue - wait 5-10 minutes after redeployment
- Or manually purge CDN cache in Vercel dashboard

## Verification Steps

After redeploying, verify each endpoint:

### 1. Test Epic API
```bash
# Open browser console on synqforge.com
fetch('/api/epics?projectId=YOUR_PROJECT_ID')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### 2. Test AI Story Generation
```bash
# Open browser console on synqforge.com  
fetch('/api/ai/generate-single-story', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requirement: 'As a user, I want to log in',
    projectId: 'YOUR_PROJECT_ID'
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### 3. Check CSS Loading
- Open DevTools → Network tab
- Reload page
- Check all CSS files return `Status: 200` with `Content-Type: text/css`

## Prevention

To avoid this in the future:

1. **Always test locally before deploying:**
   ```bash
   npm run build
   npm run start
   # Test at http://localhost:3000
   ```

2. **Enable build notifications in Vercel:**
   - Settings → Notifications → Enable email/Slack alerts for failed builds

3. **Use deployment protection:**
   - Settings → Deployment Protection → Enable for production

4. **Monitor with smoke tests:**
   ```bash
   # After each deployment, run:
   ./scripts/smoke.sh
   ```

## Still Having Issues?

If errors persist after redeployment:

1. **Check Vercel function logs** for the actual error message
2. **Verify database connectivity** from Vercel
3. **Test with Vercel CLI locally:**
   ```bash
   vercel dev
   ```
4. **Contact Vercel support** if it's a platform issue

## Quick Reference

| Issue | Most Likely Fix |
|-------|----------------|
| 404 on existing route | Clear build cache + redeploy |
| 500 server error | Check logs, verify env vars, test DB connection |
| CSS MIME type | Clean rebuild + wait for CDN cache |
| Missing routes | Verify route file exports `GET`/`POST` correctly |

---

**Last Updated:** October 11, 2025  
**Status:** Awaiting redeployment to fix issues
