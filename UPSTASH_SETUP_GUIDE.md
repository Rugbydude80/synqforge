# Upstash Redis Setup Guide for Rate Limiting

**Purpose:** Enable rate limiting for password reset endpoints to prevent abuse and spam attacks.

**Time Required:** 5-10 minutes
**Cost:** FREE (25,000 commands/day on free tier)

---

## Why You Need This

Without rate limiting, attackers can:
- ❌ Spam password reset emails to any user (harassment)
- ❌ Enumerate valid email addresses
- ❌ Overload your email service (Resend costs)
- ❌ Brute force password reset tokens

With rate limiting:
- ✅ Max 3 reset requests per email per hour
- ✅ Max 5 token validation attempts per 15 minutes
- ✅ Automatic protection across all Vercel edge functions
- ✅ Zero configuration after initial setup

---

## Step-by-Step Setup

### 1. Create Upstash Account (2 minutes)

1. Go to: https://console.upstash.com
2. Sign up with GitHub, Google, or Email
3. Verify your email (check spam folder)
4. Log in to dashboard

### 2. Create Redis Database (1 minute)

1. Click **"Create Database"** button
2. Fill in the form:
   - **Name:** `synqforge-ratelimit` (or any name you prefer)
   - **Type:** Select **Regional** (faster, recommended)
   - **Region:** Choose closest to your users (e.g., `us-east-1` or `eu-west-1`)
   - **TLS:** Keep enabled (recommended)
   - **Eviction:** Keep default

3. Click **"Create"**

### 3. Get Your Credentials (1 minute)

After creating the database:

1. You'll see your database dashboard
2. Scroll down to **"REST API"** section
3. Click **"Show"** next to the credentials
4. Copy the following values:

```
UPSTASH_REDIS_REST_URL=https://xxxxx-xxxxx-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
```

### 4. Update Local .env File (30 seconds)

Open `/Users/chrisrobertson/Desktop/synqforge/.env` and replace:

```bash
# FROM:
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here

# TO: (paste your actual values)
UPSTASH_REDIS_REST_URL=https://xxxxx-xxxxx-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
```

### 5. Update Vercel Environment Variables (2 minutes)

1. Go to: https://vercel.com/dashboard
2. Select your **synqforge** project
3. Click **Settings** → **Environment Variables**
4. Add these TWO variables:

**Variable 1:**
```
Name: UPSTASH_REDIS_REST_URL
Value: https://xxxxx-xxxxx-xxxxx.upstash.io
Environment: Production, Preview, Development (check all three)
```

**Variable 2:**
```
Name: UPSTASH_REDIS_REST_TOKEN
Value: AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
Environment: Production, Preview, Development (check all three)
```

5. Click **Save** for each

### 6. Verify Setup (1 minute)

#### Local Test:
```bash
# Restart your dev server
npm run dev

# Test the endpoint 4 times (should see rate limit on 4th request)
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected behavior:**
- Request 1-3: ✅ Returns 200 with success message
- Request 4: ⚠️ Returns 429 with rate limit error

#### Production Test (after deployment):
```bash
curl -X POST https://synqforge.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@synqforge.com"}'
```

### 7. Monitor Usage (Optional)

1. Go to Upstash dashboard: https://console.upstash.com
2. Click on your database
3. View **"Metrics"** tab to see:
   - Commands per second
   - Total requests
   - Data size
   - Latency

---

## Rate Limit Configuration

### Current Limits (Configured in `/lib/rate-limit.ts`)

| Endpoint | Identifier | Limit | Window | Purpose |
|----------|-----------|-------|--------|---------|
| **Forgot Password** | Email address | 3 requests | 1 hour | Prevent email spam |
| **Reset Password** | Token | 5 attempts | 15 minutes | Prevent token brute force |

### Customizing Limits

Edit `/lib/rate-limit.ts`:

```typescript
// Change forgot password limit
export const passwordResetRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '2 h'), // 5 requests per 2 hours
  // ...
})

// Change token validation limit
export const resetTokenRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '30 m'), // 10 attempts per 30 min
  // ...
})
```

---

## Troubleshooting

### ⚠️ "Error checking rate limit: fetch failed"

**Cause:** Invalid Upstash credentials or network issue

**Fix:**
1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
2. Check for typos (common: missing `https://` or trailing spaces)
3. Ensure Upstash database is in "Active" state
4. Try regenerating REST token in Upstash dashboard

### ⚠️ "Rate limiting not configured - allowing request"

**Status:** This is expected behavior when credentials are missing

**Impact:** Requests are allowed (fail-open for safety)

**Fix:** Complete steps 3-5 above

### ⚠️ Rate limits not working in production

**Fix:**
1. Check Vercel environment variables are set
2. Redeploy after adding variables (variables don't apply retroactively)
3. Check Vercel deployment logs for errors

### ⚠️ Getting rate limited too quickly

**Cause:** Limits are too strict for your use case

**Fix:** Increase limits in `/lib/rate-limit.ts` (see "Customizing Limits" above)

---

## Free Tier Limits

Upstash Free Tier includes:
- ✅ 10,000 commands per day (plenty for most apps)
- ✅ 256 MB storage
- ✅ 1 database
- ✅ Global replication
- ✅ TLS encryption
- ✅ No credit card required

**Estimated usage for SynqForge:**
- ~5-10 commands per password reset request
- 1,000 users doing password resets = ~5,000-10,000 commands
- Free tier easily handles 1,000-2,000 password resets per day

Need more? Upgrade to Pay As You Go:
- $0.2 per 100,000 commands
- Still very affordable!

---

## Security Best Practices

### ✅ What's Implemented

- **Sliding window algorithm** - More accurate than fixed windows
- **Per-email limiting** - Prevents targeted harassment
- **Per-token limiting** - Prevents brute force attacks
- **Graceful degradation** - System works even if Redis is down
- **Analytics enabled** - Track rate limit hits in Upstash dashboard

### 🔒 Additional Security (Optional)

Add IP-based rate limiting for extra protection:

```typescript
// In forgot-password/route.ts
const ip = request.headers.get('x-forwarded-for') || 'unknown'
const ipRateLimit = await checkRateLimit(`ip:${ip}`, passwordResetRateLimit)
```

⚠️ **Note:** Be careful with IP limiting - could affect users behind NAT/VPN

---

## Testing Rate Limits

### Test Script

Create `test-rate-limit.sh`:

```bash
#!/bin/bash

echo "Testing rate limit (3 requests allowed per hour)..."

for i in {1..5}; do
  echo -e "\n--- Request $i ---"
  curl -s -X POST http://localhost:3000/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    | jq .
  sleep 1
done
```

Run:
```bash
chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

**Expected output:**
```
--- Request 1 ---
{ "message": "If an account with that email exists..." }

--- Request 2 ---
{ "message": "If an account with that email exists..." }

--- Request 3 ---
{ "message": "If an account with that email exists..." }

--- Request 4 ---
{ "error": "Too many password reset requests. Please try again later.", "retryAfter": "1 hour" }
```

---

## Quick Reference

### Upstash Dashboard
https://console.upstash.com

### Documentation
- Upstash Redis: https://upstash.com/docs/redis
- Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- Vercel Integration: https://vercel.com/integrations/upstash

### Support
- Upstash Discord: https://upstash.com/discord
- Upstash Support: support@upstash.com

---

## What Happens Next

After setup is complete:

1. ✅ Rate limiting automatically protects your endpoints
2. ✅ Attackers are blocked after exceeding limits
3. ✅ Legitimate users are unaffected (3 requests/hour is plenty)
4. ✅ You can monitor usage in Upstash dashboard
5. ✅ No maintenance required - it just works!

---

**Setup Status Checklist:**

- [ ] Created Upstash account
- [ ] Created Redis database
- [ ] Copied REST URL and Token
- [ ] Updated local .env file
- [ ] Updated Vercel environment variables
- [ ] Tested locally (got rate limited on 4th request)
- [ ] Deployed to production
- [ ] Tested in production

**Estimated Total Time:** 5-10 minutes
**Difficulty:** Easy ⭐☆☆☆☆

---

**Need Help?** The rate limiting system is designed to fail-open (allow requests) if there are any issues, so your users are never blocked due to configuration problems. You can always set this up later without breaking anything!
