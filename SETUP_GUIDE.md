a# SynqForge Password Reset Setup Guide

This complete guide will walk you through setting up email-based password reset for SynqForge using Resend, and deploying to GitHub/Vercel.

---
a
## 📧 Part 1: Set Up Resend Email Service

### Step 1: Create a Resend Account

1. Go to **[resend.com](https://resend.com)**
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with your email (free tier includes **3,000 emails/month** - perfect for getting started!)
4. Verify your email address

### Step 2: Get Your API Key

1. Log in to **[Resend dashboard](https://resend.com/login)**
2. Navigate to **"API Keys"** in the left sidebar
3. Click **"Create API Key"**
   - **Name:** `synqforge-dev` (for development) or `synqforge-production`
   - **Permission:** Full Access
4. **Copy the API key** - it starts with `re_...`
   - ⚠️ **IMPORTANT:** Save this somewhere safe! You can't see it again.
   - I recommend saving it in a password manager or secure note

### Step 3: Verify Your Domain (Optional for Development)

#### For Development/Testing:
- Use Resend's testing domain: `onboarding@resend.dev`
- Emails will only be delivered to your verified email address
- Perfect for testing before domain verification
- **This is fine for now - you can skip domain verification!**

#### For Production (Later):
1. Go to **"Domains"** in Resend dashboard
2. Click **"Add Domain"**
3. Enter your domain (e.g., `synqforge.com`)
4. Add DNS records as shown:
   - 1 SPF record
   - 3 DKIM records
5. Wait for verification (usually <5 minutes)
6. Once verified, send from `noreply@yourdomain.com`

---

## ⚙️ Part 2: Configure Environment Variables

### Step 1: Create Your `.env` File

```bash
# In your project root, copy the example file
cp .env.example .env
```

### Step 2: Edit `.env` - Add These Values

Open `.env` in your editor and update:

```bash
# ============================================
# DATABASE (you should already have this)
# ============================================
DATABASE_URL=postgresql://user:password@host:port/database

# ============================================
# NEXTAUTH CONFIGURATION
# ============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-this-with-command-below

# ============================================
# EMAIL CONFIGURATION (ADD THESE!)
# ============================================
RESEND_API_KEY=re_YourActualAPIKeyFromStep2
EMAIL_FROM=SynqForge <onboarding@resend.dev>

# Note: If you verified your own domain, change to:
# EMAIL_FROM=SynqForge <noreply@yourdomain.com>

# ============================================
# GOOGLE OAUTH (OPTIONAL - Leave empty for now)
# ============================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Step 3: Generate NEXTAUTH_SECRET

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output (it will look something like `xK3mP9qR...`) and paste it as your `NEXTAUTH_SECRET` value in `.env`.

---

## 🧪 Part 3: Test Password Reset Locally

### Step 1: Start Your Development Server

```bash
npm run dev
```

Wait for: ` ✓ Ready in...`

### Step 2: Test the Flow

1. **Open browser:** http://localhost:3000/auth/signin
2. **Click "Forgot password?"** link
3. **Enter your email address** (the one you used to sign up for Resend)
4. **Click "Send reset link"**
5. **Check your server console** - you should see:
   ```
   Reset URL (email not configured): http://localhost:3000/auth/reset-password?token=xxx
   ```
6. **Check your email inbox** - you should receive an email from Resend
7. **Click the reset link** in the email (or copy the URL from console)
8. **Enter new password twice**
9. **Verify you're redirected** to sign-in page
10. **Sign in with your new password**

### Step 3: Verify Email Delivery

If you don't see an email:
1. Check spam/junk folder
2. Check Resend dashboard > Logs for delivery status
3. Verify `RESEND_API_KEY` is correct in `.env`
4. Verify `EMAIL_FROM` uses `onboarding@resend.dev` domain

---

## 🚫 About Google OAuth (It's Optional!)

**Good news:** Google OAuth is already optional in SynqForge! Here's what happens:

- **Without Google credentials:** The "Continue with Google" button will appear on signin page, but clicking it won't work
- **For now:** Just ignore it and use email/password signin
- **To hide it:** You can remove the Google button from the signin page (instructions below)

### Remove Google Button from Signin Page (Optional)

If you want to hide the Google OAuth button:

1. Open `app/auth/signin/page.tsx`
2. Find and delete lines 63-75 (the Google button section)
3. Find and delete lines 77-84 (the "Or continue with email" divider)
4. Save the file

The signin page will now show only email/password fields!

---

## 📦 Part 4: Prepare for GitHub & Deployment

### Step 1: Add `.env` to `.gitignore`

Make sure `.env` is in your `.gitignore` (it should already be there):

```bash
# Check if .env is ignored
cat .gitignore | grep "\.env"
```

If it's not there, add it:

```bash
echo ".env" >> .gitignore
```

### Step 2: Commit Your Changes

```bash
# Add all password reset files
git add .

# Create commit
git commit -m "feat: Add password reset functionality with Resend email integration"

# Push to GitHub
git push origin main
```

### Step 3: Deploy to Vercel (Recommended)

#### A. Connect to Vercel

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Add New Project"**
3. **Import** your GitHub repository
4. Vercel will auto-detect Next.js

#### B. Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your production database URL |
| `NEXTAUTH_URL` | `https://yourdomain.vercel.app` |
| `NEXTAUTH_SECRET` | Same value from local `.env` |
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | `SynqForge <onboarding@resend.dev>` |

Leave Google OAuth variables empty unless you set them up.

#### C. Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Test password reset on your production URL

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] Database migration applied (`npm run db:push`)
- [ ] Resend API key added to `.env`
- [ ] `EMAIL_FROM` configured correctly
- [ ] `NEXTAUTH_SECRET` generated and set
- [ ] Password reset works locally
- [ ] Email delivery confirmed
- [ ] `.env` in `.gitignore`
- [ ] Changes pushed to GitHub
- [ ] Environment variables set in Vercel
- [ ] Production deployment tested

---

## 🐛 Troubleshooting

### "Missing API key" Error

**Problem:** Server crashes with "Missing API key. Pass it to the constructor `new Resend("re_123")`"

**Solution:**
1. Make sure `RESEND_API_KEY=re_...` is in your `.env` file
2. Restart your dev server (`Ctrl+C` then `npm run dev`)
3. Clear Next.js cache: `rm -rf .next` then `npm run dev`

### Emails Not Sending

**Check:**
1. `RESEND_API_KEY` is correct in `.env`
2. Email address is verified in Resend (for testing domain)
3. Check Resend dashboard > Logs for errors
4. Check spam folder

**Temporary workaround:**
- Copy the reset URL from server console logs
- Send it to user manually

### "Invalid or expired reset token"

**Causes:**
- Token expired (>1 hour old)
- Token already used
- User copied URL incorrectly

**Solution:**
- Request a new reset link

### Build Fails on Vercel

**Check:**
1. All environment variables are set in Vercel
2. Database is accessible from Vercel
3. Build logs for specific error message

---

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend React Email Templates](https://react.email/)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Password Reset Flow Diagram](./docs/password-reset-flow.md)
- [Full Validation Report](./PASSWORD_RESET_VALIDATION.md)

---

## 🎯 Quick Start Summary

If you just want to get started quickly:

```bash
# 1. Get Resend API key from resend.com

# 2. Create .env file
cp .env.example .env

# 3. Add to .env:
# RESEND_API_KEY=re_your_key_here
# EMAIL_FROM=SynqForge <onboarding@resend.dev>
# NEXTAUTH_SECRET=$(openssl rand -base64 32)

# 4. Start dev server
npm run dev

# 5. Test at http://localhost:3000/auth/signin
# Click "Forgot password?" and test the flow!
```

---

**Need help?** Check the [troubleshooting section](#-troubleshooting) above or review the detailed [validation report](./PASSWORD_RESET_VALIDATION.md).

### Update the Auth Configuration

<function_calls>
<invoke name="Read">
<parameter name="file_path">/Users/chrisrobertson/Desktop/synqforge/lib/auth/options.ts