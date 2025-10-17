# Fair-Usage Billing - What's Left To Do

## 🎯 Quick Summary

**70% DONE** - Core infrastructure complete. Need to:
1. Copy guards to 17 remaining AI endpoints  
2. Add guards to document upload
3. Update usage dashboard
4. Create UI warning components
5. Deploy & test

---

## 1. Integrate Remaining AI Endpoints (17 files)

### Pattern (from generate-stories/route.ts):

```typescript
// Add imports
import { canUseAI, incrementTokenUsage, checkBulkLimit } from '@/lib/billing/fair-usage-guards'

// BEFORE AI operation:
const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens)
if (!aiCheck.allowed) {
  return NextResponse.json({
    error: aiCheck.reason,
    upgradeUrl: aiCheck.upgradeUrl,
    used: aiCheck.used,
    limit: aiCheck.limit,
  }, { status: 402 })
}

// AFTER successful AI operation:
const actualTokens = response.usage?.total_tokens || estimatedTokens
await incrementTokenUsage(context.user.organizationId, actualTokens)
```

### Files to update:
1. app/api/ai/generate-single-story/route.ts
2. app/api/ai/generate-epic/route.ts
3. app/api/ai/validate-story/route.ts
4. app/api/ai/ac-validator/route.ts
5. app/api/ai/test-generator/route.ts
6. app/api/ai/autopilot/route.ts
7. app/api/ai/planning/route.ts
8. app/api/ai/scoring/route.ts
9. app/api/ai/analyze-document/route.ts
10. app/api/ai/batch-create-stories/route.ts
11-17. Other AI endpoints

---

## 2. Document Upload (1 file)

Find upload endpoint and add:

```typescript
import { canIngestDocument, incrementDocIngestion, checkPageLimit } from '@/lib/billing/fair-usage-guards'

// Before processing:
const docCheck = await canIngestDocument(organizationId)
if (!docCheck.allowed) {
  return NextResponse.json({ error: docCheck.reason }, { status: 402 })
}

// For PDFs:
if (isPdf) {
  const pageCount = await getPdfPageCount(file)
  const pageCheck = await checkPageLimit(organizationId, pageCount)
  if (!pageCheck.allowed) {
    return NextResponse.json({ error: pageCheck.reason }, { status: 402 })
  }
}

// After success:
await incrementDocIngestion(organizationId)
```

---

## 3. Usage Dashboard

Update `app/api/billing/usage/route.ts`:

```typescript
import { getUsageSummary } from '@/lib/billing/fair-usage-guards'

const fairUsage = await getUsageSummary(organizationId)

return NextResponse.json({
  fairUsage: {
    tokens: fairUsage.tokens,  // used, limit, percentage, isWarning
    docs: fairUsage.docs,
    billingPeriod: fairUsage.billingPeriod
  }
})
```

---

## 4. UI Components

Create in `components/billing/`:

**UsageWarningBanner.tsx** - Shows at 90%
**BlockedModal.tsx** - Shows on 402 error

See IMPLEMENTATION_SUMMARY.md for code examples.

---

## 5. Deploy

```bash
git add -A
git commit -m "feat: Complete fair-usage billing implementation"
git push
vercel --prod
```

---

## Environment Variables (Set in Vercel)

```bash
STRIPE_PRICE_SOLO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_ANNUAL=price_xxx
# Optional:
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_ANNUAL=price_xxx
```

---

## Stripe Metadata (Set on Prices)

```
plan=solo
cycle=monthly
ai_tokens_included=50000
docs_per_month=10
throughput_spm=5
bulk_story_limit=20
max_pages_per_upload=50
# ... other fields
```

---

## Testing

1. Subscribe to Solo via checkout
2. Use AI until tokens=0 → expect 402
3. Upload 11 docs → expect 402
4. Try bulk gen with 25 stories → expect 402
5. At 90% → expect warning

---

Estimated time: 2-3 hours
Priority: AI endpoints first (highest usage)

