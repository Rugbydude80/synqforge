# Subscription Tier System - Deployment Checklist

Complete checklist for deploying the SynqForge subscription tier validation system to production.

## ⚠️ Pre-Deployment Requirements

### Environment Variables

Ensure all environment variables are set in Vercel:

```bash
# Required
DATABASE_URL=postgresql://...  # Neon PostgreSQL connection string
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional (for testing)
TEST_DATABASE_URL=postgresql://...  # Separate test database
```

### Dependencies

```bash
# Verify all packages installed
npm install

# Check for vulnerabilities
npm audit

# Run type checking
npm run typecheck
```

## Phase 1: Database Migration

### 1.1 Backup Current Database

```bash
# Create backup before migration (via Vercel CLI)
vercel env pull .env.local
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1.2 Run Migration

```bash
# Apply migration script
npm run db:push

# OR manually via psql
psql $DATABASE_URL < db/migrations/0010_subscription_tier_enhancements.sql
```

### 1.3 Verify Migration

```sql
-- Check rollover columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace_usage' 
  AND column_name IN ('rollover_enabled', 'rollover_percentage', 'rollover_balance');

-- Expected: 3 rows

-- Check department_budgets table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'department_budgets';

-- Expected: 1 row

-- Check budget_reallocation_log table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'budget_reallocation_log';

-- Expected: 1 row
```

**✅ Migration Success Criteria:**
- [ ] All 3 rollover columns added to `workspace_usage`
- [ ] `department_budgets` table created with indexes
- [ ] `budget_reallocation_log` table created with indexes
- [ ] `workspace_usage_history.billing_period` column added
- [ ] `ai_generations.department` column added
- [ ] All views created (`v_subscription_summary`, etc.)
- [ ] Functions created (`calculate_rollover`)
- [ ] Triggers created (`trg_update_department_budget`)

## Phase 2: Data Migration & Seeding

### 2.1 Enable Rollover for Existing Core/Pro Users

```sql
-- Update existing Core/Pro plans to enable rollover
UPDATE workspace_usage wu
SET 
  rollover_enabled = true,
  rollover_percentage = 0.20,
  rollover_balance = 0
FROM organizations o
WHERE wu.organization_id = o.id
  AND o.plan IN ('core', 'pro')
  AND wu.rollover_enabled = false;

-- Verify update
SELECT 
  o.plan,
  COUNT(*) as orgs_updated
FROM workspace_usage wu
JOIN organizations o ON o.id = wu.organization_id
WHERE o.plan IN ('core', 'pro')
  AND wu.rollover_enabled = true
GROUP BY o.plan;

-- Expected:
-- core  | X
-- pro   | Y
```

### 2.2 Initialize Department Budgets for Enterprise

```sql
-- Example: Create department budgets for existing Enterprise customers
INSERT INTO department_budgets (id, organization_id, department_name, actions_limit, actions_used)
VALUES
  (gen_random_uuid()::text, 'enterprise-org-1', 'engineering', 50000, 0),
  (gen_random_uuid()::text, 'enterprise-org-1', 'sales', 10000, 0),
  (gen_random_uuid()::text, 'enterprise-org-1', 'marketing', 5000, 0);

-- Verify
SELECT * FROM department_budgets;
```

**✅ Data Migration Success Criteria:**
- [ ] All Core/Pro users have `rollover_enabled = true`
- [ ] Enterprise customers have department budgets configured
- [ ] No users lost existing usage data
- [ ] Historical usage preserved in `workspace_usage_history`

## Phase 3: Service Deployment

### 3.1 Run Test Suite

```bash
# Run all tests (requires TEST_DATABASE_URL)
npm run test

# Run specific subscription tests
npm run test tests/subscription-tier-validation.test.ts

# Expected: All tests pass ✅
```

### 3.2 Deploy to Vercel (Staging)

```bash
# Deploy to preview environment
vercel --prod=false

# Note the preview URL
# Example: https://synqforge-abc123.vercel.app
```

### 3.3 Smoke Testing (Staging)

Test each tier manually:

**Starter Plan:**
- [ ] Create new Starter account
- [ ] Generate 25 AI stories (should succeed)
- [ ] Attempt 26th story (should block with upgrade prompt)
- [ ] Verify trial features expire after 7 days

**Core Plan:**
- [ ] Upgrade Starter to Core
- [ ] Generate 300 stories
- [ ] Advance billing period (manually via DB)
- [ ] Verify 20 rollover actions (20% of 100 unused)
- [ ] Generate 420 stories next month (should succeed)

**Pro Plan:**
- [ ] Create Pro account
- [ ] Enable Smart Context feature
- [ ] Generate story with context (verify similar stories found)
- [ ] Enable Semantic Search
- [ ] Search for "authentication" (verify results)

**Team Plan:**
- [ ] Create Team account with 5 seats (15k actions)
- [ ] Have User A use 10k actions
- [ ] Have User B use 3k actions
- [ ] Verify remaining: 2k actions
- [ ] Check admin dashboard shows per-user breakdown
- [ ] Remove 2 seats (new limit: 13k)
- [ ] Verify over-limit state (13k used > 13k limit)

**Enterprise Plan:**
- [ ] Configure department budgets (eng: 50k, sales: 10k)
- [ ] Engineering uses 45k actions
- [ ] Reallocate 5k from sales to engineering
- [ ] Verify new limits (eng: 55k, sales: 5k)
- [ ] Check audit log shows reallocation entry

**✅ Smoke Test Success Criteria:**
- [ ] All 5 tiers function correctly
- [ ] Rollover calculations accurate (Core/Pro)
- [ ] Pooled sharing works (Team)
- [ ] Department budgets work (Enterprise)
- [ ] Upgrade prompts display correctly
- [ ] Feature gating enforced (Smart Context, Deep Reasoning)

## Phase 4: API Endpoint Testing

### 4.1 Test Endpoints

```bash
# Check Action Limit
curl -X POST https://synqforge-staging.vercel.app/api/subscriptions/check-limit \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "org-123"}'

# Expected:
# {"allowed": true, "remaining": 245}

# Get Feature Access
curl https://synqforge-staging.vercel.app/api/subscriptions/features?organizationId=org-123

# Expected:
# {
#   "hasSmartContext": true,
#   "hasDeepReasoning": false,
#   "hasSemanticSearch": true,
#   "canSplitToChildren": true,
#   "hasAdvancedGherkin": true
# }
```

**✅ API Success Criteria:**
- [ ] `/api/subscriptions/check-limit` returns correct limits
- [ ] `/api/subscriptions/features` returns correct feature flags
- [ ] `/api/admin/usage-breakdown` returns per-user data (Team+)
- [ ] `/api/admin/reallocate-budget` processes reallocations (Enterprise)
- [ ] All endpoints return proper HTTP status codes (200, 403, 429)

## Phase 5: Frontend Integration

### 5.1 Verify UI Components

- [ ] Action limit counter displays correctly
- [ ] Upgrade prompts appear when limit reached
- [ ] Feature toggles disabled for insufficient tier
- [ ] Plan comparison table shows correct features
- [ ] Billing page shows rollover balance (Core/Pro)
- [ ] Admin dashboard shows user breakdown (Team)
- [ ] Enterprise dashboard shows department budgets

### 5.2 Test User Flows

**Upgrade Flow:**
1. [ ] Starter → Core: Trial canceled, 400 actions granted immediately
2. [ ] Core → Pro: Rollover preserved, Smart Context enabled
3. [ ] Pro → Team: Upgrade prorated, pooled actions active

**Downgrade Flow:**
1. [ ] Pro → Core: Over-limit state handled, rollover cleared
2. [ ] Team → Pro: Pool disbanded, per-user limits enforced

**✅ Frontend Success Criteria:**
- [ ] All UI components render without errors
- [ ] Upgrade/downgrade flows work smoothly
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly

## Phase 6: Monitoring & Alerts

### 6.1 Configure Monitoring

```typescript
// Vercel Monitoring Dashboard
// - API endpoint latencies
// - Database query performance
// - Error rates

// Key Metrics:
// - checkActionLimit() p95 latency < 50ms ✅
// - calculateRollover() p95 latency < 100ms ✅
// - handleBillingPeriodReset() success rate > 99.9% ✅
```

### 6.2 Set Up Alerts

**Sentry (Error Tracking):**
```javascript
// lib/monitoring/subscription-monitors.ts

Sentry.addBreadcrumb({
  category: 'subscription',
  message: 'Action limit exceeded',
  level: 'warning',
  data: { organizationId, plan, remaining: 0 }
})
```

**Email Alerts:**
- [ ] Alert when organization reaches 90% of limit
- [ ] Alert when trial expires (send to org owner)
- [ ] Alert when over-limit state detected (Team plan seat removal)
- [ ] Alert when department budget reallocation fails

**Database Monitoring:**
```sql
-- Create view for at-risk organizations
CREATE VIEW v_at_risk_orgs AS
SELECT 
  o.id,
  o.name,
  o.plan,
  wu.tokens_used,
  wu.tokens_limit,
  ROUND((wu.tokens_used::DECIMAL / wu.tokens_limit) * 100, 1) AS usage_pct
FROM organizations o
JOIN workspace_usage wu ON wu.organization_id = o.id
WHERE (wu.tokens_used::DECIMAL / wu.tokens_limit) >= 0.90;

-- Schedule daily check
-- Send digest to ops@synqforge.com
```

**✅ Monitoring Success Criteria:**
- [ ] Sentry integrated and capturing errors
- [ ] Email alerts configured for critical events
- [ ] Database queries monitored (slow query log enabled)
- [ ] Grafana dashboard shows real-time metrics
- [ ] PagerDuty configured for on-call escalation

## Phase 7: Documentation

### 7.1 Internal Documentation

- [ ] `/docs/SUBSCRIPTION_TIERS.md` complete
- [ ] `/docs/API_REFERENCE.md` updated with new endpoints
- [ ] `/docs/DATABASE_SCHEMA.md` updated with new tables
- [ ] `/docs/TROUBLESHOOTING.md` includes common issues

### 7.2 Customer-Facing Documentation

- [ ] Help center article: "Understanding Your Plan Limits"
- [ ] Help center article: "How Rollover Works (Core/Pro)"
- [ ] Help center article: "Managing Team Action Pools"
- [ ] Help center article: "Enterprise Department Budgets"
- [ ] FAQ updated with new pricing questions

### 7.3 Support Team Training

- [ ] Train support on new tier features
- [ ] Create runbook for common issues
- [ ] Document escalation process for billing disputes
- [ ] Provide SQL queries for support debugging

**✅ Documentation Success Criteria:**
- [ ] All docs reviewed and approved
- [ ] Customer-facing content published to help center
- [ ] Support team trained (quiz score >90%)
- [ ] Runbook tested with sample scenarios

## Phase 8: Production Deployment

### 8.1 Final Pre-Flight Checks

```bash
# Verify environment variables
vercel env ls

# Run production build locally
npm run build

# Check bundle size
du -sh .next

# Run security audit
npm audit --production

# Verify Stripe webhook endpoint
curl https://api.synqforge.com/api/webhooks/stripe -I
# Expected: 200 OK or 405 Method Not Allowed (correct, POST-only)
```

### 8.2 Deploy to Production

```bash
# Deploy to production
vercel --prod

# Verify deployment
curl https://api.synqforge.com/api/health

# Expected: {"status": "ok", "version": "2.4.0"}
```

### 8.3 Post-Deployment Verification

**Immediate (0-15 minutes):**
- [ ] Health check passes
- [ ] Homepage loads without errors
- [ ] Login flow works
- [ ] Create new Starter account (end-to-end test)
- [ ] Generate 1 AI story (smoke test)

**Short-term (15 minutes - 2 hours):**
- [ ] Monitor error rates (should be <0.1%)
- [ ] Check API latencies (p95 <200ms)
- [ ] Verify no database deadlocks
- [ ] Confirm Stripe webhooks processing

**Long-term (2-24 hours):**
- [ ] Monitor billing period resets (midnight UTC)
- [ ] Verify rollover calculations accurate
- [ ] Check trial expirations processed
- [ ] Confirm no customer support tickets about tiers

**✅ Production Success Criteria:**
- [ ] Zero downtime during deployment
- [ ] No increase in error rates
- [ ] All health checks passing
- [ ] Customer satisfaction maintained

## Phase 9: Customer Communication

### 9.1 Announcement Email

**Subject:** Introducing New Pricing Tiers & Rollover Actions

**Recipients:** All current users

**Content:**
- Highlight new rollover feature (Core/Pro)
- Explain Team plan pooled actions
- Announce Enterprise department budgets
- Reassure no price changes for existing customers
- Link to help center articles

### 9.2 In-App Notifications

- [ ] Banner on dashboard: "Your plan now includes rollover!"
- [ ] Tooltip on action counter: "Unused actions roll over 20%"
- [ ] Upgrade CTA when approaching limit

### 9.3 Social Media Posts

- [ ] Twitter: "We've listened! Introducing rollover actions 🎉"
- [ ] LinkedIn: "SynqForge pricing now more flexible for teams"
- [ ] Product Hunt: "SynqForge 2.0 - Better pricing, more features"

**✅ Communication Success Criteria:**
- [ ] Announcement email sent (100% delivery rate)
- [ ] In-app notifications displayed to all users
- [ ] Social media posts scheduled
- [ ] Press release published (if applicable)

## Phase 10: Rollback Plan

### 10.1 Rollback Triggers

**Initiate rollback if:**
- Error rate exceeds 5% for >10 minutes
- P95 latency exceeds 1000ms for >5 minutes
- Database CPU >90% for >5 minutes
- More than 10 customer complaints about billing errors

### 10.2 Rollback Procedure

```bash
# 1. Revert Vercel deployment
vercel rollback

# 2. Restore database backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 3. Clear Redis cache
redis-cli FLUSHALL

# 4. Verify rollback
curl https://api.synqforge.com/api/health
```

### 10.3 Post-Rollback

- [ ] Notify customers via status page
- [ ] Post-mortem meeting within 24 hours
- [ ] Document root cause
- [ ] Create action items for fixes
- [ ] Schedule re-deployment date

**✅ Rollback Success Criteria:**
- [ ] System restored to previous state
- [ ] No data loss
- [ ] Customers notified within 30 minutes
- [ ] Post-mortem completed

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Lead Engineer** | __________ | ___/___/___ | __________ |
| **QA Lead** | __________ | ___/___/___ | __________ |
| **Product Manager** | __________ | ___/___/___ | __________ |
| **DevOps** | __________ | ___/___/___ | __________ |
| **CTO** | __________ | ___/___/___ | __________ |

---

## Quick Command Reference

```bash
# Database Migration
npm run db:push

# Run Tests
npm run test tests/subscription-tier-validation.test.ts

# Deploy to Staging
vercel --prod=false

# Deploy to Production
vercel --prod

# Health Check
curl https://api.synqforge.com/api/health

# Rollback
vercel rollback

# Verify Rollover Enabled
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workspace_usage WHERE rollover_enabled = true;"

# Check Recent Errors
vercel logs --since 1h --prod

# Monitor Real-Time Metrics
vercel --prod --logs
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-29  
**Next Review:** After first production deployment

**Related Documents:**
- [Subscription Tiers Guide](/docs/SUBSCRIPTION_TIERS.md)
- [API Reference](/docs/API_REFERENCE.md)
- [Database Schema](/docs/DATABASE_SCHEMA.md)
- [Stripe Setup](/STRIPE_PRODUCTS_SETUP.md)

