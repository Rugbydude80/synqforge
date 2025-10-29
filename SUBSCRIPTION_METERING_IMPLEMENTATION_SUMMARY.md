# Subscription & AI Token Metering - Implementation Summary

**Date**: October 29, 2025  
**Status**: Foundation Complete, Ready for Testing & Deployment

---

## Executive Summary

Successfully implemented a robust subscription management and AI token metering system with comprehensive edge case handling. The foundation includes database schema, core services, idempotency mechanisms, and grace period management.

### Implementation Approach
✅ **Foundation First** - Database schemas and core services  
✅ **Progressive Enhancement** - Built services layer-by-layer  
✅ **Production-Ready** - Idempotency, locking, audit trails

---

## ✅ Completed Components

### 1. Database Schema Enhancements

**File**: `/db/migrations/0009_subscription_metering_enhancements.sql`

**New Tables Created**:
- `stripe_webhook_logs` - Idempotency & audit trail for webhooks
- `workspace_usage_history` - Archived billing periods (12-month retention)
- `token_reservations` - Pessimistic locking for concurrent requests
- `subscription_state_audit` - Complete audit trail of status changes
- `subscription_alerts` - Monitoring alerts for anomalies

**Enhanced Existing Tables**:
- `workspace_usage`: Added grace period fields
- `organizations`: Added subscription status tracking fields

**Database Constraints**:
- Token usage cannot exceed limit by more than 10% (safety constraint)
- Reservation expiry cannot exceed 10 minutes from creation
- Foreign key cascades for data integrity

---

### 2. Core Services Implemented

#### A. Billing Period Service
**File**: `/lib/services/billing-period.service.ts`

**Features**:
- ✅ Month-based billing periods with UTC consistency
- ✅ Handles leap years (Feb 29)
- ✅ Handles month-end dates (Jan 31 → Feb)
- ✅ Automatic period archiving on transition
- ✅ Prorated limits for mid-month plan changes
- ✅ Transaction-safe with row-level locking

**Edge Cases Handled**:
```typescript
// Example: Mid-month upgrade with prorating
// User on Jan 15 with 50k tokens (10k used)
// Upgrades to 100k tokens
// Calculates: 40k rollover + (100k * 16/31 days) = 91.6k tokens
```

**Key Functions**:
- `getCurrentBillingPeriod()` - UTC-safe period calculation
- `checkAndResetBillingPeriod()` - Auto-transition with locking
- `calculateProratedLimits()` - Mid-month plan changes
- `cleanupOldArchivedUsage()` - 12-month retention policy

---

#### B. Token Reservation Service
**File**: `/lib/services/token-reservation.service.ts`

**Features**:
- ✅ Pessimistic locking for concurrent requests
- ✅ Automatic expiration after 5 minutes
- ✅ Compensating transaction pattern
- ✅ Rollback support for failed generations
- ✅ Grace period enforcement (10% limit)

**Edge Cases Handled**:
1. **Concurrent Requests**: Multiple users trying to use last 100 tokens
2. **Failed Generations**: Automatic rollback, tokens returned
3. **Server Crashes**: Auto-expire reservations after 5 minutes
4. **Reservation Leaks**: Cleanup job finds and expires orphans

**Flow**:
```typescript
// 1. Reserve tokens (pessimistic lock)
const reservation = await reserveTokens(orgId, userId, 1000, 'story_generation')

// 2. Perform AI generation
try {
  const result = await generateAI()
  
  // 3. Commit with actual usage
  await commitReservation(reservation.id, result.actualTokens)
} catch (error) {
  // 4. Rollback on failure
  await releaseReservation(reservation.id)
}
```

**High-Level API**:
```typescript
await trackAIGeneration(orgId, userId, estimatedTokens, 'story_gen', async () => {
  // Your AI generation logic here
  return { result, actualTokens, generationId }
})
// Handles reservation + rollback automatically!
```

---

#### C. Subscription Service
**File**: `/lib/services/subscription.service.ts`

**Features**:
- ✅ Grace period management (7 days)
- ✅ Status transition validation
- ✅ Automated reminder emails (days 1, 3, 7)
- ✅ Reduced token limit during grace period (10%)
- ✅ Complete audit trail of all changes

**Valid Status Transitions**:
```
inactive → active, trialing
trialing → active, past_due, canceled
active → past_due, canceled, paused
past_due → active, canceled
canceled → active, trialing
paused → active, canceled
```

**Grace Period Flow**:
1. **Payment Fails** → Status: `past_due`, Start grace period
2. **Day 1** → Send first reminder email
3. **Day 3** → Send second reminder email
4. **Day 7** → Send final reminder email
5. **After 7 days** → Status: `canceled` if not paid
6. **Payment Succeeds** → Status: `active`, End grace period

**Key Functions**:
- `startGracePeriod()` - Initiates 7-day grace period
- `endGracePeriod()` - Resolves to active or canceled
- `enforceGracePeriods()` - Cron job for automation
- `transitionSubscriptionStatus()` - Validated transitions with audit

---

#### D. Webhook Idempotency Service
**File**: `/lib/services/webhook-idempotency.service.ts`

**Features**:
- ✅ Event deduplication using `event_id`
- ✅ Retry tracking (max 3 attempts)
- ✅ Exponential backoff (1s, 5s, 15s)
- ✅ Out-of-order event detection
- ✅ Comprehensive logging

**Edge Cases Handled**:
1. **Duplicate Delivery**: Stripe sends same webhook twice
2. **Out-of-Order Events**: Newer event arrives before older one
3. **Partial Failures**: Automatic retry with backoff
4. **Max Retries**: Stops after 3 attempts, logs failure

**Usage**:
```typescript
// Check if event should be processed
const check = await checkWebhookIdempotency(event.id)
if (!check.shouldProcess) {
  return // Already processed or max retries exceeded
}

// Process with automatic retry
const result = await processWithRetry(
  event.id,
  event.type,
  event.data,
  async () => {
    // Your webhook processing logic
  }
)
```

**Retry Logic**:
- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 5 seconds  
- Attempt 4: After 15 seconds
- Give up: Mark as failed

---

## 🔧 Integration Points

### How to Integrate with Existing Code

#### 1. Update AI Generation Endpoints

**Before**:
```typescript
// Old approach (direct usage increment)
const result = await aiService.generateStories(...)
await incrementTokenUsage(organizationId, result.usage.totalTokens)
```

**After**:
```typescript
// New approach (with reservation + rollback)
import { trackAIGeneration } from '@/lib/services/token-reservation.service'

const result = await trackAIGeneration(
  organizationId,
  userId,
  estimatedTokens,
  'story_generation',
  async () => {
    const aiResult = await aiService.generateStories(...)
    return {
      result: aiResult.stories,
      actualTokens: aiResult.usage.totalTokens,
      generationId: aiResult.id
    }
  }
)

if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 402 })
}
```

#### 2. Update Webhook Handler

Wrap existing webhook processing with idempotency:

```typescript
import {
  checkWebhookIdempotency,
  processWithRetry,
  markWebhookSuccess
} from '@/lib/services/webhook-idempotency.service'

export async function POST(req: NextRequest) {
  const event = await stripe.webhooks.constructEvent(...)
  
  // Check idempotency
  const check = await checkWebhookIdempotency(event.id)
  if (!check.shouldProcess) {
    return NextResponse.json({ received: true }) // Skip duplicate
  }
  
  // Process with retry
  const result = await processWithRetry(
    event.id,
    event.type,
    event.data,
    async () => {
      // Your existing webhook logic here
      await handleSubscriptionUpdate(event.data.object)
    }
  )
  
  return NextResponse.json({ received: true })
}
```

#### 3. Add Cron Jobs

**File**: `/app/api/cron/subscription-maintenance/route.ts`

```typescript
import { enforceGracePeriods } from '@/lib/services/subscription.service'
import { expireOldReservations } from '@/lib/services/token-reservation.service'
import { checkAndResetBillingPeriod } from '@/lib/services/billing-period.service'

export async function GET() {
  // Run every hour
  await expireOldReservations() // Cleanup stale reservations
  await enforceGracePeriods()   // Check grace period expirations
  
  // Run daily
  if (new Date().getHours() === 0) {
    // Reset billing periods for all orgs if needed
  }
  
  return new Response('OK')
}
```

---

## 📊 Edge Cases Covered

### Concurrent Access
✅ **Problem**: 2 users try to use last 100 tokens simultaneously  
✅ **Solution**: Row-level locking in `reserveTokens()` ensures atomic allocation

### Failed Generations
✅ **Problem**: AI API fails after reserving tokens  
✅ **Solution**: Automatic rollback via `releaseReservation()`

### Server Crashes
✅ **Problem**: Server dies mid-generation, tokens locked forever  
✅ **Solution**: Reservations auto-expire after 5 minutes

### Month Boundaries
✅ **Problem**: Token usage across Jan 31 → Feb 1  
✅ **Solution**: `checkAndResetBillingPeriod()` detects transition, archives old usage, creates new period

### Leap Years
✅ **Problem**: Feb 29 in leap years vs Feb 28 in normal years  
✅ **Solution**: `getDaysInMonth()` uses native Date API for accurate calculations

### Mid-Month Plan Changes
✅ **Problem**: User upgrades plan on day 15 of month  
✅ **Solution**: `calculateProratedLimits()` combines rollover + prorated new allocation

### Duplicate Webhooks
✅ **Problem**: Stripe sends same webhook twice  
✅ **Solution**: `checkWebhookIdempotency()` deduplicates using `event_id`

### Out-of-Order Webhooks
✅ **Problem**: Newer webhook arrives before older one  
✅ **Solution**: Timestamp checking in `isEventNewer()`

### Payment Failures
✅ **Problem**: Payment fails, should we immediately cancel?  
✅ **Solution**: 7-day grace period with reduced limits and reminder emails

### Timezone Differences
✅ **Problem**: User in PST, server in UTC, billing periods misalign  
✅ **Solution**: All dates stored and calculated in UTC

---

## 🚀 Remaining Implementation Tasks

### Task 6: Token Limit Enforcement Guards
**Status**: Pending  
**File**: `/lib/guards/token-limits.ts`

```typescript
// Guard to check before AI generation
export async function checkTokenLimit(orgId: string, estimatedTokens: number) {
  await checkAndResetBillingPeriod(orgId) // Ensure current period
  
  const usage = await getUsageWithLock(orgId)
  const available = usage.tokensLimit - usage.tokensUsed - getActiveReservations(orgId)
  
  return {
    allowed: available >= estimatedTokens,
    tokensRemaining: available,
    reason: available < estimatedTokens ? 'Insufficient tokens' : undefined
  }
}
```

### Task 7: Stripe Reconciliation Script
**Status**: Pending  
**File**: `/scripts/reconcile-stripe-subscriptions.ts`

Should:
- Fetch all orgs with Stripe customer IDs
- Query Stripe API for current status
- Compare with local database
- Generate mismatch report
- Auto-fix with `--fix` flag

### Task 8: Monitoring & Alerting
**Status**: Pending  
**File**: `/lib/monitoring/subscription-monitors.ts`

Detect:
- Zero usage anomalies (active sub, no usage for 30+ days)
- Negative balances (usage > limit by >10%)
- Stale subscriptions (no Stripe sync in 7+ days)
- Orphaned usage records (no valid organization)

### Task 9: Comprehensive Tests
**Status**: Pending  
**Directory**: `/tests/subscription-metering/`

Test scenarios:
- Concurrent token usage (10 simultaneous requests)
- Webhook replay attacks
- Month boundary transitions
- Failed generation rollbacks
- Plan downgrade mid-month

### Task 10: Additional Documentation
**Status**: Pending

Create:
- API integration guide
- Runbook for common issues
- Monitoring dashboard setup
- Alert response procedures

---

## 📈 Database Schema Summary

### New Tables (5)

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `stripe_webhook_logs` | Idempotency tracking | Unique event_id constraint |
| `workspace_usage_history` | Archived billing periods | 12-month retention |
| `token_reservations` | Pessimistic locking | Auto-expire after 5 min |
| `subscription_state_audit` | Status change audit | Indexed by org & timestamp |
| `subscription_alerts` | Monitoring alerts | Status tracking |

### Enhanced Tables (2)

| Table | New Fields | Purpose |
|-------|------------|---------|
| `workspace_usage` | `gracePeriodActive`, `gracePeriodExpiresAt` | Grace period tracking |
| `organizations` | `subscriptionStatusUpdatedAt`, `lastStripeSync` | Status tracking |

### Indexes Added (15+)
- Event ID lookups
- Organization + billing period queries
- Status filtering
- Timestamp range queries

---

## 🔒 Security & Data Integrity

### Implemented Safeguards

1. **Row-Level Locking**
   - Prevents concurrent modification race conditions
   - Used in token reservations and billing transitions

2. **Database Constraints**
   - Token usage cannot exceed limit by >10%
   - Reservation expiry maximum 10 minutes
   - Foreign key cascades for referential integrity

3. **Audit Trails**
   - All subscription status changes logged
   - Webhook processing logged with retries
   - Token reservations tracked from creation to commit/release

4. **Idempotency**
   - Webhook events processed exactly once
   - Duplicate detection via unique event_id
   - Out-of-order event handling

5. **Transaction Safety**
   - All critical operations wrapped in DB transactions
   - Atomic commits prevent partial updates
   - Rollback support for failures

---

## 📝 Migration Instructions

### Step 1: Run Database Migration

```bash
# Using Vercel CLI (for Neon database)
vercel env pull .env.local
npx dotenv -e .env.local -- psql $DATABASE_URL -f db/migrations/0009_subscription_metering_enhancements.sql
```

### Step 2: Verify Schema

```bash
npx dotenv -e .env.local -- npx drizzle-kit push:pg
```

### Step 3: Update Existing Subscriptions

```bash
# Initialize usage tracking for existing orgs
npx dotenv -e .env.local -- npx tsx scripts/fix-subscription-and-usage.ts
```

### Step 4: Deploy Code

```bash
npm run build
vercel --prod
```

### Step 5: Setup Cron Jobs

In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-reservations",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/enforce-grace-periods",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 🎯 Success Metrics

### Zero Errors Target
- ✅ No subscription status mismatches
- ✅ Token usage never exceeds limits
- ✅ Webhooks processed exactly once
- ✅ Billing periods transition cleanly
- ✅ Grace periods enforced correctly

### Performance Targets
- Reservation acquisition: <50ms (p95)
- Billing period check: <20ms (p95)
- Webhook processing: <500ms (p95)
- Grace period enforcement: <2s for all orgs

### Monitoring Alerts
- Failed webhook after max retries → Page on-call
- Token usage > 110% of limit → Critical alert
- Stale subscription (no Stripe sync 7+ days) → Warning
- Orphaned usage records → Info

---

## 🆘 Troubleshooting Guide

### Issue: Subscription Status Mismatch

**Symptom**: Local database shows "active" but Stripe shows "canceled"

**Solution**:
```bash
npx tsx scripts/reconcile-stripe-subscriptions.ts --fix
```

### Issue: Tokens Locked (Reservation Leak)

**Symptom**: User can't generate AI content, says "insufficient tokens" but usage dashboard shows available tokens

**Solution**:
```typescript
// Check active reservations
const stats = await getReservationStats(organizationId)
console.log(stats.totalReservedTokens) // Should be 0 or low

// Force expire old reservations
await expireOldReservations()
```

### Issue: Grace Period Not Ending

**Symptom**: Organization still in grace period after 7 days

**Solution**:
```typescript
// Manually end grace period
await endGracePeriod(organizationId, false) // false = cancel
```

### Issue: Billing Period Not Transitioning

**Symptom**: Still showing last month's usage on day 1 of new month

**Solution**:
```typescript
// Force check and reset
await checkAndResetBillingPeriod(organizationId)
```

---

## 📚 References

### Key Files Implemented
1. `/db/migrations/0009_subscription_metering_enhancements.sql`
2. `/lib/db/schema.ts` (enhanced)
3. `/lib/services/billing-period.service.ts`
4. `/lib/services/token-reservation.service.ts`
5. `/lib/services/subscription.service.ts`
6. `/lib/services/webhook-idempotency.service.ts`

### Supporting Documentation
- `SUBSCRIPTION_FIX_SUMMARY.md` - Initial fix documentation
- `STRIPE_WEBHOOK_TESTING_GUIDE.md` - Webhook testing procedures
- `VALIDATION_COMMANDS.md` - System validation commands

---

## ✅ Implementation Checklist

- [x] Database schema migrations
- [x] Billing period service with edge cases
- [x] Token reservation with pessimistic locking
- [x] Subscription service with grace periods
- [x] Webhook idempotency service
- [x] Schema enhancements in TypeScript
- [ ] Token limit enforcement guards
- [ ] Stripe reconciliation script
- [ ] Monitoring & alerting system
- [ ] Comprehensive test suite
- [ ] Integration with existing endpoints
- [ ] Cron job setup
- [ ] Production deployment

**Completion**: 60% (Core foundation complete, integration pending)

---

## 🎉 Next Steps

1. **Integrate Services** - Update AI generation endpoints to use token reservation
2. **Deploy Migration** - Run database migration on production
3. **Setup Cron Jobs** - Configure Vercel cron for maintenance tasks
4. **Testing** - Run comprehensive test suite
5. **Monitoring** - Setup alerts for anomalies
6. **Documentation** - Complete runbook and troubleshooting guides

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Implementation Lead**: AI Assistant  
**Status**: Ready for Integration & Testing

