# 90% Warning & Booster Package Validation

**Date**: October 27, 2025  
**Status**: ⚠️ **CRITICAL GAP IDENTIFIED**

## 🎯 Executive Summary

**Good News**: 90% warning system is fully implemented ✅  
**Bad News**: Booster packages don't add to AI token allowance ❌ **CRITICAL**

---

## ✅ WHAT'S WORKING: 90% Warning System

### Backend: Fair Usage Guards

**File**: `lib/billing/fair-usage-guards.ts`

```typescript
// Lines 136-151
const percentage = Math.round((usage.tokensUsed / usage.tokensLimit) * 100)
const isWarning = percentage >= 90

return {
  allowed: true,
  used: usage.tokensUsed,
  limit: usage.tokensLimit,
  percentage,
  isWarning,
  reason: isWarning
    ? `Warning: ${percentage}% of AI tokens used (${usage.tokensUsed.toLocaleString()}/${usage.tokensLimit.toLocaleString()})`
    : undefined,
}
```

**Triggers**: When token usage hits 90% of monthly limit  
**Action**: Returns `isWarning: true` with warning message

---

### API Response Integration

**File**: `app/api/ai/generate-stories/route.ts` (lines 138-144)

```typescript
return NextResponse.json({
  success: true,
  stories: response.stories,
  count: response.stories.length,
  usage: response.usage,
  fairUsageWarning: aiCheck.isWarning ? aiCheck.reason : undefined,
});
```

**All AI endpoints return**: `fairUsageWarning` field when at 90%+

**Protected Endpoints**:
- ✅ `/api/ai/generate-stories` - Returns warning
- ✅ `/api/ai/generate-epic` - Returns warning  
- ✅ `/api/ai/validate-story` - Returns warning
- ✅ `/api/ai/analyze-document` - Returns warning + logs
- ✅ `/api/stories/[storyId]/ai-split-suggestions` - Returns warning

---

### Frontend: Warning Display Components

#### 1. UsageWarningBanner Component ✅

**File**: `components/billing/UsageWarningBanner.tsx`

```typescript
// Only shows at 90%+
if (percentage < 90) return null

const isBlocked = percentage >= 100
```

**Features**:
- Shows at 90% (yellow warning)
- Shows at 100% (red blocked)
- Displays: "You've used X of Y tokens (90%)"
- CTA: "View Plans" button → `/settings/billing`
- Message: "Consider upgrading to avoid interruptions"

**Usage**: Rendered in `/settings/billing` page (lines 226-248)

---

#### 2. Usage Dashboard Component ✅

**File**: `components/usage-dashboard.tsx`

**Features**:
- Real-time token usage display
- Progress bars with color coding:
  - Green: < 75%
  - Yellow: 75-89%
  - Red: 90%+
- Shows at 50%+ usage: "Need More Tokens?" section (line 284)
- Two CTAs:
  - "Buy Token Package" → purchase flow
  - "Or Upgrade Plan" → pricing page

---

#### 3. BlockedModal Component ✅

**File**: `components/billing/BlockedModal.tsx`

**Shown when**: AI operations blocked (100% usage)

**Features**:
- Progress bar showing 100%
- Error message from API
- Three options:
  1. Upgrade to higher plan
  2. Wait for billing period reset
  3. Manage subscription
- Two CTAs:
  - "Manage Plan" → `/settings/billing`
  - "Upgrade Now" → pricing page

---

## ✅ WHAT'S WORKING: Booster Package Purchase UI

### 1. Token Package Constants ✅

**File**: `lib/constants.ts` (lines 660-679)

```typescript
export const TOKEN_PACKAGES = {
  small: {
    tokens: 50000,
    price: 5, // $5
    displayName: '50K Tokens',
    description: '~50 story generations',
  },
  medium: {
    tokens: 150000,
    price: 12, // $12 (20% discount)
    displayName: '150K Tokens',
    description: '~150 story generations',
  },
  large: {
    tokens: 500000,
    price: 35, // $35 (30% discount)
    displayName: '500K Tokens',
    description: '~500 story generations',
  },
}
```

---

### 2. Purchase Flow ✅

**File**: `app/settings/billing/page.tsx` (lines 122-149, 400-497)

**UI Elements**:
- Three token package cards displayed
- Pricing: $5, $12, $35
- Savings badges: "Best Value", "Save 20%", "Save 30%"
- Purchase buttons with loading states

**Purchase Function**:
```typescript
const handlePurchaseTokens = async (packageSize: 'small' | 'medium' | 'large') => {
  const response = await fetch('/api/stripe/purchase-tokens', {
    method: 'POST',
    body: JSON.stringify({ packageSize }),
  })
  
  const data = await response.json()
  
  // Redirect to Stripe Checkout
  if (data.url) {
    window.location.href = data.url
  }
}
```

---

### 3. Stripe Checkout API ✅

**File**: `app/api/stripe/purchase-tokens/route.ts`

**Flow**:
1. Receives `packageSize` (small/medium/large)
2. Gets token package details from constants
3. Creates Stripe Checkout session
4. Metadata includes:
   - `type: 'token_purchase'`
   - `organizationId`
   - `tokens` amount
   - `packageSize`
5. Redirects user to Stripe
6. Success URL: `/settings/billing?success=tokens`

---

### 4. Stripe Webhook Handler ✅

**File**: `app/api/webhooks/stripe/route.ts` (lines 420-432)

```typescript
// Process token purchase
if (metadata?.type === 'token_purchase') {
  const organizationId = metadata.organizationId
  const tokens = parseInt(metadata.tokens || '0')
  
  const { addPurchasedTokens } = await import('@/lib/services/ai-usage.service')
  await addPurchasedTokens(organizationId, tokens, session.id)
  
  console.log(`Added ${tokens} tokens to organization ${organizationId}`)
}
```

**Triggers**: When Stripe `checkout.session.completed` event received  
**Action**: Calls `addPurchasedTokens()` to add tokens

---

### 5. Token Balance Storage ✅

**Database Table**: `token_balances`

**Schema** (`lib/db/schema.ts` lines 650-666):
```typescript
export const tokenBalances = pgTable('token_balances', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 36 }).notNull().unique(),
  purchasedTokens: integer('purchased_tokens').default(0).notNull(),
  usedTokens: integer('used_tokens').default(0).notNull(),
  bonusTokens: integer('bonus_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  lastPurchaseAt: timestamp('last_purchase_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

**Add Tokens Function** (`lib/services/ai-usage.service.ts` lines 299-336):
```typescript
export async function addPurchasedTokens(
  organizationId: string,
  tokens: number,
  _stripeTransactionId: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(tokenBalances)
    .where(eq(tokenBalances.organizationId, organizationId))
    .limit(1);

  if (!existing) {
    // Create new balance
    await db.insert(tokenBalances).values({
      id: generateId(),
      organizationId,
      purchasedTokens: tokens,
      usedTokens: 0,
      bonusTokens: 0,
      totalTokens: tokens,
      lastPurchaseAt: new Date(),
    });
  } else {
    // Update existing balance
    const newPurchasedTokens = existing.purchasedTokens + tokens;
    const newTotalTokens = newPurchasedTokens + existing.bonusTokens - existing.usedTokens;

    await db.update(tokenBalances).set({
      purchasedTokens: newPurchasedTokens,
      totalTokens: newTotalTokens,
      lastPurchaseAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(tokenBalances.organizationId, organizationId));
  }
}
```

**✅ This function works correctly** - adds tokens to database

---

## ❌ CRITICAL GAP: Purchased Tokens Not Used as Allowance

### The Problem

**Fair usage guards don't check purchased tokens!**

**File**: `lib/billing/fair-usage-guards.ts`

**Current Implementation**:
```typescript
export async function canUseAI(
  organizationId: string,
  tokensRequired: number
): Promise<FairUsageCheck> {
  const usage = await getOrCreateWorkspaceUsage(organizationId) // ❌ Only checks monthly allowance
  
  const tokensRemaining = usage.tokensLimit - usage.tokensUsed
  
  // ❌ NEVER checks tokenBalances table!
  // ❌ Purchased tokens are ignored!
  
  if (tokensRemaining <= 0) {
    return {
      allowed: false,
      reason: "AI token limit reached..."
    }
  }
}
```

**What's Checked**: Only `workspaceUsage.tokensUsed` vs `workspaceUsage.tokensLimit`  
**What's Ignored**: Entire `tokenBalances` table with purchased tokens  

---

### Impact

**Scenario**:
1. User on Free tier (20,000 tokens/month)
2. Uses 20,000 tokens → **BLOCKED**
3. Purchases 50,000 token booster for $5
4. Tokens added to `tokenBalances` table ✅
5. User tries AI generation → **STILL BLOCKED** ❌
6. System never checks purchased token balance ❌

**Result**: User paid $5 but can't use AI features! ❌❌❌

---

## 🔧 REQUIRED FIX

### Modify `canUseAI` Function

**File**: `lib/billing/fair-usage-guards.ts`

**Add this logic**:

```typescript
export async function canUseAI(
  organizationId: string,
  tokensRequired: number
): Promise<FairUsageCheck> {
  const usage = await getOrCreateWorkspaceUsage(organizationId)
  const tokensRemaining = usage.tokensLimit - usage.tokensUsed
  
  // ✅ NEW: Check if purchased tokens available
  if (tokensRemaining <= 0 || tokensRemaining < tokensRequired) {
    // Check purchased token balance
    const { getTokenBalance } = await import('@/lib/services/ai-usage.service')
    const purchasedBalance = await getTokenBalance(organizationId)
    
    if (purchasedBalance >= tokensRequired) {
      // User has purchased tokens available
      return {
        allowed: true,
        used: usage.tokensUsed,
        limit: usage.tokensLimit,
        percentage: 100,
        isWarning: false,
        reason: `Using purchased tokens (${purchasedBalance.toLocaleString()} available)`,
        purchasedTokensUsed: true, // New flag
      }
    }
    
    // No monthly tokens AND no purchased tokens
    return {
      allowed: false,
      used: usage.tokensUsed,
      limit: usage.tokensLimit,
      percentage: 100,
      isWarning: false,
      reason: `AI token limit reached. Purchase more tokens or upgrade your plan.`,
      upgradeUrl: '/settings/billing',
    }
  }
  
  // Has monthly tokens remaining
  const percentage = Math.round((usage.tokensUsed / usage.tokensLimit) * 100)
  const isWarning = percentage >= 90
  
  return {
    allowed: true,
    used: usage.tokensUsed,
    limit: usage.tokensLimit,
    percentage,
    isWarning,
    reason: isWarning
      ? `Warning: ${percentage}% of monthly tokens used`
      : undefined,
  }
}
```

---

### Update `incrementTokenUsage` Function

**File**: `lib/billing/fair-usage-guards.ts`

**Current**: Only increments `workspaceUsage.tokensUsed`  
**Needed**: Deduct from purchased tokens if monthly limit exceeded

```typescript
export async function incrementTokenUsage(
  organizationId: string,
  tokensUsed: number
): Promise<void> {
  const { start } = getCurrentBillingPeriod()
  
  // Get current usage
  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(
      and(
        eq(workspaceUsage.organizationId, organizationId),
        eq(workspaceUsage.billingPeriodStart, start)
      )
    )
    .limit(1)
  
  if (!usage) return
  
  // ✅ NEW: If over monthly limit, deduct from purchased tokens
  if (usage.tokensUsed >= usage.tokensLimit) {
    const { deductTokens } = await import('@/lib/services/ai-usage.service')
    await deductTokens(organizationId, tokensUsed)
    console.log(`Deducted ${tokensUsed} from purchased token balance`)
    return
  }
  
  // ✅ NEW: If this push would exceed limit, split between monthly and purchased
  const remaining = usage.tokensLimit - usage.tokensUsed
  if (tokensUsed > remaining) {
    // Use remaining monthly tokens
    await db.update(workspaceUsage).set({
      tokensUsed: usage.tokensLimit,
      updatedAt: new Date(),
    }).where(
      and(
        eq(workspaceUsage.organizationId, organizationId),
        eq(workspaceUsage.billingPeriodStart, start)
      )
    )
    
    // Deduct overflow from purchased tokens
    const overflow = tokensUsed - remaining
    const { deductTokens } = await import('@/lib/services/ai-usage.service')
    await deductTokens(organizationId, overflow)
    console.log(`Split usage: ${remaining} monthly + ${overflow} purchased`)
    return
  }
  
  // Normal case: under monthly limit
  await db.update(workspaceUsage).set({
    tokensUsed: sql`${workspaceUsage.tokensUsed} + ${tokensUsed}`,
    updatedAt: new Date(),
  }).where(
    and(
      eq(workspaceUsage.organizationId, organizationId),
      eq(workspaceUsage.billingPeriodStart, start)
    )
  )
}
```

---

## 📊 VALIDATION CHECKLIST

### Current State ✅/❌

- [x] ✅ 90% warning triggers at backend
- [x] ✅ API returns `fairUsageWarning` field
- [x] ✅ `UsageWarningBanner` component displays warnings
- [x] ✅ `BlockedModal` shown when 100%
- [x] ✅ Token packages defined ($5, $12, $35)
- [x] ✅ Purchase UI in billing page
- [x] ✅ Stripe checkout integration working
- [x] ✅ Webhook handles `token_purchase` events
- [x] ✅ `addPurchasedTokens` function works
- [x] ✅ Tokens stored in `token_balances` table
- [ ] ❌ **`canUseAI` checks purchased tokens** ← **MISSING**
- [ ] ❌ **`incrementTokenUsage` deducts from purchased tokens** ← **MISSING**
- [ ] ❌ **Frontend shows purchased token balance** ← **MISSING**
- [ ] ❌ **Usage dashboard includes purchased tokens** ← **MISSING**

---

## 🧪 TESTING SCENARIOS

### Test 1: 90% Warning (Should Work ✅)

```bash
# Set org to 90% usage
psql $DATABASE_URL -c "UPDATE workspace_usage SET tokens_used = 18000, tokens_limit = 20000 WHERE organization_id = 'ORG_ID';"

# Make AI request
curl -X POST /api/ai/generate-stories -d '{...}'

# Expected: 200 with fairUsageWarning in response ✅
{
  "success": true,
  "stories": [...],
  "fairUsageWarning": "Warning: 90% of AI tokens used (18,000/20,000)"
}
```

---

### Test 2: 100% Block Then Purchase (Currently Broken ❌)

```bash
# Step 1: Set to 100% usage
psql $DATABASE_URL -c "UPDATE workspace_usage SET tokens_used = 20000, tokens_limit = 20000 WHERE organization_id = 'ORG_ID';"

# Step 2: Try AI request - should block
curl -X POST /api/ai/generate-stories -d '{...}'
# Expected: 402 Payment Required ✅ (This works)

# Step 3: Purchase 50K token booster via Stripe
# (Manually trigger webhook or use Stripe test mode)

# Step 4: Check token_balances table
psql $DATABASE_URL -c "SELECT * FROM token_balances WHERE organization_id = 'ORG_ID';"
# Expected: purchased_tokens = 50000, total_tokens = 50000 ✅ (This works)

# Step 5: Try AI request again
curl -X POST /api/ai/generate-stories -d '{...}'
# Expected: 200 with success ✅
# Actual: 402 still blocked ❌ ← **BUG**

# Reason: canUseAI() never checks token_balances table
```

---

### Test 3: Purchased Token Deduction (Currently Broken ❌)

```bash
# Given: User has 50K purchased tokens, monthly limit exhausted

# Make AI request using 5000 tokens
curl -X POST /api/ai/generate-stories -d '{...}'
# Expected: 200 success ✅

# Check token_balances
psql $DATABASE_URL -c "SELECT * FROM token_balances WHERE organization_id = 'ORG_ID';"
# Expected: used_tokens = 5000, total_tokens = 45000 ✅
# Actual: used_tokens = 0, total_tokens = 50000 ❌ ← **BUG**

# Reason: incrementTokenUsage() never calls deductTokens()
```

---

## 💰 REVENUE IMPACT

### Current Situation

**Users can purchase booster packages but they DON'T WORK**

**Customer Experience**:
1. User hits limit, sees "upgrade or purchase tokens"
2. User purchases $5 booster
3. Payment successful ✅
4. Tokens added to database ✅
5. User tries AI feature → **STILL BLOCKED** ❌
6. User contacts support → Refund/Chargeback ❌
7. User leaves bad review ❌

**Business Impact**:
- 🚫 Payment fraud/refund risk
- 🚫 Negative user experience
- 🚫 Wasted Stripe transaction fees
- 🚫 Support ticket volume
- 🚫 Reputation damage

---

## 🎯 RECOMMENDED ACTION PLAN

### Priority: **CRITICAL** 🚨

**Timeline**: Fix immediately before launch

### Steps

1. **Implement Fix** (2-4 hours)
   - Modify `canUseAI()` to check `tokenBalances`
   - Modify `incrementTokenUsage()` to deduct from purchased tokens
   - Add `purchasedTokensAvailable` to usage API responses

2. **Update Frontend** (1-2 hours)
   - Show purchased token balance in Usage Dashboard
   - Display in warning banners
   - Add "Using purchased tokens" indicator

3. **Test Thoroughly** (2 hours)
   - Test purchase flow end-to-end
   - Verify token deduction
   - Test edge cases (exactly 0 balance, etc.)

4. **Deploy** (30 min)
   - Run database migration if needed
   - Deploy backend changes
   - Deploy frontend changes

5. **Verify Production** (1 hour)
   - Test in production with small purchase
   - Monitor logs
   - Check Sentry for errors

---

## 📝 MIGRATION NEEDED?

**Database**: No migration needed ✅  
- `token_balances` table already exists
- All functions already exist
- Just need to wire them together

**Code Changes Only**: Yes ✅

---

## 🔍 ALTERNATIVE: Disable Purchases Until Fixed

### Option A: Hide Purchase UI
```typescript
// In app/settings/billing/page.tsx
const ENABLE_TOKEN_PURCHASES = false // Temporarily disable

{ENABLE_TOKEN_PURCHASES && (
  <Card>
    <CardHeader>
      <CardTitle>Token Booster Packs</CardTitle>
    </CardHeader>
    {/* ... purchase UI ... */}
  </Card>
)}
```

### Option B: Show "Coming Soon" Message
```typescript
<Card>
  <CardHeader>
    <CardTitle>Token Booster Packs</CardTitle>
    <Badge variant="secondary">Coming Soon</Badge>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">
      One-time token purchases will be available soon. 
      For now, please upgrade your plan for more AI tokens.
    </p>
  </CardContent>
</Card>
```

---

## ✅ SUMMARY

**90% Warning System**: ✅ Fully Working  
**Booster Package Purchase UI**: ✅ Fully Working  
**Stripe Integration**: ✅ Fully Working  
**Token Storage**: ✅ Fully Working  
**Token Usage**: ❌ **NOT WORKING - CRITICAL BUG**

**Root Cause**: `canUseAI()` and `incrementTokenUsage()` don't check/use purchased tokens

**Fix Required**: Connect existing functions together (2 code changes)

**Impact**: Without fix, users pay for tokens but can't use them

**Recommendation**: Either fix immediately or disable purchase UI until fixed

---

**End of Validation Report**

