# 🚀 Production Deployment Checklist
## SynqForge 2025 Pricing Implementation

**Deployment Date:** _________________  
**Deployment Lead:** _________________  
**Version:** 2025.1.0  
**Last Updated:** October 24, 2025

---

## ✅ Pre-Deployment Verification

### Code Quality & Testing
- [x] **Build passes locally** (Exit code 0)
- [x] **TypeScript compilation clean** (No errors)
- [x] **All critical endpoints exist**
  - [x] `/api/cron/expire-addons`
  - [x] `/api/webhooks/stripe`
  - [x] `/api/billing/add-ons`
  - [x] `/api/billing/add-ons/[id]/cancel`
- [x] **Tier enum mismatch resolved**
- [x] **Configuration files valid**
  - [x] `vercel.json` (JSON valid)
  - [x] `config/products.json` (JSON valid)
- [x] **Database schema includes new tables**
  - [x] `addon_purchases`
  - [x] `token_allowances`
  - [x] `tokens_ledger`
  - [x] `feature_gates`

### Git & Version Control
- [ ] **All changes committed**
  ```bash
  git status  # Should show "working tree clean"
  ```
- [ ] **Meaningful commit message prepared**
  ```bash
  git commit -m "feat: Complete 2025 pricing - cron, webhooks, tier fixes"
  ```
- [ ] **Pushed to main branch**
  ```bash
  git push origin main
  ```
- [ ] **GitHub Actions passing** (if applicable)

---

## 🗄️ Database Preparation

### Migration Status
- [ ] **Database backup created**
  ```bash
  # Via Vercel CLI
  vercel env pull .env.production
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Migration script ready**
  - [ ] `db/migrations/0006_add_on_support.sql` exists
  - [ ] Migration reviewed for syntax errors
- [ ] **Migration applied to production**
  ```bash
  psql $DATABASE_URL -f db/migrations/0006_add_on_support.sql
  ```
- [ ] **Tables verified in production**
  ```bash
  psql $DATABASE_URL -c "\dt addon_purchases"
  psql $DATABASE_URL -c "\dt token_allowances"
  psql $DATABASE_URL -c "\dt tokens_ledger"
  psql $DATABASE_URL -c "\dt feature_gates"
  ```
- [ ] **Indexes created**
  ```bash
  psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'addon_purchases';"
  ```

---

## 💳 Stripe Configuration

### Live Products Setup
- [ ] **Stripe live mode enabled**
- [ ] **Products created in live mode**
  - [ ] Starter (Free): `prod_TIGxbOfGGuRi2K`
  - [ ] Pro: `prod_TIGxKs87zpSQSE`
  - [ ] Team: `prod_TIGxKB5ovEmIfN`
  - [ ] Enterprise: `prod_TIGxJwvzdJaWKs`
  - [ ] AI Booster: (price created)
  - [ ] Overage Pack: (price created)
- [ ] **Price IDs match environment variables**
  ```bash
  # Check in Vercel dashboard or .env.production
  grep STRIPE_PRICE .env.production
  ```
- [ ] **Test purchase completed in Stripe test mode** (before live)

### Webhook Configuration
- [ ] **Webhook endpoint created in Stripe**
  - URL: `https://yourdomain.com/api/webhooks/stripe`
- [ ] **Required events enabled**
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] **Webhook secret obtained and saved**
  ```bash
  # Should be set in Vercel environment
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
- [ ] **Webhook signing secret verified**
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  stripe trigger checkout.session.completed
  ```

---

## 🔐 Environment Variables

### Vercel Environment Setup
- [ ] **All required environment variables set in Vercel**
  - [ ] `DATABASE_URL`
  - [ ] `STRIPE_SECRET_KEY` (live mode: `sk_live_...`)
  - [ ] `STRIPE_WEBHOOK_SECRET` (live mode: `whsec_...`)
  - [ ] `CRON_SECRET` (for cron job authorization)
  - [ ] `NEXT_PUBLIC_APP_URL` (production domain)
  - [ ] `STRIPE_PUBLISHABLE_KEY` (public key)
  - [ ] All price IDs (see below)

### Stripe Price Environment Variables
```bash
# Verify these are set in Vercel production environment
STRIPE_PRICE_PRO_MONTHLY=price_1SLgPXJBjlYCYeTTbppdijc9
STRIPE_PRICE_PRO_ANNUAL=price_1SLgPYJBjlYCYeTTBO7KDqmO
STRIPE_PRICE_TEAM_MONTHLY=price_1SLgPYJBjlYCYeTTp7tzY2XB
STRIPE_PRICE_TEAM_ANNUAL=price_1SLgPYJBjlYCYeTTVtGh9iyz
STRIPE_PRICE_AI_BOOSTER=price_1SLgPZJBjlYCYeTTUd9FSh67
STRIPE_PRICE_OVERAGE_PACK=price_1SLgPaJBjlYCYeTTB6sQX2pO
```

### Environment Verification
- [ ] **Test environment variables locally**
  ```bash
  vercel env pull .env.production
  source .env.production
  echo $STRIPE_SECRET_KEY | head -c 10  # Should start with sk_live_
  ```

---

## 🚀 Deployment Execution

### Pre-Deployment
- [ ] **Announce maintenance window** (if needed)
- [ ] **Notify team of deployment**
- [ ] **Set up monitoring dashboard**

### Deploy to Vercel
- [ ] **Trigger deployment**
  ```bash
  git push origin main  # Auto-deploys on Vercel
  # OR manually:
  vercel --prod
  ```
- [ ] **Monitor build logs**
  - Watch at: `https://vercel.com/your-org/synqforge/deployments`
- [ ] **Build completes successfully**
- [ ] **Deployment URL generated**

### Immediate Post-Deployment Checks (5 minutes)
- [ ] **Site is accessible**
  ```bash
  curl -I https://yourdomain.com
  # Should return 200 OK
  ```
- [ ] **Health endpoint responding**
  ```bash
  curl https://yourdomain.com/api/health
  # Should return {"status":"ok"}
  ```
- [ ] **Pricing page loads**
  ```bash
  curl -I https://yourdomain.com/pricing
  # Should return 200 OK
  ```
- [ ] **No 500 errors in Vercel logs**
  ```bash
  vercel logs --follow
  ```

---

## ⚙️ Cron Jobs Verification

### Vercel Cron Configuration
- [ ] **Cron jobs appear in Vercel dashboard**
  - Navigate to: Project Settings → Cron Jobs
- [ ] **Expected cron jobs listed**
  - [ ] `/api/cron/daily-snapshots` (0 0 * * *)
  - [ ] `/api/cron/email-digests?frequency=daily` (0 8 * * *)
  - [ ] `/api/cron/email-digests?frequency=weekly` (0 8 * * 1)
  - [ ] `/api/cron/expire-trials` (0 1 * * *)
  - [ ] `/api/cron/expire-addons` (0 2 * * *)  ← **NEW**
- [ ] **Cron schedule correct** (daily at 2:00 AM UTC)
- [ ] **CRON_SECRET environment variable set**

### Manual Cron Test
- [ ] **Test expire-addons endpoint manually**
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    https://yourdomain.com/api/cron/expire-addons
  
  # Expected response:
  # {"success":true,"message":"No expired add-ons to process","processed":0}
  ```
- [ ] **Check cron execution in logs** (wait for next scheduled run)
  ```bash
  # After 2:00 AM UTC, check logs
  vercel logs --since 2h | grep expire-addons
  ```

---

## 🧪 Post-Deployment Testing

### Critical Path Testing (30 minutes)

#### Test 1: User Signup & Tier Assignment
- [ ] **Create new test account**
  - Email: `test+$(date +%s)@yourdomain.com`
- [ ] **Verify default tier is 'starter'**
  - Check database: `SELECT subscription_tier FROM organizations WHERE email = ...`
- [ ] **Verify AI actions quota set**
  - Check: `/api/usage/current` returns 25 actions for starter

#### Test 2: Pricing Page
- [ ] **Visit `/pricing` page**
- [ ] **All 4 tiers displayed**
  - [ ] Starter (Free)
  - [ ] Pro
  - [ ] Team
  - [ ] Enterprise
- [ ] **Monthly/Annual toggle works**
- [ ] **CTA buttons functional**
- [ ] **No console errors**

#### Test 3: Add-On Purchase Flow (Test Mode)
- [ ] **Switch Stripe to test mode temporarily** (optional)
- [ ] **Navigate to `/settings/billing`**
- [ ] **Click "Buy AI Actions Pack"**
- [ ] **Stripe Checkout opens**
- [ ] **Complete purchase with test card** (`4242 4242 4242 4242`)
- [ ] **Redirected back to success page**
- [ ] **Webhook received and processed**
  ```bash
  # Check logs for:
  # "Applied add-on ai_actions_pack from checkout"
  vercel logs | grep "Applied add-on"
  ```
- [ ] **Credits added to account**
  ```sql
  SELECT * FROM addon_purchases WHERE status = 'active';
  ```

#### Test 4: Webhook Delivery
- [ ] **Check Stripe webhook dashboard**
  - Navigate to: Stripe → Developers → Webhooks
- [ ] **Recent events show successful delivery**
- [ ] **No failed webhook attempts**
- [ ] **Response times < 2 seconds**

#### Test 5: Existing User Compatibility
- [ ] **Login as existing user**
- [ ] **Verify their tier preserved**
- [ ] **No permission errors on existing features**
- [ ] **Can access previously available pages**

---

## 📊 Monitoring Setup (First 24 Hours)

### Metrics to Watch

#### Application Health
- [ ] **Error rate < 0.1%**
  ```bash
  vercel logs --since 1h | grep -i error | wc -l
  ```
- [ ] **Response time < 500ms (p95)**
- [ ] **No memory leaks or OOM errors**
- [ ] **Database connection pool healthy**

#### Business Metrics
- [ ] **New signups tracking correctly**
  ```sql
  SELECT COUNT(*) FROM organizations WHERE created_at > NOW() - INTERVAL '1 hour';
  ```
- [ ] **Tier distribution looks normal**
  ```sql
  SELECT subscription_tier, COUNT(*) FROM organizations GROUP BY subscription_tier;
  ```
- [ ] **No mass tier downgrades** (would indicate issue)

#### Stripe Integration
- [ ] **Webhook success rate > 99%**
  - Check: Stripe Dashboard → Webhooks → Success rate
- [ ] **Checkout sessions completing**
  - Check: Stripe Dashboard → Payments
- [ ] **No duplicate charges**
- [ ] **Add-on purchases processing**

#### Cron Jobs
- [ ] **Daily cron jobs executing**
  ```bash
  vercel logs --since 24h | grep "Running.*cron job"
  ```
- [ ] **No cron job timeouts**
- [ ] **Expire-addons ran successfully**
  ```bash
  vercel logs | grep "expire-addons" | grep "success"
  ```

### Alerts Setup
- [ ] **Vercel alerts configured**
  - High error rate (> 1%)
  - Slow response time (> 1s)
  - Build failures
- [ ] **Stripe alerts enabled**
  - Failed webhook deliveries
  - Payment failures
- [ ] **Database monitoring active**
  - Connection pool exhaustion
  - Slow queries

---

## 🐛 Rollback Plan

### If Critical Issues Arise

#### Immediate Rollback
```bash
# Option 1: Revert to previous deployment in Vercel dashboard
# Settings → Deployments → Select previous → Promote to Production

# Option 2: Git revert and redeploy
git revert HEAD
git push origin main
```

#### Database Rollback
```bash
# Restore from backup (if needed)
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Or drop new tables (less destructive)
psql $DATABASE_URL <<EOF
DROP TABLE IF EXISTS addon_purchases CASCADE;
DROP TABLE IF EXISTS token_allowances CASCADE;
DROP TABLE IF EXISTS tokens_ledger CASCADE;
DROP TABLE IF EXISTS feature_gates CASCADE;
EOF
```

#### Stripe Rollback
- [ ] **Deactivate new products in Stripe**
- [ ] **Disable webhook endpoint**
- [ ] **Revert to previous price IDs in environment**

### Communication
- [ ] **Notify users if issues affect them**
- [ ] **Post status update** (if status page exists)
- [ ] **Document incident for postmortem**

---

## 📝 Post-Deployment Documentation

### Update Status Documents
- [x] **FINAL_DEPLOYMENT_STATUS.md updated**
- [ ] **Add deployment timestamp to file**
- [ ] **Document any deviations from plan**
- [ ] **Record production URLs and IDs**

### Team Communication
- [ ] **Announce successful deployment**
  - Slack/Discord notification
  - Email to stakeholders
- [ ] **Share monitoring dashboard links**
- [ ] **Provide summary of changes**

### Knowledge Base Updates
- [ ] **Update internal wiki** (if exists)
- [ ] **Document new admin procedures**
  - How to manually expire add-ons
  - How to grant credits to users
  - How to investigate webhook failures
- [ ] **Create runbook for common issues**

---

## 🎯 Success Criteria

### Must Have (Deployment Success)
- [x] ✅ Build passes
- [x] ✅ No TypeScript errors
- [ ] ✅ Site accessible
- [ ] ✅ No 500 errors in first hour
- [ ] ✅ Webhooks delivering successfully
- [ ] ✅ Cron jobs scheduled

### Should Have (First 24 Hours)
- [ ] ✅ At least 1 successful checkout (test or real)
- [ ] ✅ Pricing page visited by users
- [ ] ✅ No rollbacks required
- [ ] ✅ Error rate < 0.1%

### Nice to Have (First Week)
- [ ] 📊 First add-on purchase
- [ ] 📊 Users exploring new features
- [ ] 📊 Positive user feedback
- [ ] 📊 No support tickets related to pricing

---

## 📞 Emergency Contacts

### Team Contacts
- **Deployment Lead:** _________________
- **Backend Engineer:** _________________
- **DevOps/Infrastructure:** _________________
- **Product Owner:** _________________

### External Services
- **Vercel Support:** support@vercel.com
- **Stripe Support:** https://support.stripe.com
- **Neon/Database Support:** _________________

### Escalation Path
1. Check Vercel logs first
2. Check Stripe webhook logs
3. Check database logs
4. Contact team lead
5. Initiate rollback if critical

---

## ✅ Final Sign-Off

### Pre-Deployment Approval
- [ ] **Code reviewed and approved**
- [ ] **QA testing completed**
- [ ] **Product owner approval**
- [ ] **Technical lead approval**

### Deployment Execution
- [ ] **Deployment started at:** _________
- [ ] **Deployment completed at:** _________
- [ ] **Deployed by:** _________________
- [ ] **Deployment successful:** [ ] Yes [ ] No

### Post-Deployment Verification
- [ ] **All health checks passing**
- [ ] **Monitoring in place**
- [ ] **Team notified**
- [ ] **Documentation updated**

---

## 📊 Deployment Log

| Timestamp | Action | Status | Notes |
|-----------|--------|--------|-------|
| | Pre-deployment checks | | |
| | Database migration | | |
| | Code deployment | | |
| | Health checks | | |
| | Monitoring setup | | |
| | Team notification | | |

---

## 🎉 Deployment Complete!

Congratulations on completing the 2025 pricing implementation deployment!

**Next Steps:**
1. Monitor for 24 hours
2. Gather user feedback
3. Analyze metrics
4. Plan next iteration

**Deployment Version:** 2025.1.0  
**Status:** [ ] Success [ ] Partial [ ] Rollback Required  
**Completed By:** _________________  
**Date:** _________________

---

**Generated:** October 24, 2025  
**Last Updated:** October 24, 2025  
**Version:** 1.0

