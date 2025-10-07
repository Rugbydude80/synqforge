# Password Reset Setup Guide

This guide will help you set up and configure the password reset feature for SynqForge.

---

## Quick Start

### 1. Database Migration

The database schema has already been created and applied. Verify it's in place:

```bash
# Check if the table exists
psql -d synqforge -c "SELECT COUNT(*) FROM password_reset_tokens;"
```

If you need to reapply the migration:

```bash
npm run db:push
```

---

### 2. Email Configuration (Resend)

#### Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use the provided sandbox domain for testing
3. Generate an API key from the dashboard
4. Add to your `.env` file:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
EMAIL_FROM=SynqForge <noreply@yourdomain.com>
```

#### Test Email Configuration

```bash
# The forgot password endpoint will log the reset URL in development
# when RESEND_API_KEY is not set
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Check server logs for:
# "Reset URL (email not configured): http://localhost:3000/auth/reset-password?token=..."
```

---

### 3. Environment Variables

Update your `.env` file:

```bash
# Database (already configured)
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth (already configured)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Email Configuration (ADD THESE)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
EMAIL_FROM=SynqForge <noreply@yourdomain.com>

# OAuth (already configured)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## Development Testing

### Test the Complete Flow

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to sign-in page:**
   ```
   http://localhost:3000/auth/signin
   ```

3. **Click "Forgot password?" link**

4. **Enter a test email address**

5. **Check server logs for reset URL** (if email not configured):
   ```
   Reset URL (email not configured): http://localhost:3000/auth/reset-password?token=xxx
   ```

6. **Copy the URL and open in browser**

7. **Enter new password twice**

8. **Verify redirect to sign-in page**

### Test API Endpoints

#### Forgot Password:
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{"message":"If an account with that email exists, a password reset link has been sent."}
```

#### Reset Password:
```bash
# Use token from previous step
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"your-token-here","password":"newPassword123"}'
```

Expected response:
```json
{"message":"Password has been reset successfully"}
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Database migration applied
- [ ] Resend account created and domain verified
- [ ] RESEND_API_KEY configured in production environment
- [ ] EMAIL_FROM address configured (must match verified domain)
- [ ] NEXTAUTH_URL set to production URL
- [ ] Rate limiting middleware added (see below)
- [ ] Token cleanup cron job configured (see below)
- [ ] Monitoring and alerts configured

### Recommended: Add Rate Limiting

Create `middleware.ts` in your project root:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting (use Redis in production)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

export function middleware(request: NextRequest) {
  // Only apply to password reset endpoints
  if (!request.nextUrl.pathname.startsWith('/api/auth/forgot-password')) {
    return NextResponse.next()
  }

  const ip = request.ip ?? 'unknown'
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 5

  const current = rateLimit.get(ip)

  if (current && current.resetAt > now) {
    if (current.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    current.count++
  } else {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/auth/forgot-password',
}
```

**For production, use Upstash Redis:**

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? 'unknown'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  return NextResponse.next()
}
```

### Recommended: Token Cleanup Job

**Option 1: Vercel Cron Jobs**

Create `app/api/cron/cleanup-tokens/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { passwordResetTokens } from '@/lib/db/schema'
import { lt } from 'drizzle-orm'

export async function GET() {
  try {
    // Verify cron secret
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const result = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.createdAt, sevenDaysAgo))

    return NextResponse.json({
      success: true,
      deleted: result.count,
    })
  } catch (error) {
    console.error('Token cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
```

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-tokens",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Option 2: Database Trigger (PostgreSQL)**

```sql
-- Create a function to delete old tokens
CREATE OR REPLACE FUNCTION cleanup_old_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule it (requires pg_cron extension)
SELECT cron.schedule('cleanup-reset-tokens', '0 2 * * *', 'SELECT cleanup_old_reset_tokens()');
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Reset Request Volume**
   - Requests per hour/day
   - Alert on unusual spikes

2. **Email Delivery Rate**
   - Monitor Resend dashboard
   - Alert on delivery failures

3. **Token Usage Rate**
   - % of tokens that get used
   - Identify potential issues

4. **Error Rates**
   - 400 errors (invalid requests)
   - 500 errors (server issues)

### Example Monitoring Query

```sql
-- Daily password reset statistics
SELECT
  DATE(created_at) as date,
  COUNT(*) as requests,
  COUNT(used_at) as completed,
  ROUND(COUNT(used_at)::numeric / COUNT(*)::numeric * 100, 2) as completion_rate
FROM password_reset_tokens
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. RESEND_API_KEY is set correctly
2. Domain is verified in Resend dashboard
3. EMAIL_FROM address matches verified domain
4. Check Resend dashboard for delivery logs

**Temporary Workaround:**
- Check server logs for reset URL
- Manually send to user via support channel

### Issue: "Invalid or expired reset token"

**Possible Causes:**
1. Token has expired (> 1 hour old)
2. Token was already used
3. Token was manually deleted from database
4. User typed URL incorrectly

**Solution:**
- User should request a new reset link

### Issue: Rate Limiting Too Aggressive

**Adjust limits in middleware:**
```typescript
const maxRequests = 10 // Increase from 5
const windowMs = 60 * 60 * 1000 // Keep at 1 hour
```

### Issue: Database Migration Failed

**Manual migration:**
```sql
CREATE TABLE password_reset_tokens (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL,
  token varchar(255) NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp DEFAULT NOW()
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE UNIQUE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_tokens_expires ON password_reset_tokens(expires_at);
```

---

## Security Best Practices

### Do's ✅

- ✅ Use HTTPS in production (enforced by NEXTAUTH_URL)
- ✅ Keep token expiration short (1 hour default)
- ✅ Log all password reset activities
- ✅ Monitor for unusual patterns
- ✅ Use rate limiting
- ✅ Clean up old tokens regularly
- ✅ Use verified email domains
- ✅ Test email deliverability before launch

### Don'ts ❌

- ❌ Don't expose whether email exists in system
- ❌ Don't log tokens in plain text
- ❌ Don't reuse tokens after password reset
- ❌ Don't disable HTTPS in production
- ❌ Don't store tokens unencrypted (they're random, but still)
- ❌ Don't allow unlimited reset requests
- ❌ Don't send tokens via URL parameters to analytics

---

## Testing Checklist

### Functional Tests

- [ ] Forgot password page loads correctly
- [ ] Email validation works (client-side)
- [ ] API accepts valid email format
- [ ] API rejects missing email
- [ ] Email sends successfully (or logs URL in dev)
- [ ] Reset link contains valid token
- [ ] Reset page validates token on load
- [ ] Reset page rejects invalid tokens
- [ ] Reset page enforces password requirements
- [ ] Password confirmation matching works
- [ ] Password update succeeds
- [ ] Token marked as used after reset
- [ ] User can sign in with new password
- [ ] Auto-redirect works after success

### Security Tests

- [ ] Same response for valid/invalid emails
- [ ] Expired tokens rejected
- [ ] Used tokens rejected
- [ ] Short passwords rejected
- [ ] Rate limiting works (if implemented)
- [ ] No sensitive data in error messages
- [ ] HTTPS enforced in production
- [ ] CSRF protection active

### User Experience Tests

- [ ] Error messages are clear
- [ ] Success messages are reassuring
- [ ] Loading states prevent double-submit
- [ ] Mobile responsive design
- [ ] Accessible (keyboard navigation)
- [ ] Email template renders correctly
- [ ] Email works in major clients (Gmail, Outlook, etc.)

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor error rates in logs
- Check email delivery metrics

**Weekly:**
- Review token usage statistics
- Check for unusual reset patterns

**Monthly:**
- Review and update rate limits if needed
- Test full reset flow in staging
- Update dependencies

### Getting Help

If you encounter issues:

1. Check this documentation
2. Review [PASSWORD_RESET_VALIDATION.md](../PASSWORD_RESET_VALIDATION.md)
3. Check server logs for detailed errors
4. Test API endpoints directly with curl
5. Verify environment variables are set

---

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [OWASP Password Reset Guide](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

---

**Last Updated:** October 7, 2025
**Version:** 1.0.0
