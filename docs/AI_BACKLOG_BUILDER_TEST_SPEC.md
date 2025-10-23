# AI Backlog Builder Comprehensive Test Specification

Use this specification to thoroughly test all implemented features of the AI Backlog Builder system v1.3.

## Test Scenario 1: Large Story Decomposition (Triggers All Rules)

### Test Input

```json
{
  "description": "As a customer browsing our e-commerce platform, I want to find products efficiently using multiple filters and sorting options, so that I can quickly locate items that match my specific needs. The system should allow me to filter by category, price range, brand, customer ratings, availability status, and product features. I should be able to sort results by price, popularity, newest arrivals, customer ratings, and relevance. The filtering interface must work seamlessly on both desktop and mobile devices with touch-friendly controls. When I apply multiple filters, the results should update in real-time using AND logic (showing products that match ALL selected criteria). If no products match my filters, I should see a helpful message with suggestions to modify my search. The system should remember my filter preferences during my browsing session, even when I navigate to different pages or refresh the browser. All filter controls must be accessible to screen readers and meet WCAG 2.1 AA standards with proper focus indicators and touch targets that are at least 44x44 pixels. The filtered results should load within 2 seconds on standard broadband connections, and the interface should handle datasets of up to 50,000 products without performance degradation. Users should be able to clear all filters with a single click, and the system should show a count of matching products that updates as filters are applied.",
  "projectContext": {
    "dataset_size": 50000,
    "has_mobile": true,
    "performance_requirements": "P95 < 2s on broadband/4G"
  }
}
```

### Expected Results

- ✅ `split_recommended: true` (triggers capability ≥3 rule)
- ✅ `softCapExceeded: true` (should detect 5+ natural capabilities)
- ✅ `total_estimate >= 8` (triggers total estimate rule)
- ✅ Capabilities should include: category-filtering, price-filtering, sorting, mobile-interface, persistence
- ✅ Merge suggestions for similar capabilities (if any)
- ✅ WCAG and performance themes assigned to appropriate capabilities

---

## Test Scenario 2: Story Generation with All Validation Rules

### Test Each Capability Individually

#### A. Category Filtering Story (Tests Performance + No-Results + AND-Logic)

**Input:**
```json
{
  "capabilityKey": "category-filtering",
  "title": "As a customer, I want to filter products by category",
  "estimate_points": 3,
  "ui_components": ["dropdown", "list", "button"],
  "acceptance_themes": ["result-count", "no-results", "performance", "and-logic", "clear-reset"],
  "projectContext": {
    "dataset_size": 50000,
    "has_mobile": true
  }
}
```

**Expected Story Validation:**
- ✅ Exactly 4-7 ACs generated
- ✅ At least 4 ACs with "within 2 seconds (P95)" timing (interactive ACs)
- ✅ One AC with no-results case ("No products match", "No results found", etc.)
- ✅ One AC testing AND-logic with multiple filters
- ✅ One AC for clear/reset functionality
- ✅ No passive voice in Then clauses
- ✅ WCAG 2.1 AA mentioned in Additional Notes (UI components present)
- ✅ Technical hints in separate array (not in story text)

#### B. Mobile Interface Story (Tests WCAG + Touch Targets + Accessibility)

**Input:**
```json
{
  "capabilityKey": "mobile-interface",
  "title": "As a mobile user, I want touch-friendly filter controls",
  "estimate_points": 5,
  "ui_components": ["touchscreen", "buttons", "dropdown"],
  "acceptance_themes": ["wcag", "performance", "no-results", "edge-cases"],
  "projectContext": {
    "has_mobile": true
  }
}
```

**Expected Validation:**
- ✅ WCAG 2.1 AA requirement enforced (UI + wcag theme)
- ✅ Touch targets ≥44×44px mentioned
- ✅ Focus indicators and semantic labels mentioned
- ✅ Edge cases AC for small screens or touch interactions

#### C. Persistence Story (Tests Session State + Pagination)

**Input:**
```json
{
  "capabilityKey": "filter-persistence",
  "title": "As a user, I want my filters to persist across page refreshes",
  "estimate_points": 2,
  "ui_components": [],
  "acceptance_themes": ["persistence", "edge-cases"],
  "projectContext": {
    "has_mobile": false
  }
}
```

**Expected Validation:**
- ✅ Persistence AC verifying state across navigation/refresh
- ✅ NO WCAG requirement (no UI components)
- ✅ Session storage mentioned in technical hints

---

## Test Scenario 3: Auto-Fix Functionality

### Deliberate Validation Failures to Test Auto-Fix

#### A. Compound Then Clauses (Tests split-then)

**Manual story input with compound Then:**
```
"Then search results display and filter count updates and loading spinner hides"
```

**Expected Auto-Fix:**
- ✅ Split into 3 separate ACs:
  - AC1: "Then search results display within 2 seconds (P95)"
  - AC2: "Then filter count updates"
  - AC3: "Then loading spinner hides"
- ✅ `autofixDetails: ["split-then"]`
- ✅ If results in >7 ACs, `manual_review_required: true`

#### B. Missing No-Results (Tests insert-no-results)

**Story without no-results scenario**

**Expected Auto-Fix:**
- ✅ Insert AC: "Given filters applied When no items match Then display 'No results found' message"
- ✅ `autofixDetails: ["insert-no-results"]`

#### C. Missing Performance Timing (Tests add-perf)

**Story with 4+ interactive ACs but no timing mentioned**

**Expected Auto-Fix:**
- ✅ Add "within 2 seconds (P95)" to min(4, interactive_count) ACs
- ✅ `autofixDetails: ["add-perf"]`
- ✅ Cross-check: warn if is_interactive flags don't match verb whitelist

#### D. Passive Voice (Tests rewrite-passive with safety)

**Story with:**
```
"Then search results are displayed to the user"
```

**Expected Auto-Fix:**
- ✅ If Then starts with "results": rewrite to "Then search results display"
- ✅ If uncertain context: warn instead of mutate
- ✅ `autofixDetails: ["rewrite-passive"]` only if safe rewrite applied

---

## Test Scenario 4: Idempotency Testing

### A. Story Duplication Prevention

**Test:**
```http
# Send identical requests with same requestId
POST /api/ai/generate-story
{
  "requestId": "test-123",
  "capabilityKey": "category-filtering",
  // ... same payload
}

# Send again with same requestId
POST /api/ai/generate-story
{
  "requestId": "test-123",
  "capabilityKey": "category-filtering",
  // ... identical payload
}
```

**Expected Results:**
- ✅ Second request returns existing story (not new one)
- ✅ `stories.dup_prevented` metric incremented
- ✅ Database has only 1 story record for this requestId + capabilityKey

### B. Epic Duplication Prevention

**Test:**
```http
# Test stable correlation key generation
POST /api/ai/build-epic
{
  "requestId": "epic-test-456",
  "epic_title": "Product Filtering System",
  // ... payload
}

# Retry with same requestId and title
POST /api/ai/build-epic
{
  "requestId": "epic-test-456",
  "epic_title": "Product Filtering System",
  // ... identical payload
}
```

**Expected Results:**
- ✅ Correlation key generated using SHA-256 (stable across requests)
- ✅ Second request updates existing epic (not creates new)
- ✅ `epics.dup_prevented` metric incremented

---

## Test Scenario 5: Epic Linkage (Parent/Sibling)

### A. Soft Cap Exceeded Flow

**Test:**
```json
{
  "description": "Large story that naturally decomposes into 6 capabilities...",
  "userChoice": "split_into_second_epic"
}
```

**Expected Results:**
- ✅ First epic created with `parentEpicId: null`
- ✅ Second epic created with `parentEpicId: <first_epic_id>`
- ✅ Both epics have matching `siblingEpicIds` arrays
- ✅ Both epics have same `decompositionBatchId` (original requestId)

---

## Test Scenario 6: Quality Scoring & Ready-for-Sprint Gate

### A. High Quality Story (Should Pass)

**Story with:**
- Exactly 5 ACs, all atomic
- Clear no-results handling
- 4 performance timings on interactive ACs
- Proper WCAG when required
- Clear Given/When/Then structure
- AND-logic coverage when needed

**Expected Results:**
- ✅ `quality_score >= 8.0`
- ✅ `ok: true`
- ✅ `manual_review_required: false`
- ✅ `ready_for_sprint: true`

### B. Low Quality Story (Should Require Review)

**Story with:**
- 8+ ACs (too many)
- Vague outcomes ("works correctly")
- Missing required elements

**Expected Results:**
- ✅ `quality_score <= 6.9` (capped when manual review required)
- ✅ `ok: false`
- ✅ `manual_review_required: true`
- ✅ `ready_for_sprint: false`

---

## Test Scenario 7: Cross-Feature Integration

### A. Full End-to-End Flow

**Test:**
```bash
# 1. Decompose large story
POST /api/ai/decompose -> returns capabilities

# 2. Generate stories for each capability
POST /api/ai/generate-story (for each capability)

# 3. Validate each generated story
POST /api/ai/validate (for each story)

# 4. Build epic with all stories
POST /api/ai/build-epic -> creates epic + links stories
```

**Expected Results:**
- ✅ Decomposition creates capabilities with dependencies
- ✅ Stories generated respecting dependency order
- ✅ All stories pass validation (or get auto-fixed)
- ✅ Epic created with proper story links
- ✅ Metrics recorded for each step

---

## Test Scenario 8: Observability & Metrics

### During all tests, verify these metrics are emitted:

- ✅ `split.recommended_rate`
- ✅ `cap.softCapExceeded_rate`
- ✅ `autofix.applied_counts.{fix_type}`
- ✅ `validation.fail_reason.{reason}`
- ✅ `merge.avg_similarity`
- ✅ `stories.dup_prevented`
- ✅ `epics.dup_prevented`
- ✅ `quality.avg_score`
- ✅ `manual_review.rate`
- ✅ `interactive_flag_mismatch.rate`

### PII Redaction Test

**Test:**
```
# Generate story with PII in description
"...customer john.doe@example.com with phone 555-123-4567..."
```

**Expected Results:**
- ✅ Audit logs contain `[EMAIL_REDACTED]` and `[PHONE_REDACTED]`
- ✅ Original data unchanged in database
- ✅ 1% sampling rate applied to audit logging

---

## Test Scenario 9: Schema Validation

### A. Valid Payloads

**Test:**
```http
# All requests should pass schema validation
POST /api/ai/decompose (with valid decomposition-v1.3.schema.json)
POST /api/ai/generate-story (with valid story-v1.3.schema.json)
POST /api/ai/validate (with valid validation-v1.3.schema.json)
```

### B. Invalid Payloads

**Test:**
```json
{
  "estimate_points": 4,  // Invalid: must be 2, 3, or 5
  "version": "v1.2",     // Invalid: must be v1.3
  "extra_field": "value" // Invalid: additionalProperties: false
}
```

**Expected Results:**
- ✅ Valid payloads accepted and processed
- ✅ Invalid payloads return 400 Bad Request with schema errors
- ✅ No unknown fields allowed (additionalProperties: false)

---

## Success Criteria

**The system passes the test if:**

✅ **Decomposition:** Large stories split into ≤4 capabilities (soft cap warning at >4)  
✅ **Generation:** Stories have 4-7 atomic ACs with proper themes  
✅ **Validation:** Auto-fix applied with named transformations  
✅ **Quality:** Scores calculated and clamped [0.0, 10.0]  
✅ **Idempotency:** No duplicates created on retry  
✅ **Epic Linkage:** Parent/sibling relationships maintained  
✅ **Ready Gate:** `ready_for_sprint = ok && !manual_review && score >= threshold`  
✅ **Observability:** All metrics emitted and PII redacted  
✅ **Schemas:** API boundaries enforce strict validation  

---

## Running the Test

```bash
# 1. Deploy the implementation
git push origin main

# 2. Run the comprehensive test suite
npm run test:ai-backlog-builder

# 3. Monitor metrics in your observability platform

# 4. Check audit logs for PII redaction

# 5. Verify database idempotency with manual retries
```

---

## Core Features Tested

🎯 **Coverage:**
- Story decomposition with soft/hard caps
- Story generation with all validation rules
- Auto-fix transformations with safety constraints
- Quality scoring and ready-for-sprint gate
- Idempotency for stories and epics
- Epic linkage (parent/sibling relationships)
- Interactive AC detection and cross-checking
- Performance timing validation
- WCAG compliance checking
- No-results and AND-logic validation
- Observability metrics and PII redaction
- Schema validation at API boundaries

The test scenarios progress from simple to complex, ending with full end-to-end integration testing. Each test includes specific expected results that can be verified to confirm the implementation works correctly.

---

**Version:** 1.3.0  
**Last Updated:** October 23, 2025  
**Status:** Production Ready

