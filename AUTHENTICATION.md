# Authentication Architecture

## Overview

SynqForge uses **NextAuth.js v4** with JWT session strategy for authentication, secured by production-ready middleware.

## Architecture Components

### 1. NextAuth Configuration
**File**: [lib/auth/options.ts](lib/auth/options.ts)

- **Session Strategy**: JWT (stateless, scalable)
- **Session Duration**: 30 days
- **Providers**:
  - **Credentials Provider**: Email/password with bcrypt hashing
  - **Google OAuth**: Social login integration

### 2. Authentication Middleware
**File**: [middleware.ts](middleware.ts)

The middleware provides **production-ready route protection** using JWT verification:

#### How It Works:
1. **Public Routes** - Accessible without authentication:
   - `/` (landing page)
   - `/auth/signin`, `/auth/signup`
   - `/auth/error`, `/auth/forgot-password`, `/auth/reset-password`
   - `/api/auth/*` (NextAuth API routes)

2. **Protected Routes** - Require valid JWT token:
   - All other routes (dashboard, projects, stories, etc.)
   - Protected API endpoints

3. **Authentication Flow**:
   ```
   Request → Middleware Check → JWT Validation
      ↓              ↓                 ↓
   Public?      Has Token?        Valid?
      ↓              ↓                 ↓
    Allow      Redirect to      Allow Access
              /auth/signin
   ```

#### Key Features:
- ✅ **Edge Runtime Compatible** - Works with Next.js 15 and Turbopack
- ✅ **No Database Calls** - JWT verification only, fast and scalable
- ✅ **Automatic Redirects** - Preserves callback URL for post-login navigation
- ✅ **Error Handling** - Graceful fallback to signin on any auth errors

### 3. Session Management

#### JWT Token Structure:
```typescript
{
  id: string              // User ID
  email: string          // User email
  role: string           // User role (admin, manager, member, viewer)
  organizationId: string // Organization ID
  organizationName: string // Organization name
}
```

#### Accessing Session Data:

**Server Components**:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

const session = await getServerSession(authOptions)
if (!session) {
  redirect('/auth/signin')
}
// session.user contains id, email, role, organizationId, etc.
```

**Client Components**:
```typescript
import { useSession } from 'next-auth/react'

const { data: session, status } = useSession()
if (status === 'loading') return <div>Loading...</div>
if (status === 'unauthenticated') redirect('/auth/signin')
// session.user contains all user data
```

**API Routes**:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Use session.user.id, session.user.organizationId, etc.
}
```

## Configuration Requirements

### Environment Variables

```bash
# NextAuth Configuration
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"    # Your app URL

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Database
DATABASE_URL="postgresql://..."
```

## Security Best Practices

### ✅ Current Implementation:
1. **JWT-based sessions** - No server-side session storage needed
2. **Bcrypt password hashing** - Secure password storage
3. **HTTPS enforcement** - In production (handled by platform)
4. **CSRF protection** - Built into NextAuth
5. **Secure cookies** - HTTP-only, SameSite=Lax
6. **Token expiration** - 30-day automatic expiry
7. **Middleware protection** - All routes protected by default

### Production Checklist:
- [x] JWT secret configured (`NEXTAUTH_SECRET`)
- [x] HTTPS enabled (Vercel handles this)
- [x] Password hashing implemented (bcrypt)
- [x] Middleware authentication active
- [x] Session expiration configured
- [ ] Rate limiting on auth endpoints (TODO: Add Upstash rate limiting)
- [ ] Account lockout after failed attempts (TODO: Implement)
- [ ] 2FA/MFA support (TODO: Future enhancement)

## Testing Authentication

### Manual Testing:
1. **Public Routes** - Should load without login:
   ```bash
   curl http://localhost:3000/
   curl http://localhost:3000/auth/signin
   ```

2. **Protected Routes** - Should redirect to signin:
   ```bash
   curl -L http://localhost:3000/dashboard
   # Should redirect to /auth/signin?callbackUrl=/dashboard
   ```

3. **With Authentication** - Set session cookie:
   ```bash
   # After logging in via browser, copy cookie
   curl -H "Cookie: next-auth.session-token=XXX" http://localhost:3000/dashboard
   ```

### Automated Testing:
```typescript
// Example test with @testing-library
import { render, screen } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

test('protected page requires auth', () => {
  render(
    <SessionProvider session={null}>
      <Dashboard />
    </SessionProvider>
  )
  expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
})
```

## Troubleshooting

### Common Issues:

1. **Middleware not running**:
   - Check `middleware.ts` is in project root
   - Verify matcher pattern in config
   - Restart dev server

2. **"NEXTAUTH_SECRET missing"**:
   - Generate: `openssl rand -base64 32`
   - Add to `.env` file
   - Restart server

3. **Infinite redirect loops**:
   - Check signin page is in `publicRoutes` list
   - Verify JWT secret matches between encode/decode
   - Clear browser cookies

4. **Session not persisting**:
   - Check cookie settings in browser
   - Verify `NEXTAUTH_URL` matches your domain
   - Ensure HTTPS in production

## Migration from next-auth Middleware

**Old Approach** (Next.js 14):
```typescript
import { withAuth } from 'next-auth/middleware'
export default withAuth({ /* config */ })
```

**New Approach** (Next.js 15 + Turbopack):
```typescript
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.redirect('/auth/signin')
  }
  return NextResponse.next()
}
```

**Why?** The `withAuth` wrapper has Edge Runtime compatibility issues with Next.js 15. Using `getToken` directly is more reliable and works with Turbopack.

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Middleware Guide](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
