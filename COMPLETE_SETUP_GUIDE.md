# Complete Fair-Usage Setup Guide

**Current Status:** 70% Complete - Ready for final integration

---

## ✅ What's Already Done

1. Database migration applied to production
2. Fair-usage guards module complete with hard blocks
3. Webhook handler syncs Stripe metadata
4. Checkout endpoint supports price lookups
5. Template AI endpoint shows integration pattern
6. Code committed and pushed to GitHub

---

## 📝 What You Need To Do Now

### Step 1: Set Stripe Metadata (15 minutes)

Go to each Price in Stripe Dashboard and add this metadata:

**For Solo Monthly:**
```
plan=solo
cycle=monthly
seats_included=1
projects_included=1
ai_tokens_included=50000
docs_per_month=10
throughput_spm=5
bulk_story_limit=20
max_pages_per_upload=50
advanced_ai=false
exports=true
templates=true
rbac=none
audit_logs=none
sso=false
support_tier=community
fair_use=true
```

**For Solo Annual:**
Same as above but `cycle=annual`

**For Team/Pro/Enterprise (optional):**
Increase limits appropriately.

---

### Step 2: Set Environment Variables in Vercel (5 minutes)

```bash
vercel env add STRIPE_PRICE_SOLO_MONTHLY
# Paste your solo monthly price ID: price_***

vercel env add STRIPE_PRICE_SOLO_ANNUAL
# Paste your solo annual price ID: price_***
```

Or via Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add for Production:
   - STRIPE_PRICE_SOLO_MONTHLY = price_***
   - STRIPE_PRICE_SOLO_ANNUAL = price_***

---

### Step 3: Complete Remaining Integrations (5 hours)

#### A. Integrate 17 AI Endpoints (~2 hours)

For each file in `app/api/ai/**/route.ts`:

1. Add import:
```typescript
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards'
```

2. Before AI call:
```typescript
const estimatedTokens = AI_TOKEN_COSTS.OPERATION_TYPE * count
const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens)
if (!aiCheck.allowed) {
  return NextResponse.json({
    error: aiCheck.reason,
    upgradeUrl: aiCheck.upgradeUrl,
    used: aiCheck.used,
    limit: aiCheck.limit,
  }, { status: 402 })
}
```

3. After successful AI call:
```typescript
const actualTokens = response.usage?.total_tokens || estimatedTokens
await incrementTokenUsage(context.user.organizationId, actualTokens)
```

**Files to update:**
See app/api/ai/generate-stories/route.ts as template, then apply to:
- generate-single-story
- generate-epic
- validate-story
- ac-validator
- test-generator
- autopilot
- planning
- scoring
- analyze-document
- batch-create-stories
- (7 more)

#### B. Integrate Document Upload (~30 min)

Find document upload endpoint and add:

```typescript
import { canIngestDocument, incrementDocIngestion, checkPageLimit } from '@/lib/billing/fair-usage-guards'

// Before processing
const docCheck = await canIngestDocument(organizationId)
if (!docCheck.allowed) {
  return NextResponse.json({ error: docCheck.reason }, { status: 402 })
}

// For PDFs
if (isPdf) {
  const pageCount = await getPdfPageCount(file)
  const pageCheck = await checkPageLimit(organizationId, pageCount)
  if (!pageCheck.allowed) {
    return NextResponse.json({ error: pageCheck.reason }, { status: 402 })
  }
}

// After success
await incrementDocIngestion(organizationId)
```

#### C. Update Usage Dashboard (~30 min)

In `app/api/billing/usage/route.ts`:

```typescript
import { getUsageSummary } from '@/lib/billing/fair-usage-guards'

// In GET handler
const fairUsage = await getUsageSummary(organizationId)

return NextResponse.json({
  // ... existing fields
  fairUsage: {
    tokens: fairUsage.tokens,
    docs: fairUsage.docs,
    billingPeriod: fairUsage.billingPeriod,
  },
})
```

#### D. Create UI Components (~1 hour)

Create `components/billing/UsageWarningBanner.tsx`:
```typescript
'use client'
export function UsageWarningBanner({ used, limit, percentage, resourceType }: Props) {
  if (percentage < 90) return null
  return <Alert>Warning: {percentage}% of {resourceType} used</Alert>
}
```

Create `components/billing/BlockedModal.tsx`:
```typescript
'use client'
export function BlockedModal({ error, upgradeUrl }: Props) {
  return <Dialog><Button href={upgradeUrl}>Upgrade Plan</Button></Dialog>
}
```

Update `app/settings/billing/page.tsx` to show warnings.

---

### Step 4: Deploy (~15 minutes)

```bash
# From project root
git add -A
git commit -m "feat: Complete fair-usage billing integration"
git push clean New

# Deploy to Vercel
vercel --prod
```

---

### Step 5: Test End-to-End (~1 hour)

1. **Subscribe to Solo Plan:**
   ```
   - Go to /settings/billing
   - Click subscribe to Solo
   - Use test card: 4242 4242 4242 4242
   - Complete checkout
   ```

2. **Verify Entitlements:**
   ```
   - Check database: SELECT * FROM organizations WHERE id = 'your-org-id'
   - Verify: ai_tokens_included=50000, docs_per_month=10, etc.
   - Check: workspace_usage table has new record
   ```

3. **Test AI Limit:**
   ```
   - Generate stories repeatedly until you hit 50K tokens
   - Should get 402 error with upgrade message
   ```

4. **Test Doc Limit:**
   ```
   - Upload 10 documents
   - Try uploading 11th → should get 402 error
   ```

5. **Test Bulk Limit:**
   ```
   - Try generating 25 stories in one request
   - Should get 402 error (limit: 20 for Solo)
   ```

6. **Test Page Limit:**
   ```
   - Try uploading PDF with 60 pages
   - Should get 402 error (limit: 50 for Solo)
   ```

7. **Test 90% Warning:**
   ```
   - Use 45K+ tokens (90% of 50K)
   - Should see warning in API response
   - Should see warning banner in UI (once implemented)
   ```

8. **Test Upgrade:**
   ```
   - When blocked, click Upgrade button
   - Should go to billing page
   - Upgrade to Team plan
   - Limits should increase
   ```

9. **Test Monthly Reset:**
   ```
   - Either wait for next month
   - Or manually update billing_period_start in workspace_usage table
   - Usage should reset to 0
   ```

---

## 🎯 Success Checklist

- [ ] Stripe metadata set on all Prices
- [ ] Environment variables set in Vercel
- [ ] All 18 AI endpoints integrated
- [ ] Document upload integrated
- [ ] Usage dashboard updated
- [ ] UI components created
- [ ] Code deployed to production
- [ ] Can subscribe to Solo plan
- [ ] Entitlements sync from Stripe
- [ ] AI blocked at token limit (402)
- [ ] Docs blocked at limit (402)
- [ ] Bulk blocked at limit (402)
- [ ] Pages blocked at limit (402)
- [ ] 90% warning shows
- [ ] Upgrade flow works
- [ ] Monthly reset works

---

## 📞 Troubleshooting

**Problem:** Webhook not receiving events
**Solution:** 
- Check STRIPE_WEBHOOK_SECRET is set
- Test with: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Problem:** 402 errors not showing
**Solution:**
- Check guards are imported correctly
- Verify canUseAI() returns allowed=false
- Check status code is exactly 402

**Problem:** Usage not tracking
**Solution:**
- Check incrementTokenUsage() is called after AI
- Verify workspace_usage table has records
- Check billing_period_start matches current month

**Problem:** Limits not from metadata
**Solution:**
- Verify metadata keys match exactly (case-sensitive)
- Check webhook is parsing metadata correctly
- Look at webhook logs in Vercel

---

## 📚 Documentation Files

- **FINAL_SUMMARY.md** - Comprehensive overview of what was built
- **NEXT_STEPS.md** - Quick reference for remaining tasks
- **IMPLEMENTATION_SUMMARY.md** - Technical implementation details
- **This file** - Step-by-step setup guide

---

## 🎉 You're Almost There!

70% of the hard work is done. The remaining 30% is straightforward:
1. Copy the pattern to other endpoints (repetitive)
2. Add UI components (standard React)
3. Test the flow

Estimated time: 5 hours total
Priority: AI endpoints first (they have the most usage)

Good luck! 🚀

