# Password Reset - Production Deployment Checklist

**Date:** 2025-10-07
**Status:** ⚠️ READY WITH ACTION ITEMS
**Deployment Target:** Vercel (synqforge.com)

---

## 🔴 CRITICAL - Must Complete Before Production

### 1. Email Configuration for synqforge.com Domain

**Current State:**
- ✅ Using Resend API with test domain: `onboarding@resend.dev`
- ❌ Need to configure production email: `noreply@synqforge.com`

**Action Required:**

#### Step 1: Verify Domain in Resend Dashboard
1. Log into [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain"
3. Enter: `synqforge.com`
4. Add the following DNS records to your domain provider:

```
Type: TXT
Name: @
Value: [Resend will provide this]

Type: MX
Name: @
Priority: 10
Value: [Resend will provide this]

Type: TXT (DKIM)
Name: resend._domainkey
Value: [Resend will provide this]
```

5. Wait for verification (usually 5-15 minutes)
6. Confirm "Verified" status in Resend dashboard

#### Step 2: Update Vercel Environment Variables
In your [Vercel Project Settings](https://vercel.com/dashboard) → Environment Variables:

```bash
# Update these values:
EMAIL_FROM=SynqForge <noreply@synqforge.com>
NEXTAUTH_URL=https://synqforge.com
NEXT_PUBLIC_APP_URL=https://synqforge.com

# Keep existing (already configured):
RESEND_API_KEY=re_6nWErpzF_EqWvPizSKzbZm21LxkFhgEaq
```

**⚠️ Important:** After updating environment variables, redeploy your application.

---

## 🟡 HIGH PRIORITY - Recommended Before Production

### 2. Rate Limiting (Prevent Abuse)

**Current State:** ❌ No rate limiting implemented

**Recommended Solution - Upstash Redis + Vercel:**

```bash
# Install dependencies:
npm install @upstash/ratelimit @upstash/redis
```

**Implementation:**
Create `/lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const passwordResetRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
})
```

Add to `forgot-password/route.ts`:
```typescript
import { passwordResetRateLimit } from '@/lib/rate-limit'

// Before processing request:
const identifier = email // or use IP: request.ip
const { success } = await passwordResetRateLimit.limit(identifier)

if (!success) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  )
}
```

**Vercel Environment Variables:**
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Why:** Prevents attackers from:
- Spamming password reset requests
- Email bombing users
- Brute force token attempts

---

### 3. Token Cleanup Job (Database Maintenance)

**Current State:** ❌ Expired tokens accumulate in database

**Recommended Solution - Vercel Cron:**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-reset-tokens",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Create `/app/api/cron/cleanup-reset-tokens/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { passwordResetTokens } from '@/lib/db/schema'
import { lt } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete tokens older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const result = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, sevenDaysAgo))

    return NextResponse.json({
      success: true,
      deletedCount: result.rowCount || 0,
    })
  } catch (error) {
    console.error('Token cleanup failed:', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
```

**Vercel Environment Variables:**
```bash
CRON_SECRET=your-random-secret-key
```

---

## 🟢 MEDIUM PRIORITY - Nice to Have

### 4. Monitoring & Analytics

**Recommended Tools:**

1. **Vercel Analytics** (Built-in)
   - Already available in your Vercel dashboard
   - Monitor API response times
   - Track error rates

2. **Sentry for Error Tracking**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Custom Logging**
   Add to `forgot-password/route.ts`:
   ```typescript
   // Log password reset requests (without sensitive data)
   await db.insert(activities).values({
     id: nanoid(),
     organizationId: user.organizationId,
     userId: user.id,
     action: 'password_reset_requested',
     resourceType: 'user',
     resourceId: user.id,
     ipAddress: request.ip,
     userAgent: request.headers.get('user-agent'),
     createdAt: new Date(),
   })
   ```

### 5. Email Template Customization

Update email in `forgot-password/route.ts` to use your branding:
```typescript
from: 'SynqForge <noreply@synqforge.com>',
subject: 'Reset your SynqForge password',
```

Test email design at: https://react.email/preview

---

## ✅ ALREADY PRODUCTION-READY

- ✅ Database schema with proper indexes
- ✅ Secure token generation (nanoid 64 chars)
- ✅ Token expiration (1 hour)
- ✅ Single-use tokens
- ✅ Password hashing (bcrypt)
- ✅ Email enumeration protection
- ✅ Environment variable configuration
- ✅ Error handling
- ✅ UI/UX implementation
- ✅ Mobile responsive design
- ✅ Graceful email service degradation
- ✅ Middleware authentication bypass for auth routes

---

## 📋 Pre-Deployment Testing Checklist

### Staging Environment Test
- [ ] Test forgot password with real synqforge.com email
- [ ] Verify email arrives from noreply@synqforge.com
- [ ] Click reset link and verify it works
- [ ] Test password change completes successfully
- [ ] Verify can sign in with new password
- [ ] Test with invalid/expired token
- [ ] Test with already-used token
- [ ] Verify rate limiting works (if implemented)

### Production Smoke Test
- [ ] Submit forgot password form
- [ ] Receive email within 30 seconds
- [ ] Reset link works
- [ ] Password reset successful
- [ ] Can sign in with new password

---

## 🚀 Deployment Steps

### 1. Update Environment Variables in Vercel

Go to: https://vercel.com/[your-team]/synqforge/settings/environment-variables

**Add/Update:**
```bash
EMAIL_FROM=SynqForge <noreply@synqforge.com>
NEXTAUTH_URL=https://synqforge.com
NEXT_PUBLIC_APP_URL=https://synqforge.com
RESEND_API_KEY=[your-existing-key]
```

### 2. Deploy to Vercel

```bash
git add .
git commit -m "feat: Production-ready password reset with synqforge.com email"
git push origin main
```

Or via Vercel CLI:
```bash
vercel --prod
```

### 3. Verify Deployment

```bash
# Test the endpoint
curl -X POST https://synqforge.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@synqforge.com"}'
```

### 4. Monitor First 24 Hours

- Check Vercel logs for errors
- Monitor email delivery rate in Resend dashboard
- Watch for any 500 errors in production

---

## 🔧 Environment Variables Reference

### Required for Production:
| Variable | Value | Where to Set |
|----------|-------|--------------|
| `RESEND_API_KEY` | `re_6nWErpzF_EqWvPizSKzbZm21LxkFhgEaq` | Vercel |
| `EMAIL_FROM` | `SynqForge <noreply@synqforge.com>` | Vercel |
| `NEXTAUTH_URL` | `https://synqforge.com` | Vercel |
| `NEXT_PUBLIC_APP_URL` | `https://synqforge.com` | Vercel |

### Optional (If implementing rate limiting):
| Variable | Value | Where to Set |
|----------|-------|--------------|
| `UPSTASH_REDIS_REST_URL` | From Upstash dashboard | Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash dashboard | Vercel |

### Optional (If implementing cron cleanup):
| Variable | Value | Where to Set |
|----------|-------|--------------|
| `CRON_SECRET` | Generate random string | Vercel |

---

## 📞 Support Resources

- **Resend Dashboard:** https://resend.com/domains
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Documentation:**
  - Resend: https://resend.com/docs
  - Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
  - Vercel Cron: https://vercel.com/docs/cron-jobs

---

## 🎯 Current Status Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Code Implementation | ✅ Complete | None |
| Database Schema | ✅ Complete | None |
| API Endpoints | ✅ Complete | None |
| UI/UX | ✅ Complete | None |
| Email Service | ⚠️ Partially Ready | Verify synqforge.com domain in Resend |
| Environment Vars | ⚠️ Need Update | Update EMAIL_FROM and URLs |
| Rate Limiting | ❌ Not Implemented | Recommended before production |
| Token Cleanup | ❌ Not Implemented | Optional (can add post-launch) |
| Monitoring | ⚠️ Basic | Vercel logs available |

**Bottom Line:** Code is ready. Need to verify domain in Resend and update 3 environment variables, then deploy. Rate limiting is strongly recommended but not a blocker.

---

**Last Updated:** 2025-10-07
**Next Review:** After production deployment
