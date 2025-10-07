# Password Reset Flow Diagram

## User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PASSWORD RESET FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

Step 1: User Initiates Reset
─────────────────────────────
┌──────────────┐
│  Sign In     │
│  Page        │
│              │
│  [Forgot     │◄──── User clicks "Forgot password?"
│   password?] │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Forgot Password  │
│ Page             │
│                  │
│ Enter email:     │
│ [____________]   │◄──── User enters email
│                  │
│ [Send reset link]│
└──────┬───────────┘
       │
       ▼


Step 2: Backend Processing
───────────────────────────
┌─────────────────────┐
│ POST /api/auth/     │
│ forgot-password     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Validate Email      │
│ - Check format      │
│ - Required field    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     No      ┌──────────────────┐
│ Find User in DB?    │────────────▶│ Return Success   │
│                     │             │ (anti-enumeration)│
└─────────┬───────────┘             └──────────────────┘
          │ Yes
          ▼
┌─────────────────────┐
│ Generate Token      │
│ - nanoid(64)        │
│ - Expires: +1 hour  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Store in DB         │
│ password_reset_     │
│ tokens table        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     Email Configured?
│ Send Email via      │     ┌─────────┬─────────┐
│ Resend              │     │   Yes   │   No    │
│                     │     ▼         ▼
│ - Reset link        │  [Send]   [Log URL]
│ - Expires in 1hr    │
│ - Security notice   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Return Success      │
│ Message to User     │
└─────────────────────┘


Step 3: Email Delivery
───────────────────────
┌─────────────────────┐
│  📧 Email Inbox     │
│                     │
│  From: SynqForge    │
│  Subject: Reset     │
│  your password      │
│                     │
│  [Reset Password]   │◄──── User clicks button
│  Button             │
│                     │
│  Or copy URL:       │
│  https://...        │
└─────────┬───────────┘
          │
          ▼


Step 4: Password Reset
───────────────────────
┌──────────────────────┐
│ Reset Password Page  │
│ /auth/reset-password │
│ ?token=xxxxx         │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Validate Token       │
│ - Exists?            │
│ - Not expired?       │
│ - Not used?          │
└─────────┬────────────┘
          │
          │ Valid
          ▼
┌──────────────────────┐
│ Enter New Password   │
│                      │
│ New Password:        │
│ [____________]       │◄──── User enters password
│                      │
│ Confirm Password:    │
│ [____________]       │◄──── User confirms
│                      │
│ [Reset password]     │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ POST /api/auth/      │
│ reset-password       │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Validate Request     │
│ - Token present?     │
│ - Password length?   │
│ - Passwords match?   │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐     Invalid    ┌──────────────┐
│ Validate Token in DB │───────────────▶│ Return Error │
│ - EXISTS             │                └──────────────┘
│ - NOT expired        │
│ - NOT used           │
└─────────┬────────────┘
          │ Valid
          ▼
┌──────────────────────┐
│ Hash New Password    │
│ - bcrypt (12 rounds) │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Update User Password │
│ in users table       │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Mark Token as Used   │
│ usedAt = NOW()       │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Return Success       │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Show Success Message │
│ "Password reset!"    │
│                      │
│ Auto-redirect in 2s  │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Sign In Page         │
│                      │
│ [Sign in with new    │◄──── User signs in
│  password]           │
└──────────────────────┘


═══════════════════════════════════════════════════════════════
```

## Database Schema

```
┌──────────────────────────────┐
│   password_reset_tokens      │
├──────────────────────────────┤
│ id            VARCHAR(36) PK │
│ user_id       VARCHAR(36)    │──┐
│ token         VARCHAR(255) U │  │
│ expires_at    TIMESTAMP      │  │  Foreign Key
│ used_at       TIMESTAMP NULL │  │
│ created_at    TIMESTAMP      │  │
└──────────────────────────────┘  │
                                  │
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │        users           │
                     ├────────────────────────┤
                     │ id          VARCHAR PK │
                     │ email       VARCHAR U  │
                     │ password    VARCHAR    │
                     │ ...                    │
                     └────────────────────────┘
```

## Security Measures

```
┌─────────────────────────────────────────────────────────┐
│              SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Email Enumeration Protection                       │
│     └─ Same response for valid/invalid emails          │
│                                                         │
│  2. Secure Token Generation                            │
│     └─ nanoid(64) = ~10^115 possible combinations      │
│                                                         │
│  3. Time-Limited Tokens                                │
│     └─ 1-hour expiration window                        │
│                                                         │
│  4. Single-Use Tokens                                  │
│     └─ Marked as "used" after password reset           │
│                                                         │
│  5. Password Hashing                                   │
│     └─ bcrypt with 12 salt rounds                      │
│                                                         │
│  6. Input Validation                                   │
│     ├─ Email format validation                         │
│     ├─ Password minimum length (8 chars)               │
│     └─ Password confirmation matching                  │
│                                                         │
│  7. Error Handling                                     │
│     └─ Generic messages (no info leakage)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Error Handling Matrix

```
┌─────────────────────┬──────────────┬─────────────────────────────┐
│  Scenario           │  HTTP Code   │  Response                   │
├─────────────────────┼──────────────┼─────────────────────────────┤
│ Valid email         │     200      │ "If an account exists..."   │
│ Invalid email       │     200      │ "If an account exists..."   │
│ Missing email       │     400      │ "Email is required"         │
│ Invalid token       │     400      │ "Invalid or expired token"  │
│ Expired token       │     400      │ "Invalid or expired token"  │
│ Used token          │     400      │ "Invalid or expired token"  │
│ Short password      │     400      │ "Password must be 8+ chars" │
│ Server error        │     500      │ "Failed to process..."      │
└─────────────────────┴──────────────┴─────────────────────────────┘
```

## Token Lifecycle

```
┌──────────┐
│  CREATED │  ← User requests password reset
└────┬─────┘
     │
     │  expires_at = NOW() + 1 hour
     │  used_at = NULL
     │
     ▼
┌──────────┐     Time passes       ┌──────────┐
│  ACTIVE  │─────────────────────▶│ EXPIRED  │
└────┬─────┘    (> 1 hour)        └──────────┘
     │                                  │
     │                                  │
     │  User resets password            │  Cannot be used
     │                                  │  (validation fails)
     ▼                                  │
┌──────────┐                           │
│   USED   │                           │
└──────────┘                           │
     │                                  │
     │                                  │
     └──────────────┬───────────────────┘
                    ▼
              ┌──────────┐
              │ CLEANUP  │  ← Cron job deletes old tokens
              └──────────┘     (recommended: daily)
```

## API Endpoints

### POST /api/auth/forgot-password

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Response (400):**
```json
{
  "error": "Email is required"
}
```

---

### POST /api/auth/reset-password

**Request:**
```json
{
  "token": "L-C2HtnEuISTQEugltMGB08agXeRvty3zv17MgDCbIc...",
  "password": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

**Response (400):**
```json
{
  "error": "Invalid or expired reset token"
}
```
or
```json
{
  "error": "Password must be at least 8 characters long"
}
```

---

## Environment Configuration

Required variables in `.env`:

```bash
# Required for password reset emails
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
EMAIL_FROM=SynqForge <noreply@yourdomain.com>

# Required for reset link generation
NEXTAUTH_URL=https://yourdomain.com

# Required for authentication
NEXTAUTH_SECRET=your-secret-key-here
```

---

## Production Recommendations

1. **Rate Limiting** (Critical)
   - 5 requests per email per hour
   - 10 requests per IP per hour

2. **Token Cleanup** (Important)
   ```sql
   -- Run daily via cron
   DELETE FROM password_reset_tokens
   WHERE created_at < NOW() - INTERVAL '7 days';
   ```

3. **Monitoring** (Recommended)
   - Track reset request frequency
   - Alert on unusual patterns
   - Monitor email delivery rates

4. **Audit Logging** (Recommended)
   - Log all password reset activities
   - Include IP address and user agent
   - Store in `activities` table
