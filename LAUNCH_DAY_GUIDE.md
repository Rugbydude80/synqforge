# 🚀 Launch Day Execution Guide

## Overview

This guide provides a comprehensive checklist and automation scripts for deploying SynqForge to production. Total estimated time: **90 minutes**.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Stripe CLI installed: `brew install stripe/stripe-cli/stripe`
- [ ] Access to production environment variables
- [ ] Database connection details (Neon PostgreSQL)
- [ ] Domain configured: `synqforge.com`

---

## 📋 Quick Start

### Option 1: Automated Script (Recommended)

Run the comprehensive launch script that guides you through all phases:

```bash
chmod +x scripts/launch-day-checklist.sh
./scripts/launch-day-checklist.sh
```

This script will:
1. ✅ Verify all environment variables
2. ✅ Test local build
3. ✅ Check database connection
4. ✅ Verify Stripe webhook
5. ✅ Deploy to Vercel production
6. ✅ Run smoke tests
7. ✅ Generate launch report

### Option 2: Manual Execution

Follow the phase-by-phase instructions below.

---

## Phase 1: Pre-Deployment Checks (30 minutes)

### 1.1 Environment Variables Verification

```bash
# List production environment variables
vercel env ls production
```

**Required Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgres://user:pass@host/db` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `STRIPE_SECRET_KEY` | Stripe live secret key (NOT test) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | `https://synqforge.com` |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | `A...==` |

**Add missing variables:**

```bash
vercel env add DATABASE_URL production
# Paste value when prompted
```

### 1.2 Local Build Test

```bash
# TypeScript compilation
npm run typecheck

# Production build
npm run build
```

**Expected:** No errors

### 1.3 Database Connection Test

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Verify critical tables exist
psql $DATABASE_URL -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'workspace_usage', 'stripe_webhook_logs', 'users')
"
```

**Expected:** All 4 tables listed

### 1.4 Stripe Webhook Verification

```bash
# List webhooks
stripe webhooks list
```

**Verify:**
- [ ] Webhook exists for `https://synqforge.com/api/webhooks/stripe`
- [ ] Events enabled: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`

**Create webhook if missing:**

```bash
stripe webhook_endpoints create \
  --url https://synqforge.com/api/webhooks/stripe \
  --enabled-events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed
```

---

## Phase 2: Deployment (15 minutes)

### 2.1 Deploy to Production

```bash
# Deploy to production
vercel --prod

# Wait for deployment to complete
# Vercel will show: ✅ Production: https://synqforge.com
```

**Alternative: Canary Deployment (10% traffic)**

For safer rollout, deploy to 10% of traffic first:

```bash
vercel --prod --percent=10
```

Monitor for 30 minutes, then:

```bash
vercel promote <deployment-url>
```

### 2.2 Verify Deployment Health

```bash
# Test health endpoint
curl https://synqforge.com/api/health | jq '.'
```

**Expected Response:**

```json
{
  "timestamp": "2025-10-29T...",
  "status": "ok",
  "version": "1.0.0",
  "uptime": 123.45,
  "services": {
    "database": "ok",
    "redis": "ok",
    "ai": "configured"
  },
  "environment": "production",
  "responseTime": "45ms"
}
```

**Status Codes:**
- `200`: All systems operational
- `503`: Critical service down (database)

---

## Phase 3: Smoke Tests (30 minutes)

### 3.1 Authentication Flow

```bash
# Test unauthenticated redirect
curl -I https://synqforge.com/dashboard
```

**Expected:** `307` redirect to `/auth/signin`

### 3.2 Manual Test Checklist

#### Test 1: User Sign Up

1. Visit: https://synqforge.com/auth/signup
2. Create test account: `test+launch@synqforge.com`
3. Verify email confirmation works
4. ✅ Can access dashboard

#### Test 2: Organization Creation

1. Create new organization
2. Verify default tier:

```bash
psql $DATABASE_URL -c "
  SELECT 
    o.name,
    o.subscription_tier,
    wu.tokens_limit
  FROM organizations o
  JOIN workspace_usage wu ON wu.organization_id = o.id
  WHERE o.id = '<your-org-id>'
"
```

**Expected:** `subscription_tier = 'starter'`, `tokens_limit = 25`

#### Test 3: AI Story Generation

1. Create project
2. Generate single story
3. Verify token usage:

```bash
psql $DATABASE_URL -c "
  SELECT 
    organization_id,
    tokens_used,
    tokens_limit
  FROM workspace_usage 
  WHERE organization_id = '<your-org-id>'
"
```

**Expected:** `tokens_used = 1`

#### Test 4: Token Limit Enforcement

1. Generate 25 stories (exhaust limit)
2. Attempt 26th generation
3. **Expected Response:**

```json
{
  "error": "Token limit exceeded",
  "code": "TOKEN_LIMIT_EXCEEDED",
  "current": 25,
  "limit": 25,
  "upgrade_url": "/pricing"
}
```

**HTTP Status:** `402 Payment Required`

#### Test 5: PII Detection

Try prompt with PII:

```bash
curl -X POST https://synqforge.com/api/ai/generate-single-story \
  -H "Cookie: <session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project-id>",
    "prompt": "As a user with SSN 123-45-6789, I want to login"
  }'
```

**Expected Response:**

```json
{
  "error": "PII detected in prompt",
  "code": "PII_DETECTED",
  "details": ["SSN"]
}
```

**HTTP Status:** `400 Bad Request`

### 3.3 Stripe Webhook Test

1. Visit: https://dashboard.stripe.com/webhooks
2. Click webhook for `synqforge.com`
3. Click "Send test event"
4. Select: `customer.subscription.created`
5. Click "Send test webhook"

**Verify webhook logged:**

```bash
psql $DATABASE_URL -c "
  SELECT 
    event_type,
    status,
    error_message,
    created_at
  FROM stripe_webhook_logs 
  ORDER BY created_at DESC 
  LIMIT 1
"
```

**Expected:** `status = 'success'`

---

## Phase 4: Monitoring Setup (15 minutes)

After successful deployment, set up ongoing monitoring:

```bash
chmod +x scripts/post-launch-monitoring-setup.sh
./scripts/post-launch-monitoring-setup.sh
```

This will configure:
1. ⏰ Daily health check cron job
2. 🚨 Sentry alert recommendations
3. 📊 Vercel Analytics review
4. 🔔 Uptime monitoring suggestions

### Manual Monitoring Setup

#### 4.1 Daily Health Check Cron

```bash
# Add to crontab
crontab -e

# Add line (runs daily at 9 AM):
0 9 * * * /path/to/synqforge/scripts/daily-health-check.sh | mail -s "SynqForge Health" you@email.com
```

#### 4.2 Sentry Alerts

Configure in Sentry dashboard: https://sentry.io/settings/projects/synqforge/alerts/

**Recommended Alerts:**

| Alert Name | Condition | Window | Action |
|------------|-----------|--------|--------|
| High Error Rate | Error rate > 5% | 15 min | Slack/Email |
| Webhook Failures | > 3 failures | 1 hour | PagerDuty |
| Database Timeouts | Query > 5s | 5 min | Email |
| Subscription Errors | Tag: subscription | 15 min | Email |

#### 4.3 Uptime Monitoring

Set up external monitoring (recommended: UptimeRobot):

**Monitors to Create:**

| Endpoint | Interval | Expected |
|----------|----------|----------|
| `https://synqforge.com/api/health` | 5 min | HTTP 200 |
| `https://synqforge.com/` | 5 min | HTTP 200 |
| `https://synqforge.com/dashboard` | 10 min | HTTP 307 |

---

## 🎯 Launch Checklist

### Pre-Launch

- [ ] All environment variables verified
- [ ] Local build successful
- [ ] Database connection tested
- [ ] Stripe webhook configured
- [ ] DNS configured for `synqforge.com`
- [ ] SSL certificate valid

### Deployment

- [ ] Deployed to production
- [ ] Health endpoint returns 200
- [ ] No critical errors in logs

### Post-Deployment

- [ ] Authentication flow tested
- [ ] User signup works
- [ ] Organization creation verified
- [ ] AI generation successful
- [ ] Token limits enforced
- [ ] PII detection working
- [ ] Stripe webhook tested
- [ ] Monitoring configured

---

## 📊 Production URLs

| Service | URL |
|---------|-----|
| **Production App** | https://synqforge.com |
| **Health Check** | https://synqforge.com/api/health |
| **Dashboard** | https://synqforge.com/dashboard |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Sentry Dashboard** | https://sentry.io |
| **Stripe Dashboard** | https://dashboard.stripe.com |
| **Neon Console** | https://console.neon.tech |

---

## 🚨 Troubleshooting

### Deployment Failed

```bash
# Check deployment logs
vercel logs --follow

# Verify environment variables
vercel env ls production

# Redeploy
vercel --prod --force
```

### Health Check Failing

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
redis-cli -u $UPSTASH_REDIS_REST_URL ping

# View application logs
vercel logs --follow
```

### Webhook Not Working

```bash
# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Check webhook logs
stripe webhook_endpoints list
```

### High Error Rate

```bash
# Check Sentry for errors
open https://sentry.io/issues/

# View recent errors in database
psql $DATABASE_URL -c "
  SELECT * FROM logs 
  WHERE level = 'error' 
  ORDER BY created_at DESC 
  LIMIT 10
"
```

---

## 📞 Emergency Rollback

If critical issues arise:

```bash
# Rollback to previous deployment
vercel rollback

# Or specify deployment
vercel rollback <deployment-url>
```

---

## 📚 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs/deployments)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Sentry Error Monitoring](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## ✅ Post-Launch Monitoring

### First 24 Hours

- [ ] Check error rate every 2 hours
- [ ] Monitor webhook success rate
- [ ] Review Vercel Analytics
- [ ] Watch for unusual traffic patterns

### First Week

- [ ] Review daily health check emails
- [ ] Check Sentry error trends
- [ ] Monitor database performance
- [ ] Verify billing is working correctly

### First Month

- [ ] Complete GDPR compliance implementation
- [ ] Optimize slow queries
- [ ] Review and refine alert thresholds
- [ ] Plan next feature releases

---

**Last Updated:** October 29, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Launch

