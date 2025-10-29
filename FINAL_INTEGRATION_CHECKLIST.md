# 🚀 Final Integration Checklist - Production Launch

**Status:** In Progress  
**Estimated Time:** 2 hours  
**Priority:** CRITICAL - Complete before launch

---

## ✅ **COMPLETED: Infrastructure Ready**

- [x] Sentry error tracking enabled
- [x] Encryption service implemented
- [x] PII detection service implemented
- [x] GDPR export endpoint created
- [x] GDPR deletion endpoint created
- [x] Daily health check script ready
- [x] Database migrations complete
- [x] Test suite passing (34 scenarios)

---

## 🔧 **IN PROGRESS: API Integration (2 hours)**

### **Step 1: Add Enforcement Endpoints** ✅ COMPLETED

- [x] Created `/app/api/subscriptions/enforce-limit/route.ts`
  - Checks action limits before AI generation
  - Returns detailed usage stats
  - Suggests upgrade plans when over limit

- [x] Created `/app/api/subscriptions/usage/route.ts`
  - Displays current usage for organization
  - Shows warning at 90% usage
  - Returns billing period information

### **Step 2: Integrate PII Detection into AI Routes** ⏳ IN PROGRESS

#### **Primary Route: generate-single-story** ✅ COMPLETED

- [x] Added PII detection import
- [x] Scan prompt before OpenRouter call
- [x] Block critical/high severity PII
- [x] Allow low severity PII (addresses) with warning
- [x] Return helpful error messages

#### **Remaining Routes to Update:**

```typescript
// Pattern to apply to each route:

// 1. Add import at top
import { piiDetectionService } from '@/lib/services/pii-detection.service';

// 2. Add PII check BEFORE AI call
const piiCheck = await piiDetectionService.scanForPII(
  prompt,
  organizationId,
  { userId, feature: 'route_name' }
);

if (piiCheck.hasPII && piiCheck.severity !== 'low') {
  return NextResponse.json({
    error: 'PII_DETECTED',
    message: 'Your prompt contains sensitive personal information',
    detectedTypes: piiCheck.detectedTypes,
    recommendations: piiCheck.recommendations
  }, { status: 400 });
}
```

**Routes to Update:**

- [x] `/app/api/ai/generate-single-story/route.ts` ✅
- [ ] `/app/api/ai/generate-stories/route.ts`
- [ ] `/app/api/ai/split-story/route.ts`
- [ ] `/app/api/ai/update-story/route.ts`
- [ ] `/app/api/ai/generate-epic/route.ts`
- [ ] `/app/api/ai/validate-story/route.ts`
- [ ] `/app/api/ai/analyze-document/route.ts`

---

## 📝 **Step 3: Update Frontend Components** (Optional - can be done post-launch)

### **Usage Display Component**

```typescript
// components/usage-badge.tsx
'use client';

import { useEffect, useState } from 'react';

export function UsageBadge() {
  const [usage, setUsage] = useState(null);
  
  useEffect(() => {
    fetch('/api/subscriptions/usage')
      .then(res => res.json())
      .then(setUsage);
  }, []);
  
  if (!usage) return null;
  
  const colorClass = usage.percentUsed >= 90 ? 'text-red-600' : 
                     usage.percentUsed >= 75 ? 'text-yellow-600' : 
                     'text-green-600';
  
  return (
    <div className="flex items-center gap-2">
      <span className={colorClass}>
        {usage.actionsUsed} / {usage.actionsLimit} actions
      </span>
      {usage.isWarning && (
        <a href="/pricing" className="text-sm text-blue-600 hover:underline">
          Upgrade
        </a>
      )}
    </div>
  );
}
```

**Add to:**
- [ ] Dashboard header
- [ ] Settings page
- [ ] Before AI generation forms

---

## 🧪 **Step 4: Testing (30 minutes)**

### **Manual Tests**

```bash
# 1. Test PII detection
curl -X POST http://localhost:3000/api/ai/generate-single-story \
  -H "Cookie: session=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project",
    "prompt": "User with SSN 123-45-6789 wants to login"
  }'
# Expected: 400 with PII_DETECTED error

# 2. Test normal generation
curl -X POST http://localhost:3000/api/ai/generate-single-story \
  -H "Cookie: session=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project",
    "prompt": "As a user, I want to login to the system"
  }'
# Expected: 200 with generated story

# 3. Test action limit enforcement
curl -X POST http://localhost:3000/api/subscriptions/enforce-limit \
  -H "Cookie: session=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "your-org-id"}'
# Expected: 200 with usage stats

# 4. Test usage display
curl http://localhost:3000/api/subscriptions/usage \
  -H "Cookie: session=$TOKEN"
# Expected: 200 with current usage
```

### **Automated Tests**

```bash
# Run all tests
npm test

# Run specific PII tests (create these)
npm test tests/pii-detection.test.ts

# Run integration tests
npm test tests/integration/
```

---

## 🚀 **Step 5: Pre-Deployment Checklist**

### **Environment Variables**

```bash
# Verify all required variables
vercel env ls production

# Add encryption key (for Week 2-3)
# ./scripts/enable-encryption-key.sh
# vercel env add ENCRYPTION_KEY_V1
```

**Required for Day 0:**
- [x] `DATABASE_URL`
- [x] `OPENROUTER_API_KEY`
- [x] `STRIPE_SECRET_KEY` (live)
- [x] `STRIPE_WEBHOOK_SECRET`
- [x] `NEXTAUTH_SECRET`
- [x] `NEXTAUTH_URL`
- [x] `NEXT_PUBLIC_SENTRY_DSN`
- [x] `UPSTASH_REDIS_REST_TOKEN`

**Optional for Week 2-3:**
- [ ] `ENCRYPTION_KEY_V1` (add when enabling encryption)

### **Database**

```bash
# Verify migrations applied
psql $DATABASE_URL -c "\dt"

# Verify indexes
psql $DATABASE_URL -c "\di" | grep workspace_usage

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### **Build**

```bash
# Clean build
rm -rf .next
npm run build

# Expected: No TypeScript errors, no build warnings
```

---

## 📋 **Step 6: Deployment**

### **Deploy to Production**

```bash
# Final build check
npm run build
npm test

# Deploy
vercel --prod

# Save deployment URL
# https://synqforge.com
```

### **Post-Deployment Smoke Tests**

```bash
# 1. Health check
curl https://synqforge.com/api/health
# Expected: {"status":"healthy"}

# 2. Auth redirect
curl -I https://synqforge.com/dashboard
# Expected: 307 redirect

# 3. Usage endpoint (with auth)
# Login manually, then test

# 4. PII detection (with auth)
# Try to generate story with SSN in prompt
# Expected: Blocked with helpful error
```

---

## 📊 **Step 7: Monitoring (First 24 Hours)**

### **Immediate Monitoring**

```bash
# Watch logs in real-time
vercel logs --prod --follow

# Filter for errors
vercel logs --prod --follow | grep ERROR

# Filter for PII detections
vercel logs --prod --follow | grep PII_DETECTED
```

### **Daily Health Check**

```bash
# Run health check script
./scripts/daily-health-check.sh

# Set up cron job
crontab -e
# Add: 0 9 * * * /path/to/scripts/daily-health-check.sh | mail -s "SynqForge Health" you@email.com
```

### **Sentry Dashboard**

- [ ] Check error rate: https://sentry.io/your-project
- [ ] Configure alerts (email/Slack)
- [ ] Set up issue assignment rules

---

## ✅ **Success Criteria**

### **Before Announcing Launch:**

- [ ] All AI routes have PII detection
- [ ] Usage enforcement working
- [ ] GDPR endpoints accessible (export/delete)
- [ ] Sentry receiving events
- [ ] Daily health checks scheduled
- [ ] 10 test users successfully generated stories
- [ ] Zero critical errors in Sentry
- [ ] Webhooks processing successfully

### **Metrics to Track (Week 1):**

| Metric | Target | Current |
|--------|--------|---------|
| Error rate | < 1% | - |
| PII detections | < 5% of requests | - |
| Action limit hits | > 0 (proves enforcement works) | - |
| Webhook success | > 99% | - |
| Average AI latency | < 5s | - |
| User signups | 50-100 | - |

---

## 🎯 **Remaining Work Estimate**

| Task | Time | Status |
|------|------|--------|
| ✅ Enforcement endpoints | 45 min | COMPLETED |
| ✅ PII in generate-single-story | 15 min | COMPLETED |
| ⏳ PII in other AI routes | 45 min | IN PROGRESS |
| Testing all routes | 30 min | PENDING |
| Deploy to Vercel | 15 min | PENDING |
| Post-deployment tests | 30 min | PENDING |
| **TOTAL REMAINING** | **2 hours** | - |

---

## 🚀 **Ready to Deploy?**

Once all checkboxes above are complete:

```bash
# Final command
vercel --prod
```

**Then monitor closely for 24 hours.**

---

## 📞 **Support Contacts**

- **Sentry Alerts:** https://sentry.io/your-project
- **Vercel Logs:** `vercel logs --prod --follow`
- **Database:** Neon dashboard
- **Stripe:** https://dashboard.stripe.com

---

## 🎉 **You're Almost There!**

**Current Status:** 80% complete  
**Time to Launch:** ~2 hours of integration work  
**Confidence Level:** HIGH ✅

Your billing system is **exceptional**. The remaining work is straightforward integration - wiring up the services you've already built. You've got this! 🚀

