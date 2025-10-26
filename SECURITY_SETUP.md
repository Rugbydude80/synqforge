# 🔐 Security Setup Guide - URGENT ACTION REQUIRED

## ⚠️ CRITICAL: Your API Keys Have Been Exposed

Your `.env` and `.env.local` files containing **LIVE CREDENTIALS** were committed to your repository. These keys are now compromised and must be rotated immediately.

---

## 🚨 IMMEDIATE ACTIONS (Do This NOW)

### Step 1: Rotate Stripe Keys (HIGHEST PRIORITY)

1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
2. Click "Reveal live key token"
3. Click "Roll key" to generate a new secret key
4. Save the new key securely
5. Update in Vercel environment variables (DO NOT commit to git)

```bash
# Old key (COMPROMISED): sk_live_[REDACTED]
# Generate new key in Stripe dashboard and use that
```

### Step 2: Rotate Webhook Secret

1. In Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint
3. Click "..." → "Roll signing secret"
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel

### Step 3: Rotate Other API Keys

#### Anthropic (Claude)
1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Delete compromised key
3. Create new API key
4. Update `ANTHROPIC_API_KEY` in Vercel

#### OpenRouter
1. Go to [OpenRouter Keys](https://openrouter.ai/keys)
2. Revoke old key
3. Generate new key
4. Update `OPENROUTER_API_KEY` in Vercel

#### Resend (Email)
1. Go to [Resend API Keys](https://resend.com/api-keys)
2. Delete old key
3. Create new key
4. Update `RESEND_API_KEY` in Vercel

#### Upstash Redis
1. Go to [Upstash Console](https://console.upstash.com/redis)
2. Select your database
3. Regenerate REST Token
4. Update both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

#### Ably
1. Go to [Ably Dashboard](https://ably.com/accounts)
2. Navigate to your app → API Keys
3. Revoke compromised key
4. Generate new key
5. Update `ABLY_API_KEY` in Vercel

#### GitHub OAuth
1. Go to [GitHub OAuth Apps](https://github.com/settings/developers)
2. Find your application
3. Generate new client secret
4. Update `GITHUB_CLIENT_SECRET` in Vercel

### Step 4: Generate New NextAuth Secret

```bash
# Generate a new secret
openssl rand -base64 32

# Update NEXTAUTH_SECRET in Vercel with the output
```

### Step 5: Update Database Password

This is more complex - coordinate with your team:

1. Create new database user in Neon dashboard
2. Grant same permissions
3. Update `DATABASE_URL` in Vercel
4. Test connection
5. Delete old database user

---

## 🔧 Fix Environment Configuration

### Remove Sensitive Files from Git

```bash
# IMPORTANT: Remove .env files from git
git rm --cached .env .env.local

# Commit the removal
git commit -m "Remove sensitive environment files from repository"

# Force push to remote (if needed)
git push origin main --force-with-lease
```

### Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add ALL variables from `.env.example`
5. Use separate values for Production, Preview, and Development

**NEVER commit `.env*` files again!**

---

## ✅ Post-Rotation Checklist

After rotating all keys:

- [ ] All Stripe keys rotated (Live Secret Key + Webhook Secret)
- [ ] Anthropic API key rotated
- [ ] OpenRouter API key rotated
- [ ] Resend API key rotated
- [ ] Upstash Redis token rotated
- [ ] Ably API key rotated
- [ ] GitHub OAuth secret rotated
- [ ] NextAuth secret regenerated
- [ ] Database credentials updated (if needed)
- [ ] All new keys added to Vercel environment variables
- [ ] `.env` and `.env.local` removed from git
- [ ] Application tested with new credentials
- [ ] Old keys confirmed revoked in all services

---

## 🛡️ Future Best Practices

### DO:
✅ Use Vercel environment variables for all secrets
✅ Keep separate environments (dev, staging, prod) with different keys
✅ Use Stripe TEST keys in development
✅ Rotate secrets every 90 days
✅ Use `.env.example` for documentation (no real values)
✅ Enable 2FA on all service accounts

### DON'T:
❌ Commit `.env` files to git (they're in `.gitignore` but were committed)
❌ Share secrets via email, Slack, or other insecure channels
❌ Use production keys in development
❌ Store secrets in plain text on your computer
❌ Reuse secrets across different services

---

## 🔍 Verify Git History is Clean

After removing `.env` files, verify they don't exist in history:

```bash
# Search git history for sensitive patterns
git log --all --full-history --source -- .env .env.local

# If files exist in history, you may need to use git-filter-repo
# to completely remove them from history
```

For complete removal from history:
```bash
# Install git-filter-repo (if not installed)
# macOS: brew install git-filter-repo
# Ubuntu: apt-get install git-filter-repo

# Remove files from entire history
git filter-repo --path .env --path .env.local --invert-paths

# Force push (WARNING: This rewrites history!)
git push origin --force --all
```

**⚠️ Note:** Rewriting git history affects all team members. Coordinate with your team before doing this.

---

## 📞 Need Help?

If you need assistance with key rotation or security hardening:

1. Consider hiring a security consultant
2. Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
3. Review Vercel's [environment variables documentation](https://vercel.com/docs/concepts/projects/environment-variables)
4. Check each service's security best practices documentation

---

## ⏱️ Estimated Time

- **Key Rotation:** 30-45 minutes
- **Vercel Configuration:** 15 minutes  
- **Testing:** 15 minutes
- **Git History Cleanup:** 30 minutes (optional but recommended)

**Total:** ~1.5-2 hours

---

**Status:** ⚠️ IMMEDIATE ACTION REQUIRED  
**Priority:** 🔴 CRITICAL  
**Due:** As soon as possible (within 24 hours)

Once complete, update `PRODUCTION_READINESS_CHECKLIST.md` to mark security items as complete.

