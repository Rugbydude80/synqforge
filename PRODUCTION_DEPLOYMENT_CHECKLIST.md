# 🚀 Production Deployment Checklist - AI Context Level Feature

## Status: READY FOR DEPLOYMENT ✅

**Feature:** AI Context Level with Tier-Based Access Control  
**Date:** November 10, 2025  
**Deployment Target:** Production

---

## Pre-Deployment Checklist

### ✅ 1. Database Migration
- [ ] **Run migration:** `db/migrations/0005_add_ai_actions_tracking.sql`
  ```bash
  npm run db:migrate
  ```
- [ ] **Verify tables created:**
  - `ai_action_usage`
  - `ai_action_rollover`
- [ ] **Verify indexes created**
- [ ] **Backup database before migration**

### ✅ 2. Environment Variables
- [ ] **Verify OpenRouter API key** (`OPENROUTER_API_KEY`)
- [ ] **Verify Stripe keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [ ] **Verify database connection** (`DATABASE_URL`)
- [ ] **Check all required env vars are set**

### ✅ 3. Code Review
- [ ] **AI Context Actions Service** (`lib/services/ai-context-actions.service.ts`)
- [ ] **API Endpoint Updates** (`app/api/ai/generate-single-story/route.ts`)
- [ ] **User Data Endpoint** (`app/api/ai/context-level/user-data/route.ts`)
- [ ] **UI Integration** (`components/story-form-modal.tsx`)
- [ ] **Usage Dashboard** (`components/ai/AIActionsUsageDashboard.tsx`)
- [ ] **All linter errors resolved** ✅

### ✅ 4. Tier Configuration Validation
- [ ] **Starter Plan:**
  - 25 AI actions/month
  - Minimal context level only
  - 1 seat max
- [ ] **Core Plan:**
  - 400 AI actions/month
  - Minimal + Standard
  - 20% rollover
  - 1 seat max
- [ ] **Pro Plan:**
  - 800 AI actions/month
  - Minimal + Standard + Comprehensive
  - 20% rollover
  - 1-4 seats
- [ ] **Team Plan:**
  - 10,000 base + 1,000 per seat
  - All context levels (including Thinking)
  - **MINIMUM 5 SEATS** ✅
  - Pooled actions
- [ ] **Enterprise Plan:**
  - Custom limits
  - All features
  - 10+ seats

---

## Deployment Steps

### Step 1: Run Validation Script
```bash
npm run validate:production
# or
npx ts-node scripts/validate-production-deployment.ts
```

**Expected output:** All tests pass ✅

### Step 2: Deploy to Staging
```bash
# Deploy to staging environment first
npm run deploy:staging
```

**Test in staging:**
- [ ] Create test accounts for each tier
- [ ] Generate stories with each context level
- [ ] Verify tier restrictions work
- [ ] Verify action deduction accurate
- [ ] Check usage dashboard displays correctly

### Step 3: Run Integration Tests
```bash
npm run test:integration
```

**Verify:**
- [ ] All API endpoints respond correctly
- [ ] Tier enforcement works
- [ ] Action tracking accurate
- [ ] Database updates correctly

### Step 4: Deploy to Production
```bash
# Deploy to production
npm run deploy:production
# or
vercel --prod
```

### Step 5: Run Post-Deployment Validation
```bash
# Run validation against production
npm run validate:production -- --env=production
```

---

## Post-Deployment Verification

### ✅ 1. Smoke Tests (Critical)

#### Test 1: Starter User (Free Tier)
- [ ] Login as Starter user
- [ ] Try to create story with **Minimal** → Should work ✅
- [ ] Try to create story with **Standard** → Should show 403 error ❌
- [ ] Verify upgrade prompt displays
- [ ] Check usage dashboard shows 25 limit

#### Test 2: Core User
- [ ] Login as Core user
- [ ] Create story with **Minimal** → Should work ✅
- [ ] Create story with **Standard** → Should work ✅
- [ ] Try **Comprehensive** → Should show 403 error ❌
- [ ] Verify 400 action limit
- [ ] Verify 20% rollover mentioned

#### Test 3: Pro User
- [ ] Login as Pro user
- [ ] Create story with **Standard** → Should work ✅
- [ ] Create story with **Comprehensive** → Should work ✅
- [ ] Assign to epic for Comprehensive mode
- [ ] Try **Thinking** → Should show 403 error ❌
- [ ] Verify 800 action limit

#### Test 4: Team User
- [ ] Login as Team user
- [ ] Create story with **Thinking** mode → Should work ✅
- [ ] Verify uses Claude Opus model
- [ ] Verify 3 actions deducted
- [ ] Check pooled actions (10,000 + 1,000 × seats)
- [ ] Verify all team members share pool

#### Test 5: Action Deduction
- [ ] Generate with Minimal → Verify 1 action deducted
- [ ] Generate with Standard → Verify 2 actions deducted
- [ ] Generate with Comprehensive → Verify 2 actions deducted
- [ ] Generate with Thinking → Verify 3 actions deducted
- [ ] Check database `ai_action_usage` table updated

#### Test 6: Quota Enforcement
- [ ] User with 1 action remaining
- [ ] Try to generate with Standard (needs 2)
- [ ] Should show 429 error ❌
- [ ] Error message should say "Need 2, have 1 remaining"
- [ ] Upgrade prompt should display

#### Test 7: Team Plan Seat Validation
- [ ] Try to create Team subscription with 1 seat → Should fail ❌
- [ ] Try to create Team subscription with 3 seats → Should fail ❌
- [ ] Try to create Team subscription with 5 seats → Should work ✅
- [ ] Try to create Team subscription with 10 seats → Should work ✅

---

### ✅ 2. API Endpoint Tests

Test each endpoint directly:

```bash
# Test user data endpoint
curl -X GET https://synqforge.com/api/ai/context-level/user-data \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "userTier": "pro",
#     "actionsUsed": 45,
#     "actionsRemaining": 755,
#     "monthlyLimit": 800,
#     "breakdown": { "standard": 20, "comprehensive": 5 }
#   }
# }
```

```bash
# Test story generation with context level
curl -X POST https://synqforge.com/api/ai/generate-single-story \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirement": "As a user, I want to reset my password",
    "projectId": "PROJECT_ID",
    "contextLevel": "standard"
  }'

# Expected response should include:
# {
#   "success": true,
#   "story": {...},
#   "aiActions": {
#     "used": 47,
#     "remaining": 753,
#     "monthlyLimit": 800,
#     "contextLevel": "standard",
#     "actionCost": 2
#   }
# }
```

---

### ✅ 3. Database Verification

```sql
-- Check ai_action_usage table
SELECT * FROM ai_action_usage 
WHERE billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)
LIMIT 10;

-- Verify action breakdown
SELECT 
  organization_id,
  user_id,
  actions_used,
  allowance,
  action_breakdown
FROM ai_action_usage
WHERE actions_used > 0;

-- Check Team plan organizations have 5+ users
SELECT 
  o.id,
  o.name,
  o.subscription_tier,
  COUNT(u.id) as user_count
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
WHERE o.subscription_tier = 'team'
GROUP BY o.id, o.name, o.subscription_tier
HAVING COUNT(u.id) < 5;
-- Should return 0 rows
```

---

### ✅ 4. Monitoring Setup

- [ ] **Set up error tracking** for 403/429 responses
- [ ] **Monitor API endpoint latency**
  - `/api/ai/generate-single-story`
  - `/api/ai/context-level/user-data`
- [ ] **Track AI action usage metrics**
  - Actions used per context level
  - Quota exceeded events
  - Upgrade conversions
- [ ] **Set up alerts**
  - High 403 error rate (>5%)
  - High 429 error rate (>10%)
  - Database connection failures
  - AI API failures

---

## Rollback Plan

If issues are detected:

### Immediate Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### Database Rollback
```sql
-- If needed, drop new tables (CAUTION!)
DROP TABLE IF EXISTS ai_action_usage CASCADE;
DROP TABLE IF EXISTS ai_action_rollover CASCADE;
```

### Feature Flag Disable
If you have feature flags:
```typescript
// Disable AI Context Level feature
export const ENABLE_CONTEXT_LEVELS = false;
```

---

## Known Issues & Limitations

### Current Limitations
1. **Semantic search not yet added to single story generation**
   - Only works in bulk generation
   - Will be added in next release

2. **Other API endpoints not yet updated**
   - `generate-stories` route needs same updates
   - `generate-from-capability` needs updates
   - `generate-epic` needs updates

3. **Usage dashboard not yet added to UI**
   - Component created but not integrated
   - Add to `/app/settings/billing/page.tsx`

### Workarounds
- Users can still use bulk generation for semantic search
- Other endpoints will use default context level (Standard)
- Usage data accessible via API endpoint

---

## Success Criteria

### Must Pass (Blocking)
- [ ] All tier restrictions enforced server-side
- [ ] Action deduction accurate for all context levels
- [ ] No unauthorized access to higher tiers
- [ ] Database migration successful
- [ ] No 500 errors in production
- [ ] Team plan requires 5+ seats

### Should Pass (Non-Blocking)
- [ ] Usage dashboard displays correctly
- [ ] Near-limit warnings work
- [ ] Upgrade prompts display
- [ ] Response times <2 seconds

---

## Communication Plan

### Before Deployment
- [ ] Notify team in Slack
- [ ] Update status page (if applicable)
- [ ] Prepare support team with FAQs

### During Deployment
- [ ] Monitor error rates
- [ ] Watch for user reports
- [ ] Be ready to rollback

### After Deployment
- [ ] Send announcement email to users
- [ ] Update documentation
- [ ] Post in community/blog
- [ ] Monitor for 24 hours

---

## Support Preparation

### FAQs for Support Team

**Q: Why can't I use Comprehensive mode?**
A: Comprehensive mode requires a Pro plan or higher. Upgrade at /pricing

**Q: Why does it say I need 5 seats for Team plan?**
A: Team plans are designed for larger teams and require a minimum of 5 users. This ensures the pooled action system works effectively.

**Q: What's the difference between context levels?**
A: 
- Minimal (1 action): Fast, generic
- Standard (2 actions): Project-aware
- Comprehensive (2 actions): Semantic search
- Thinking (3 actions): Advanced reasoning

**Q: How do I check my usage?**
A: Visit /settings/billing or use the AI Actions Usage Dashboard

**Q: When do my actions reset?**
A: Actions reset on the 1st of each month

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates daily
- [ ] Collect user feedback
- [ ] Fix any critical bugs
- [ ] Update documentation based on feedback

### Week 2
- [ ] Analyze usage patterns
- [ ] Optimize token estimates if needed
- [ ] Update other API endpoints
- [ ] Add usage dashboard to UI

### Week 3
- [ ] Add semantic search to single story
- [ ] Implement any requested features
- [ ] Performance optimizations

### Week 4
- [ ] Review success metrics
- [ ] Plan next iteration
- [ ] Document lessons learned

---

## Metrics to Track

### Usage Metrics
- Stories generated by context level
- Context level distribution (%)
- Average generation time per level
- Stories edited vs. accepted as-is

### Business Metrics
- Upgrade conversion rate
- Tier distribution of users
- Monthly action usage per tier
- Near-limit warnings triggered
- Quota exceeded incidents

### Technical Metrics
- API response times (P50, P95, P99)
- Error rates (403, 429, 500)
- Database query performance
- AI API latency

---

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Linter errors resolved
- [ ] Documentation complete

**Signed:** _________________ Date: _________________

### QA Team
- [ ] All test cases passed
- [ ] Smoke tests successful
- [ ] Integration tests passed
- [ ] Performance acceptable

**Signed:** _________________ Date: _________________

### Product Manager
- [ ] Feature complete
- [ ] Meets requirements
- [ ] Ready for users
- [ ] Communication plan ready

**Signed:** _________________ Date: _________________

### DevOps/Platform
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Rollback plan tested
- [ ] Database migration verified

**Signed:** _________________ Date: _________________

---

## Final Checklist

Before clicking "Deploy":

- [ ] ✅ All code changes committed and pushed
- [ ] ✅ Database migration ready
- [ ] ✅ Environment variables configured
- [ ] ✅ Validation script passes
- [ ] ✅ Staging tests successful
- [ ] ✅ Team plan requires 5 seats
- [ ] ✅ Rollback plan documented
- [ ] ✅ Monitoring configured
- [ ] ✅ Support team briefed
- [ ] ✅ Communication ready

---

**Status:** ✅ **READY FOR PRODUCTION DEPLOYMENT**

**Deployment Command:**
```bash
# Run validation first
npm run validate:production

# If all tests pass, deploy
vercel --prod

# Monitor for 1 hour after deployment
```

---

**Last Updated:** November 10, 2025  
**Version:** 1.0  
**Next Review:** Post-deployment (Week 1)

