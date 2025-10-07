# Vercel Environment Variables Configuration

**Last Updated:** 2025-10-07
**Status:** ✅ Ready to Deploy

---

## 📋 Copy-Paste Ready for Vercel

Go to: **Vercel Dashboard → synqforge → Settings → Environment Variables**

Add each of these variables (click "Add" after each one):

---

### 1. EMAIL_FROM
```
SynqForge <noreply@synqforge.com>
```
- **Environment:** Production, Preview, Development ✅ (check all three)
- **Description:** Email sender address for password reset emails

---

### 2. NEXTAUTH_URL
```
https://synqforge.com
```
- **Environment:** Production ✅ only
- **Description:** Production URL for authentication callbacks

**For Preview/Development:** Leave empty or use deployment URL

---

### 3. NEXT_PUBLIC_APP_URL
```
https://synqforge.com
```
- **Environment:** Production ✅ only
- **Description:** Public app URL used in emails and frontend

**For Preview/Development:** Use `https://$VERCEL_URL` or deployment-specific URL

---

### 4. UPSTASH_REDIS_REST_URL
```
https://relaxed-elephant-20678.upstash.io
```
- **Environment:** Production, Preview, Development ✅ (check all three)
- **Description:** Upstash Redis REST API URL for rate limiting

---

### 5. UPSTASH_REDIS_REST_TOKEN
```
AVDGAAIncDJjNGNkOTgxYWNlN2U0Y2RkOGExMDJkYjNhOTJiZDQ3OHAyMjA2Nzg
```
- **Environment:** Production, Preview, Development ✅ (check all three)
- **Description:** Upstash Redis authentication token (keep secret!)
- **Note:** Mark as "Sensitive" ✅

---

## 🔒 Security Notes

1. **Never commit `.env` to Git** - Already in `.gitignore` ✅
2. **UPSTASH_REDIS_REST_TOKEN is sensitive** - Mark as sensitive in Vercel
3. **Use different tokens for production/staging** - Optional but recommended
4. **Rotate tokens periodically** - Good security practice

---

## ✅ Quick Setup Checklist

### In Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select your project: **synqforge**
3. Navigate to: **Settings** → **Environment Variables**
4. Click **"Add New"** button
5. Add all 5 variables listed above
6. **Important:** Check which environments for each variable
7. Click **"Save"** after adding all variables
8. **Redeploy** your application (variables don't apply to existing deployments)

### Verification:

After adding variables and redeploying:

```bash
# Test production endpoint
curl -X POST https://synqforge.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@synqforge.com"}'
```

**Expected:** Email sent successfully or rate limit enforced

---

## 🎯 Complete Environment Variables List

Here's the complete set (including existing ones):

| Variable | Value | Environments | Sensitive |
|----------|-------|--------------|-----------|
| **Database** |
| `DATABASE_URL` | (existing) | All | ✅ Yes |
| `DATABASE_URL_UNPOOLED` | (existing) | All | ✅ Yes |
| **Authentication** |
| `NEXTAUTH_SECRET` | (existing) | All | ✅ Yes |
| `NEXTAUTH_URL` | `https://synqforge.com` | Production | No |
| **OAuth** |
| `GITHUB_CLIENT_ID` | (existing) | All | No |
| `GITHUB_CLIENT_SECRET` | (existing) | All | ✅ Yes |
| `GOOGLE_CLIENT_ID` | (existing) | All | No |
| `GOOGLE_CLIENT_SECRET` | (existing) | All | ✅ Yes |
| **Email** |
| `RESEND_API_KEY` | (existing) | All | ✅ Yes |
| `EMAIL_FROM` | `SynqForge <noreply@synqforge.com>` | All | No |
| **Rate Limiting** |
| `UPSTASH_REDIS_REST_URL` | `https://relaxed-elephant-20678.upstash.io` | All | No |
| `UPSTASH_REDIS_REST_TOKEN` | `AVDGAAIncDJjNGNkOTgxYWNlN2U0Y2RkOGExMDJkYjNhOTJiZDQ3OHAyMjA2Nzg` | All | ✅ Yes |
| **App Config** |
| `NEXT_PUBLIC_APP_URL` | `https://synqforge.com` | Production | No |
| `NODE_ENV` | `production` | Production | No |
| **AI** |
| `ANTHROPIC_API_KEY` | (existing) | All | ✅ Yes |
| `OPENROUTER_API_KEY` | (existing) | All | ✅ Yes |

---

## 🚀 Deployment Command

After adding all environment variables to Vercel:

```bash
# Commit your changes
git add .
git commit -m "feat: Production-ready with rate limiting and synqforge.com email"

# Push to trigger deployment
git push origin main
```

Or use Vercel CLI:

```bash
vercel --prod
```

---

## 🧪 Testing in Production

### Test 1: Password Reset Works
```bash
curl -X POST https://synqforge.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"chris@synqforge.com"}'
```

**Expected:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### Test 2: Rate Limit Works (Run 4 times quickly)
```bash
# Run this 4 times in a row
for i in {1..4}; do
  echo "Request $i:"
  curl -s -X POST https://synqforge.com/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' | jq .
  sleep 1
done
```

**Expected:** 4th request returns:
```json
{
  "error": "Too many password reset requests. Please try again later.",
  "retryAfter": "1 hour"
}
```

### Test 3: Check Upstash Logs
1. Go to: https://console.upstash.com
2. Select your database: **relaxed-elephant-20678**
3. Check **"Metrics"** tab
4. Should see command activity ✅

---

## 📊 Monitoring

### Upstash Dashboard
- URL: https://console.upstash.com
- Database: **relaxed-elephant-20678**
- Region: **Ireland (eu-west-1)**
- Monitor: Commands/sec, total requests, latency

### Vercel Logs
```bash
vercel logs synqforge --prod
```

Look for:
- ✅ `[RATE LIMIT] ✅ Enabled with Upstash Redis`
- ⚠️ `[RATE LIMIT] Blocked: password-reset:email@example.com`

---

## 🔧 Troubleshooting

### Issue: "Rate limiting not configured"

**Cause:** Environment variables not set correctly

**Fix:**
1. Verify variables are added in Vercel
2. Check for typos in variable names
3. Ensure all environments are selected
4. **Redeploy** application

### Issue: "fetch failed" or "ENOTFOUND"

**Cause:** Invalid Upstash URL

**Fix:**
1. Double-check URL: `https://relaxed-elephant-20678.upstash.io`
2. No trailing slashes
3. Must include `https://`

### Issue: Rate limits not working

**Cause:** Token invalid or expired

**Fix:**
1. Go to Upstash dashboard
2. Verify database is active
3. Regenerate REST token if needed
4. Update Vercel environment variables
5. Redeploy

---

## ✅ Post-Deployment Checklist

- [ ] All 5 new environment variables added to Vercel
- [ ] Marked sensitive variables (UPSTASH_REDIS_REST_TOKEN)
- [ ] Selected correct environments for each variable
- [ ] Redeployed application after adding variables
- [ ] Tested password reset in production
- [ ] Verified rate limiting works (tested 4 requests)
- [ ] Checked Upstash dashboard shows activity
- [ ] Checked Vercel logs for rate limit messages
- [ ] Verified email arrives from noreply@synqforge.com
- [ ] Confirmed reset link works end-to-end

---

**Status:** Ready to deploy! 🚀

All environment variables are configured and ready. Just add them to Vercel and deploy!
