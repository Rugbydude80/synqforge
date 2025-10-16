# SynqForge Advanced AI Implementation Progress

**Implementation Date:** 16 October 2025
**Specification:** v1.0 - Advanced AI Production Spec
**Status:** Phase 1-2 Complete, Phase 3-5 In Progress

---

## ✅ COMPLETED: Phase 1 - Database Schema & Infrastructure

### Database Schema Updates

**New Enums Added:**
- `subscription_tier`: Updated to `['free', 'team', 'business', 'enterprise']`
- `role`: Updated to `['owner', 'admin', 'member', 'viewer']`
- `autopilot_job_status`: For Backlog Autopilot job tracking
- `validation_rule_type`: For AC Validator rules
- `artefact_type`: For test generation outputs
- `agent_status` & `agent_action_status`: For Workflow Agents
- `pii_type`: For PII detection
- `ai_model_tier`: For model controls
- `billing_interval`: For monthly/annual billing

**New Tables Created (24 tables):**

1. **Billing & Seats**
   - `organization_seats` - Seat allocation tracking
   - `stripe_subscriptions` - Enhanced with seat fields

2. **AI Usage Metering**
   - `ai_usage_metering` - Pooled token tracking per billing period
   - `ai_usage_alerts` - Usage threshold alerts (50%, 80%, 95%, 100%)

3. **Advanced AI: Backlog Autopilot**
   - `autopilot_jobs` - Job queue, review system, duplicate detection

4. **Advanced AI: AC Validator**
   - `ac_validation_rules` - Configurable validation rules
   - `ac_validation_results` - Validation results with auto-fix proposals

5. **Advanced AI: Test & Artefact Generation**
   - `test_artefacts` - Generated Gherkin, Postman, Playwright tests

6. **Advanced AI: Planning & Forecasting**
   - `sprint_forecasts` - Velocity, spillover probability, confidence bands

7. **Advanced AI: Effort & Impact Scoring**
   - `effort_scores` - Story point suggestions with reasoning
   - `impact_scores` - RICE/WSJF scoring with lock capability

8. **Advanced AI: Knowledge Search (RAG)**
   - `knowledge_embeddings` - Vector storage for semantic search
   - `knowledge_searches` - Search history and results

9. **Advanced AI: Inbox to Backlog**
   - `inbox_parsing` - Slack/Teams/email parsing with PII detection

10. **Advanced AI: Repo Awareness**
    - `git_integrations` - Git provider connections
    - `pr_summaries` - PR analysis, drift detection

11. **Advanced AI: Workflow Agents**
    - `workflow_agents` - Agent definitions with policies
    - `agent_actions` - Action queue with approval workflow

12. **Advanced AI: Governance & Compliance**
    - `pii_detections` - PII flagging and masking
    - `audit_logs` - Comprehensive audit trail

13. **Advanced AI: Model Controls**
    - `ai_model_policies` - Per-feature model selection and optimization

**Migration Status:**
- ✅ Schema generated: `0009_advanced_ai_schema.sql`
- ✅ Data migration completed: Migrated 4 organizations from `pro` to `team` tier
- ✅ Database pushed successfully to production

---

## ✅ COMPLETED: Phase 2.1-2.4 - Services & Pricing

### 2.1 Seat Management Service
**File:** `lib/services/seat-management.service.ts`

**Features:**
- Get organization seat information (included, addon, active, pending)
- Check if seats are available for new users
- Reserve seats automatically with addon allocation
- Add/remove addon seats with validation
- Sync seats from Stripe subscriptions
- Calculate seat costs dynamically

**Key Functions:**
- `getOrganizationSeats()` - Complete seat breakdown
- `canAddSeat()` - Quick availability check
- `reserveSeat()` - Auto-provision for new users
- `addAddonSeats()` - Add paid seats
- `removeAddonSeats()` - Remove seats with safety checks
- `syncSeatsFromStripe()` - Keep in sync with Stripe

### 2.2 AI Usage Metering Service
**File:** `lib/services/ai-metering.service.ts`

**Features:**
- Pooled token tracking per workspace per billing period
- Automatic monthly reset with cron job support
- Overage calculation (£2 per 100k tokens)
- Four-tier alert system (50%, 80%, 95%, 100%)
- Rate limiting support (60 AI actions/min, 6 heavy jobs/min)
- Usage statistics for analytics

**Key Functions:**
- `getOrCreateUsageMetering()` - Get current period usage
- `checkTokenAvailability()` - Pre-flight check before AI actions
- `recordTokenUsage()` - Track usage and trigger alerts
- `resetMonthlyUsage()` - Monthly reset (cron job)
- `getUsageStatistics()` - Analytics data

### 2.3 Subscription Helper Utilities
**File:** `lib/utils/subscription.ts`

**Features:**
- Type-safe subscription feature checks
- Upgrade messaging and recommendations
- Tier comparison and upgrade paths
- Price calculations (monthly/annual)
- Annual savings calculator

**Key Functions:**
- `getSubscriptionFeatures()` - Get all features for a tier
- `hasFeature()` - Check if feature available
- `getUpgradeMessage()` - Context-aware upgrade prompts
- `needsUpgrade()` - Tier comparison
- `getTierPrice()` - Dynamic pricing
- `calculateAnnualSavings()` - Show savings potential

### 2.4 Updated Pricing Page
**File:** `app/pricing/page.tsx`

**New Pricing Structure:**

| Tier | Price | Seats | Tokens | Advanced AI Modules |
|------|-------|-------|--------|---------------------|
| **Free** | £0 | 2 included | 20k/month | None |
| **Team** | £49/mo | 5 + £9/seat | 300k/month | Modules 1-6 |
| **Business** | £149/mo | 10 + £12/seat | 1M/month | Modules 1-7 |
| **Enterprise** | Custom | 20+ custom | 5M+/month | All 12 modules |

**Annual Pricing:**
- Team: £490/year (save £98 - 2 months free)
- Business: £1,490/year (save £298 - 2 months free)

**Updated Features:**
- Team: Autopilot, AC Validator, Test Gen, Planning, Effort Scoring, Knowledge Search
- Business: All Team + Inbox Parsing, API access
- Enterprise: All Business + Repo Awareness, Agents, Governance, Model Controls, SSO/SCIM

---

## 📊 Updated Constants & Configuration

**File:** `lib/constants.ts`

**New Subscription Limits:**
```typescript
SUBSCRIPTION_LIMITS = {
  free: {
    maxSeats: 2,
    monthlyAITokens: 20000,
    canUse*: false (all Advanced AI modules)
  },
  team: {
    includedSeats: 5,
    seatPrice: 9,
    monthlyAITokens: 300000,
    canUse*: true (modules 1-6)
  },
  business: {
    includedSeats: 10,
    seatPrice: 12,
    monthlyAITokens: 1000000,
    canUse*: true (modules 1-7)
  },
  enterprise: {
    includedSeats: 20,
    monthlyAITokens: 5000000,
    canUse*: true (all 12 modules)
  }
}
```

**AI Overage Pricing:**
```typescript
AI_OVERAGE = {
  pricePerUnit: 2, // £2 per 100k tokens
  unitSize: 100000,
  threshold: 1.1 // Bill when >110% of pool
}
```

---

## 🔄 NEXT STEPS: Phase 2.5-2.7 (Billing & Trials)

### 2.5 Update Stripe Integration
**TODO:**
- Update webhook handler for new tiers (team/business)
- Add seat addon subscription items
- Implement overage metering and billing
- Handle trial period logic (14 days for Team/Business)
- Update checkout session with trial configuration

### 2.6 Build Billing Settings Page
**TODO:**
- Create `/app/settings/billing/page.tsx`
- Display current plan and seats
- Show AI token usage meter with alerts
- Seat management UI (add/remove seats)
- Invoice history
- Cancel/upgrade flows

### 2.7 Implement Trial System & Upgrade Nudges
**TODO:**
- Trial middleware to track trial status
- Auto-downgrade to Free when trial expires (if no payment method)
- Upgrade nudges at:
  - User #3 invitation (Free → Team)
  - Export click (Free → Team)
  - 90% token usage (current → next tier)
  - SSO settings toggle (Business → Enterprise)
- In-app upgrade modals with plan comparison

---

## 🚧 REMAINING WORK: Phase 3-5

### Phase 3: Permissions & Feature Gating
- Extend permission system for Owner role
- Create feature gate middleware
- Add client-side paywall components
- Implement rate limiting for AI actions (60/min, 6 heavy/min)
- Usage alerts and notifications

### Phase 4: Advanced AI Modules (12 modules)
Each module requires:
- Service implementation
- API endpoints
- UI components
- Acceptance criteria validation

**Module List:**
1. Backlog Autopilot ⏳
2. AC Validator ⏳
3. Test & Artefact Generation ⏳
4. Planning & Forecasting ⏳
5. Effort & Impact Scoring ⏳
6. Knowledge Search (RAG) ⏳
7. Inbox to Backlog ⏳
8. Repo Awareness (Enterprise) ⏳
9. Workflow Agents (Enterprise) ⏳
10. Governance & Compliance (Enterprise) ⏳
11. Model Controls & Cost Protection (Enterprise) ⏳
12. Analytics & Explainability ⏳

### Phase 5: Security, Compliance & Production
- PII detection and redaction
- Comprehensive audit logging
- SSO/SCIM integration
- Data residency controls
- Analytics dashboard
- Observability (logging, tracing, alerting)
- Production smoke tests
- Documentation updates

---

## 📈 Progress Summary

**Completion Status:**
- ✅ Phase 1: Database Schema - **100% Complete**
- ✅ Phase 2.1-2.4: Services & Pricing - **100% Complete**
- ⏳ Phase 2.5-2.7: Billing & Trials - **0% Complete**
- ⏳ Phase 3: Permissions & Gating - **0% Complete**
- ⏳ Phase 4: Advanced AI Modules - **0% Complete** (Infrastructure ready)
- ⏳ Phase 5: Security & Production - **0% Complete**

**Overall Progress:** ~25% Complete

**Time Estimate:**
- Phase 2.5-2.7: 1-2 days
- Phase 3: 2-3 days
- Phase 4: 10-15 days (largest phase)
- Phase 5: 5-7 days

**Total Estimated Time Remaining:** 18-27 days of development work

---

## 🎯 Acceptance Criteria Status

### Phase 1 & 2 AC Status:

**Database:**
- ✅ All 24 new tables created with proper indexing
- ✅ All enums extended (subscription_tier, role, etc.)
- ✅ Data migration from "pro" to "team" completed
- ✅ No breaking changes to existing data

**Seat Management:**
- ✅ Track included + addon seats per organization
- ✅ Prevent downgrade if seats in use
- ✅ Calculate costs dynamically based on tier
- ✅ Sync with Stripe subscriptions

**AI Metering:**
- ✅ Pooled token tracking at workspace level
- ✅ Automatic monthly reset support
- ✅ Overage calculation (£2/100k tokens)
- ✅ Four-tier alert system (50/80/95/100%)
- ✅ Free tier blocks overage usage

**Pricing Page:**
- ✅ Four tiers displayed (Free/Team/Business/Enterprise)
- ✅ Correct pricing (£0/£49/£149/Custom)
- ✅ Seat information with addon pricing
- ✅ Annual savings shown for Team/Business
- ✅ Feature lists match spec
- ✅ Trial CTAs for paid tiers

---

## 📝 Notes & Decisions

1. **Tier Migration:** Existing "pro" users migrated to "team" as Team is the closest equivalent
2. **Token Pooling:** All tokens pooled at workspace level (not per-user) as specified
3. **Overage Billing:** 10% threshold before billing (spec: "threshold 10% over pool")
4. **Seat Pricing:** Team £9/seat, Business £12/seat (spec-accurate)
5. **Currency:** All pricing in GBP as specified
6. **Vector Storage:** knowledge_embeddings table uses JSON for now, can migrate to pgvector later
7. **Rate Limits:** Implemented in constants, middleware integration pending

---

## 🔗 Related Files

**Database:**
- `lib/db/schema.ts` - Main schema with all 45 tables
- `scripts/migrate-subscription-tiers.ts` - Data migration script
- `drizzle/migrations/0009_advanced_ai_schema.sql` - Generated migration

**Services:**
- `lib/services/seat-management.service.ts` - Seat management
- `lib/services/ai-metering.service.ts` - Token metering
- `lib/utils/subscription.ts` - Subscription helpers

**Configuration:**
- `lib/constants.ts` - Updated subscription limits and pricing

**UI:**
- `app/pricing/page.tsx` - Updated pricing page

**Existing Integrations:**
- `app/api/webhooks/stripe/route.ts` - Stripe webhook handler (needs update)
- `app/api/stripe/create-checkout-session/route.ts` - Checkout (needs update)
- `lib/services/ai.service.ts` - AI service (ready for integration)

---

## 🚀 Next Action Items

**Immediate (Phase 2.5-2.7):**
1. Update Stripe webhook to handle team/business tiers
2. Add trial logic to checkout session
3. Build billing settings page with usage meters
4. Implement upgrade nudge system
5. Add seat management UI

**Short-term (Phase 3):**
6. Create feature gate middleware
7. Build paywall UI components
8. Implement rate limiting
9. Add usage alert notifications

**Medium-term (Phase 4):**
10. Implement first 3 AI modules as MVP
11. Build module UI components
12. Add module API endpoints
13. Test acceptance criteria

---

**Last Updated:** 16 October 2025
**Next Review:** After Phase 2.7 completion
