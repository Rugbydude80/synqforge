# 🔐 Google OAuth Setup Guide

Your application currently has placeholder values for Google OAuth. Follow this guide to set it up properly.

---

## Step 1: Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"

---

## Step 2: Configure OAuth Consent Screen

Before creating OAuth credentials, you must configure the consent screen:

1. Click "OAuth consent screen" in the left sidebar
2. Select **External** (unless you have a Google Workspace account)
3. Fill in the required information:
   - **App name:** SynqForge
   - **User support email:** Your email
   - **App logo:** (Optional) Upload your logo
   - **Application home page:** https://synqforge.com (or your domain)
   - **Application privacy policy:** https://synqforge.com/privacy
   - **Application terms of service:** https://synqforge.com/terms
   - **Authorized domains:**
     - synqforge.com
     - vercel.app (for preview deployments)
   - **Developer contact information:** Your email

4. Click "Save and Continue"

5. **Scopes:** Click "Add or Remove Scopes"
   - Add these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Click "Update" then "Save and Continue"

6. **Test users:** (for development)
   - Add email addresses that can test the OAuth flow
   - Click "Save and Continue"

7. Click "Back to Dashboard"

---

## Step 3: Create OAuth Credentials

1. Click "Credentials" in the left sidebar
2. Click "Create Credentials" → "OAuth client ID"
3. Select **Web application**
4. Configure:

   **Name:** SynqForge Web Application

   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://localhost:3001
   https://synqforge.com
   https://www.synqforge.com
   https://*.vercel.app
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3001/api/auth/callback/google
   https://synqforge.com/api/auth/callback/google
   https://www.synqforge.com/api/auth/callback/google
   https://*.vercel.app/api/auth/callback/google
   ```

5. Click "Create"

6. **Save your credentials:**
   - Copy the **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - Copy the **Client secret** (looks like: `GOCSPX-abc123xyz`)

---

## Step 4: Configure Environment Variables

### For Development (Local)

Create/update `.env.local`:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
```

### For Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
   ```
5. Select "Production" environment
6. Click "Save"

---

## Step 5: Update NextAuth Configuration

Your NextAuth configuration should already include Google (located in `lib/auth/options.ts`). Verify it looks like this:

```typescript
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // ... other providers
  ],
  // ... rest of config
}
```

---

## Step 6: Test OAuth Flow

### Testing Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:3000/auth/signin

3. Click "Sign in with Google"

4. You should see the Google OAuth consent screen

5. If using an external user type, you may see a warning that the app is not verified. Click "Advanced" → "Go to SynqForge (unsafe)" for testing

6. Grant permissions

7. You should be redirected back to your app and logged in

### Testing in Production

1. Deploy to Vercel

2. Navigate to: https://synqforge.com/auth/signin

3. Test the Google sign-in flow

4. Verify you can log in successfully

---

## Step 7: Verify App (Production)

For production use, you should verify your app to remove the "unverified app" warning:

1. In Google Cloud Console → OAuth consent screen
2. Click "Publish App"
3. Click "Prepare for verification"
4. Complete the verification process (may take 4-6 weeks)

**Note:** You can use the app in "Testing" mode with up to 100 test users before verification.

---

## Troubleshooting

### "redirect_uri_mismatch" Error

**Problem:** The redirect URI doesn't match what's configured in Google Console

**Solution:**
1. Check the error message for the redirect URI it's trying to use
2. Add that exact URI to "Authorized redirect URIs" in Google Console
3. Wait a few minutes for changes to propagate

### "invalid_client" Error

**Problem:** Client ID or Secret is incorrect

**Solution:**
1. Verify the Client ID and Secret in your environment variables
2. Make sure there are no extra spaces or newlines
3. Regenerate credentials in Google Console if needed

### "access_denied" Error

**Problem:** User denied permission or scope issues

**Solution:**
1. Verify the scopes in your OAuth consent screen
2. Check that the user is in the test users list (if in Testing mode)
3. Have the user clear browser cache and try again

### "This app isn't verified" Warning

**Problem:** App is in Testing mode

**Solution:**
1. For development: Click "Advanced" → "Go to SynqForge (unsafe)"
2. For production: Complete the app verification process
3. Or add users to the test users list

---

## Security Best Practices

1. ✅ Never commit Client Secret to git
2. ✅ Use different OAuth apps for development and production
3. ✅ Keep the Client Secret in Vercel environment variables only
4. ✅ Regularly review authorized domains and redirect URIs
5. ✅ Monitor OAuth usage in Google Cloud Console
6. ✅ Rotate Client Secret every 90 days

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth Google Provider Docs](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Status after setup:** ✅ Google OAuth Configured  
**Time required:** 15-20 minutes  
**Difficulty:** Easy

Once complete, remove placeholder values from `.env` and test the complete authentication flow.

