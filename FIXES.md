# TypeScript Strict Mode Fixes

This document outlines the classes of fixes applied to achieve strict TypeScript compliance.

## Summary

**Total errors fixed: ~150**
**Files affected: ~35**

## Categories of Fixes

### 1. **Unused Imports and Variables** (TS6133)
**Count:** ~25 errors

**Pattern:**
Variables/imports declared but never used, now caught by `noUnusedLocals: true`.

**Examples:**
- `app/api/ai/analyze-document/route.ts:9` - Removed unused `checkPageLimit`
- `app/api/ai/autopilot/route.ts:8` - Removed unused `retryAutopilotJob`
- `components/ai/test-generator-panel.tsx:12` - Removed unused `CheckCircle2`, `Badge`
- `lib/auth/sso.ts:7,105` - Removed unused `users`, `primaryEmail`
- `lib/services/backlog-autopilot.service.ts:8,26` - Removed unused `sql`, `MAX_FILE_SIZE`

**Fix:** Remove unused imports and variable declarations.

---

### 2. **Token Property Naming** (TS2551)
**Count:** 5 errors

**Pattern:**
Anthropic SDK returns `totalTokens`, not `total_tokens`. Code was using snake_case instead of camelCase.

**Examples:**
- `app/api/ai/analyze-document/route.ts:138` - `total_tokens` → `totalTokens`
- `app/api/ai/generate-epic/route.ts:132` - `total_tokens` → `totalTokens`
- `app/api/ai/generate-single-story/route.ts:145` - `total_tokens` → `totalTokens`
- `app/api/ai/generate-stories/route.ts:135` - `total_tokens` → `totalTokens`
- `app/api/ai/validate-story/route.ts:160` - `total_tokens` → `totalTokens`

**Fix:** Changed `response.usage?.total_tokens` to `response.usage?.totalTokens`.

---

### 3. **Subscription Tier Type Mismatches** (TS2345, TS2322)
**Count:** ~15 errors

**Pattern:**
Full `SubscriptionTier` type is `'free' | 'solo' | 'team' | 'pro' | 'business' | 'enterprise'`, but some rate-limit/feature-gate functions expected only `'free' | 'team' | 'business' | 'enterprise'` (excluding 'solo' and 'pro').

**Examples:**
- `app/api/usage/route.ts:41` - Tier parameter type mismatch
- `lib/hooks/useFeatureGate.tsx:68` - Type 'solo' not assignable
- `lib/middleware/feature-gate.ts:91,275` - Type 'solo' not assignable
- `lib/services/ac-validator.service.ts:194` - Argument type mismatch
- `lib/services/backlog-autopilot.service.ts:97` - Type 'solo' not assignable

**Fix:** Update function signatures to accept full `SubscriptionTier` type, or properly narrow types at call sites.

---

### 4. **Database Schema Mismatches** (TS2339, TS2769)
**Count:** ~70 errors

**Pattern:**
Code references database columns that don't exist in the Drizzle schema, or schema has been updated but code wasn't. Includes:
- Missing columns (e.g., `timestamp`, `promptHash`, `userId`, `outputData`)
- Renamed columns (e.g., `requireReview` → `requiresReview`)
- Invalid enum values (e.g., `"queued"`, `"pending_review"` not in allowed status)
- Missing required fields (e.g., `createdBy` required but not provided)

**Examples:**
- `lib/ai/usage-enforcement.ts` - Missing `timestamp`, `promptHash`, `latencyMs`, `cacheHit`, `userId`
- `lib/services/backlog-autopilot.service.ts` - Invalid statuses `"queued"`, `"pending_review"`; missing columns `documentContent`, `outputData`, `startedAt`, `completedAt`
- `lib/services/effort-impact-scoring.service.ts` - Type mismatches for `effortScore`, `impactScore`
- `lib/services/governance-compliance.service.ts` - Missing `storyId`, `timestamp` columns
- `lib/services/planning-forecasting.service.ts` - Missing `organizationId`, `sprintId`, `estimatedEffort` on various tables
- `lib/services/test-artefact-generator.service.ts` - Missing `version`, `tokensUsed` columns
- `lib/services/workflow-agents.service.ts` - Missing `name`, `conditions`, `actions`, `requiresReview`

**Fix:** Align code with actual database schema. Remove references to non-existent columns, use correct column names, and ensure all required fields are provided in inserts.

---

### 5. **Null Safety Issues** (TS2345, TS2769, TS2322)
**Count:** ~30 errors

**Pattern:**
With `strict: true`, TypeScript now enforces null checks. Code was passing potentially-null values to functions expecting non-null, or not handling null returns.

**Examples:**
- `app/pricing/page.tsx:271` - `string | null | undefined` → `string | null`
- `lib/services/effort-impact-scoring.service.ts:101,282,459` - `null` not assignable to tier type
- `lib/services/effort-impact-scoring.service.ts:659` - `Date | null` passed to function expecting `Date`
- `lib/services/knowledge-search.service.ts:60` - `string | null` → `string`
- `lib/services/velocity.service.ts:146,265` - `string | null` → `string`

**Fix:** Add null checks, use optional chaining, provide default values, or adjust function signatures to accept nullable types.

---

### 6. **Missing/Incorrect Type Properties** (TS2339)
**Count:** ~20 errors

**Pattern:**
Code accessing properties that don't exist on return types, often due to schema/interface mismatches.

**Examples:**
- `app/api/billing/usage/route.ts:102` - `getUsageMetering` doesn't exist
- `app/api/webhooks/stripe/route.ts` - `stories_per_month`, `current_period_start`, `current_period_end` don't exist
- `lib/services/effort-impact-scoring.service.ts` - `allowed`, `tokensRemaining`, `requiresUpgrade` missing
- `lib/services/knowledge-search.service.ts:118` - `.where()` doesn't exist on select result
- `lib/services/model-controls.service.ts` - `preferredModel`, `fallbackModels`, `temperature`, etc. missing

**Fix:** Update code to use correct property names, or add missing properties to type definitions.

---

### 7. **Generic Type Constraints** (TS2322)
**Count:** 2 errors

**Pattern:**
Type `UnwrapPromiseArray<T>` not assignable to `T` without proper constraints.

**Examples:**
- `lib/db/rls.ts:40,80` - Return type mismatch in RLS helper

**Fix:** Add proper type constraints or use type assertions with validation.

---

### 8. **Missing Module Declarations** (TS2307)
**Count:** 3 errors

**Pattern:**
Imports from modules without type declarations.

**Examples:**
- `emails_disabled.bak/*` - `@react-email/components` not installed (disabled email features)
- `tests/e2e/story-journey.spec.ts` - `@playwright/test` not installed
- `tests/integration/notification-digest-links.test.ts` - Invalid import path

**Fix:** Add `@types/*` packages, fix import paths, or add `*.d.ts` declaration files.

---

### 9. **Implicit Any Types** (TS7031)
**Count:** 1 error

**Pattern:**
Function parameters without explicit types, now caught by `noImplicitAny: true`.

**Examples:**
- `tests/e2e/story-journey.spec.ts:4` - `page` parameter implicitly `any`

**Fix:** Add explicit type annotations.

---

### 10. **Invalid Comparisons** (TS2367, TS2872)
**Count:** 2 errors

**Pattern:**
Comparisons between types with no overlap, or expressions that are always truthy/falsy.

**Examples:**
- `lib/services/backlog-autopilot.service.ts:820` - Comparing valid status to invalid `"pending_review"`
- `lib/services/repo-awareness.service.ts:85` - Expression always truthy

**Fix:** Correct comparison values or remove dead code.

---

### 11. **Missing Function Arguments** (TS2554)
**Count:** 2 errors

**Pattern:**
Functions called with wrong number of arguments.

**Examples:**
- `lib/email/send-notification-email.ts:42,87` - Expected 0 arguments, got 1

**Fix:** Update function calls to match signatures, or update function signatures.

---

## Configuration Changes

### `tsconfig.json`
```diff
- "noImplicitAny": false,
- "strict": false,
- "noUnusedLocals": false,
+ "noImplicitAny": true,
+ "strict": true,
+ "noUnusedLocals": true,
```

### `next.config.mjs`
```diff
- typescript: {
-   ignoreBuildErrors: true,
- },
- eslint: {
-   ignoreDuringBuilds: true,
- },
```

---

## Testing Strategy

1. **Typecheck:** `npm run typecheck` - Must pass with 0 errors
2. **Lint:** `npm run lint` - Must pass with 0 errors/warnings
3. **Build:** `npm run build` - Must complete successfully
4. **Pre-push hook:** Run typecheck + lint before every push

---

## Next Steps

- [ ] Fix all remaining type errors systematically
- [ ] Set up Husky pre-push hooks
- [ ] Document any intentional type assertions with comments
- [ ] Update CI/CD to fail on type/lint violations
