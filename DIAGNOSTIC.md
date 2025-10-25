# Diagnostic Steps for Stories API Error

The error is still occurring in production. Here's how to diagnose it:

## Step 1: Check Network Tab

1. Open your browser's Developer Tools (F12)
2. Go to the **Network** tab
3. Navigate to https://www.synqforge.com/stories
4. Look for the request to `/api/stories?limit=1000`
5. Click on it and check:
   - **Status Code**: Should be 200, but likely showing 500
   - **Response tab**: Look for any error message
   - **Headers tab**: Check the `x-vercel-id` to see which deployment is serving the request

## Step 2: Check Browser Console

Look for the full error message including:
- The exact error text
- The stack trace
- Any additional details

## Step 3: Verify Deployment

The current deployment should be:
- **Deployment ID**: `dpl_3AMLnq8rbWxRdMjCSn7KGpsjixmb`
- **Commit**: `974cd98`

Check the HTML source of the page (View Source) and look for `dpl=` in any script src to verify which deployment is being used.

## Step 4: Clear Browser Cache

The browser might be caching the old JavaScript bundle:
1. Open Developer Tools
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

## Step 5: Check Vercel Dashboard

1. Go to https://vercel.com/synq-forge/synqforge
2. Check the latest deployment
3. Click on "Functions" tab
4. Look for `/api/stories` and check recent invocations and errors

## What We Fixed

The fix added a null check in `lib/repositories/stories.repository.ts:593`:

```typescript
// This prevents crashes when sprint data is missing
.filter(sr => sr.sprint && sr.sprint.status === 'active')
```

## If Error Persists

If you're still seeing the error after hard refresh, please provide:

1. The exact HTTP status code from Network tab
2. The response body from the failed request
3. The `x-vercel-id` header value
4. Any server-side error messages from the Response tab

This will help us identify if:
- The deployment hasn't propagated yet
- There's a different error occurring
- The browser is caching the old bundle
- There's a database issue

## Quick Test

Try this in your browser console (while logged in):

```javascript
fetch('/api/stories?limit=10')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error)
```

This will show you the actual API response.
