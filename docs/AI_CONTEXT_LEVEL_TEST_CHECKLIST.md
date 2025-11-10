# ✅ AI Context Level - Production Test Checklist

**Test Date:** _______________  
**Tester:** _______________  
**Environment:** _______________  
**Build Version:** _______________

---

## Pre-Test Setup

- [ ] Test account created with sufficient AI actions (800+)
- [ ] Test project created with:
  - [ ] 3+ epics defined
  - [ ] 5+ stories per epic
  - [ ] Project roles defined in settings
  - [ ] Project terminology configured
- [ ] Browser: Chrome (latest)
- [ ] Browser: Firefox (latest)
- [ ] Browser: Safari (latest)
- [ ] Browser: Edge (latest)
- [ ] Mobile device: iOS Safari
- [ ] Mobile device: Android Chrome

---

## Test Case 1: Minimal Context Level

**Test Input:** "As a user, I want to reset my password so that I can regain access to my account"

- [ ] Navigate to project → Create New Story
- [ ] Select "📋 Standard" template
- [ ] Enter test input
- [ ] Set context level to **Minimal**
- [ ] Click "Generate Story"
- [ ] **Verify:** Generation completes in <5 seconds
- [ ] **Verify:** Uses exactly 1 AI action
- [ ] **Verify:** Counter decreases by 1
- [ ] **Verify:** Output is generic (no project-specific terms)
- [ ] **Verify:** No similar story references
- [ ] **Verify:** Token usage ~1,500-2,500
- [ ] **Verify:** INVEST rating displayed

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 2: Standard Context Level

**Test Input:** Same as Test Case 1

- [ ] Create new story
- [ ] Set context level to **Standard**
- [ ] Click "Generate Story"
- [ ] **Verify:** Generation completes in 5-10 seconds
- [ ] **Verify:** Uses exactly 2 AI actions
- [ ] **Verify:** Counter decreases by 2
- [ ] **Verify:** Output includes project-specific roles
- [ ] **Verify:** Output uses project terminology
- [ ] **Verify:** Style matches existing stories
- [ ] **Verify:** Token usage ~2,500-4,000
- [ ] **Verify:** "Show details" reveals project context

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 3: Comprehensive Context Level

**Test Input:** Same as Test Case 1

- [ ] Create new story
- [ ] **DO NOT** assign to epic yet
- [ ] Set context level to **Comprehensive**
- [ ] **Verify:** Error message displays
- [ ] **Verify:** Message: "Comprehensive mode requires story to be in an epic"
- [ ] **Verify:** Generate button disabled
- [ ] Assign story to epic (with 5+ stories)
- [ ] **Verify:** Generate button enabled
- [ ] Click "Generate Story"
- [ ] **Verify:** Generation completes in 10-20 seconds
- [ ] **Verify:** Uses exactly 2 AI actions
- [ ] **Verify:** Counter decreases by 2
- [ ] **Verify:** Semantic search performed
- [ ] **Verify:** Top 5 similar stories found
- [ ] **Verify:** Output references similar stories
- [ ] **Verify:** Token usage ~3,000-5,000
- [ ] **Verify:** "Show details" reveals similar stories

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 4A: Thinking Mode (Non-Team User)

**Test Input:** "As a healthcare admin, I want to ensure HIPAA-compliant data encryption"

- [ ] Create new story
- [ ] Assign to epic
- [ ] Set context level to **Comprehensive + Thinking**
- [ ] **Verify:** Upgrade prompt displays
- [ ] **Verify:** Message: "🔒 Requires Team plan"
- [ ] **Verify:** "Upgrade Now →" button visible
- [ ] Click "Upgrade Now →"
- [ ] **Verify:** Navigates to `/pricing`
- [ ] **Verify:** No AI actions consumed

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 4B: Thinking Mode (Team User)

**Test Input:** Same as Test Case 4A

- [ ] Create new story (as Team plan user)
- [ ] Assign to epic
- [ ] Set context level to **Comprehensive + Thinking**
- [ ] Click "Generate Story"
- [ ] **Verify:** Generation completes in 15-30 seconds
- [ ] **Verify:** Uses exactly 3 AI actions
- [ ] **Verify:** Counter decreases by 3
- [ ] **Verify:** Output includes compliance language
- [ ] **Verify:** Advanced edge case analysis
- [ ] **Verify:** Security/regulatory considerations
- [ ] **Verify:** Token usage ~5,000-8,000
- [ ] **Verify:** High-quality technical output

**Result:** ✅ PASS / ❌ FAIL / ⏭️ SKIP (no Team account)  
**Notes:** _______________

---

## Test Case 5: AI Action Quota Tracking

**Starting Actions:** _______________

- [ ] Generate with Minimal (1 action)
- [ ] **Verify:** Counter shows starting - 1
- [ ] Generate with Standard (2 actions)
- [ ] **Verify:** Counter shows starting - 3
- [ ] Generate with Comprehensive (2 actions)
- [ ] **Verify:** Counter shows starting - 5
- [ ] Generate with Thinking (3 actions) [if Team plan]
- [ ] **Verify:** Counter shows starting - 8
- [ ] **Verify:** "AI Actions Used: X / Y" displays correctly
- [ ] **Verify:** Usage breakdown visible in billing dashboard

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 6: Template Compatibility

Test each template with each context level:

### 📋 Standard Template
- [ ] Minimal: ✅ PASS / ❌ FAIL
- [ ] Standard: ✅ PASS / ❌ FAIL
- [ ] Comprehensive: ✅ PASS / ❌ FAIL
- [ ] Thinking: ✅ PASS / ❌ FAIL

### 🎯 Lean Agile Template
- [ ] Minimal: ✅ PASS / ❌ FAIL
- [ ] Standard: ✅ PASS / ❌ FAIL
- [ ] Comprehensive: ✅ PASS / ❌ FAIL
- [ ] Thinking: ✅ PASS / ❌ FAIL

### 🧪 BDD Compliance Template
- [ ] Minimal: ✅ PASS / ❌ FAIL
- [ ] Standard: ✅ PASS / ❌ FAIL
- [ ] Comprehensive: ✅ PASS / ❌ FAIL
- [ ] Thinking: ✅ PASS / ❌ FAIL

### 🏢 Enterprise Template
- [ ] Minimal: ✅ PASS / ❌ FAIL
- [ ] Standard: ✅ PASS / ❌ FAIL
- [ ] Comprehensive: ✅ PASS / ❌ FAIL
- [ ] Thinking: ✅ PASS / ❌ FAIL

### ⚙️ Technical Focus Template
- [ ] Minimal: ✅ PASS / ❌ FAIL
- [ ] Standard: ✅ PASS / ❌ FAIL
- [ ] Comprehensive: ✅ PASS / ❌ FAIL
- [ ] Thinking: ✅ PASS / ❌ FAIL

### 🎨 UX Focused Template
- [ ] Minimal: ✅ PASS / ❌ FAIL
- [ ] Standard: ✅ PASS / ❌ FAIL
- [ ] Comprehensive: ✅ PASS / ❌ FAIL
- [ ] Thinking: ✅ PASS / ❌ FAIL

**Notes:** _______________

---

## Test Case 7: Context Persistence

- [ ] Generate story with Standard context level
- [ ] Save story
- [ ] Navigate away from page
- [ ] Return to create new story
- [ ] **Verify:** Context level defaults to Standard (last used)
- [ ] Change to Comprehensive
- [ ] Refresh page
- [ ] **Verify:** Comprehensive is still selected
- [ ] Clear browser cache
- [ ] **Verify:** Context level resets to tier default

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 8: No Epic Scenario

- [ ] Create new project with 0 epics
- [ ] Create new story
- [ ] Attempt to select Comprehensive
- [ ] **Verify:** Tooltip: "Requires story to be in an epic"
- [ ] **Verify:** Epic dropdown disabled or shows "Create Epic"
- [ ] **Verify:** Only Minimal and Standard functional
- [ ] Create epic inline (if feature exists)
- [ ] **Verify:** Comprehensive unlocks after epic creation

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 9: Token Estimation Accuracy

Generate 3 stories per context level and record token usage:

### Minimal
1. Estimated: _______ Actual: _______ Diff: _______%
2. Estimated: _______ Actual: _______ Diff: _______%
3. Estimated: _______ Actual: _______ Diff: _______%

### Standard
1. Estimated: _______ Actual: _______ Diff: _______%
2. Estimated: _______ Actual: _______ Diff: _______%
3. Estimated: _______ Actual: _______ Diff: _______%

### Comprehensive
1. Estimated: _______ Actual: _______ Diff: _______%
2. Estimated: _______ Actual: _______ Diff: _______%
3. Estimated: _______ Actual: _______ Diff: _______%

### Thinking
1. Estimated: _______ Actual: _______ Diff: _______%
2. Estimated: _______ Actual: _______ Diff: _______%
3. Estimated: _______ Actual: _______ Diff: _______%

- [ ] **Verify:** All estimates within ±20% of actual

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 10: Concurrent Generations

- [ ] Open 2 browser tabs (same account)
- [ ] Tab 1: Start Thinking generation (~30 sec)
- [ ] Tab 2: Immediately start Standard generation
- [ ] **Verify:** Both generations complete successfully
- [ ] **Verify:** AI action counter updates correctly
- [ ] **Verify:** No race conditions
- [ ] **Verify:** Both stories created in database
- [ ] **Verify:** No duplicate action deductions

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 11: Insufficient Actions

- [ ] Set user to 1 AI action remaining
- [ ] Attempt Standard generation (requires 2)
- [ ] **Verify:** Generation blocked
- [ ] **Verify:** Error: "Insufficient AI actions. Need 2, have 1 remaining."
- [ ] **Verify:** Upgrade prompt displayed
- [ ] **Verify:** "View Pricing" button navigates to `/pricing`
- [ ] **Verify:** Can still generate with Minimal (1 action)
- [ ] **Verify:** No partial charges

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 12: Near-Limit Warning

- [ ] Set user to 750/800 actions used (93.75%)
- [ ] Generate story (any context level)
- [ ] **Verify:** Warning banner displays
- [ ] **Verify:** Message: "⚠️ You're running low on AI actions"
- [ ] **Verify:** Shows remaining actions
- [ ] **Verify:** Shows reset date
- [ ] **Verify:** Warning appears on generation page
- [ ] **Verify:** Warning appears in billing dashboard
- [ ] **Verify:** Warning threshold is 90%
- [ ] **Verify:** Warning dismissible but persists

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 13: Context Selector UI

- [ ] **Verify:** 4 context levels clearly labeled
- [ ] **Verify:** Action costs displayed (1, 2, 2, 3)
- [ ] **Verify:** Badges correct:
  - [ ] Minimal: "Fastest"
  - [ ] Standard: "Recommended"
  - [ ] Comprehensive: "Best Quality"
  - [ ] Thinking: "Expert Mode"
- [ ] **Verify:** "Show details" expands correctly
- [ ] **Verify:** Details include features, speed, cost
- [ ] **Verify:** Epic requirement tooltips display
- [ ] **Verify:** Locked levels show 🔒 icon
- [ ] **Verify:** Upgrade prompt styling clear
- [ ] **Verify:** Hover states provide context
- [ ] **Verify:** Keyboard navigation works (Tab, Enter, Arrows)

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Test Case 14: Mobile Responsiveness

Test on mobile device or responsive mode (375px width):

- [ ] **Verify:** Context selector touch-friendly (44px+ tap targets)
- [ ] **Verify:** All labels readable without horizontal scroll
- [ ] **Verify:** Tooltips work on tap (not just hover)
- [ ] **Verify:** "Show details" expands properly
- [ ] **Verify:** Upgrade prompts display correctly
- [ ] **Verify:** No overlapping UI elements
- [ ] **Verify:** Generation progress visible
- [ ] **Verify:** Results readable without zooming

**Result:** ✅ PASS / ❌ FAIL  
**Device:** _______________  
**Notes:** _______________

---

## Test Case 15: Accessibility (WCAG 2.1 AA)

- [ ] **Verify:** Color contrast ≥ 4.5:1 for all text
- [ ] **Verify:** Focus indicators visible on all interactive elements
- [ ] **Verify:** Screen reader announces context level changes
- [ ] **Verify:** ARIA labels present for icons/buttons
- [ ] **Verify:** Keyboard navigation works without mouse
- [ ] **Verify:** Error messages announced by screen reader
- [ ] **Verify:** Loading states have aria-live regions
- [ ] **Verify:** Locked features have aria-disabled

**Result:** ✅ PASS / ❌ FAIL  
**Screen Reader:** _______________  
**Notes:** _______________

---

## Performance Testing

Record generation times for 10 stories per context level:

### Minimal (Target: <5 sec)
1. ___ sec  2. ___ sec  3. ___ sec  4. ___ sec  5. ___ sec
6. ___ sec  7. ___ sec  8. ___ sec  9. ___ sec  10. ___ sec
**Average:** ___ sec  **P95:** ___ sec

### Standard (Target: 5-10 sec)
1. ___ sec  2. ___ sec  3. ___ sec  4. ___ sec  5. ___ sec
6. ___ sec  7. ___ sec  8. ___ sec  9. ___ sec  10. ___ sec
**Average:** ___ sec  **P95:** ___ sec

### Comprehensive (Target: 10-20 sec)
1. ___ sec  2. ___ sec  3. ___ sec  4. ___ sec  5. ___ sec
6. ___ sec  7. ___ sec  8. ___ sec  9. ___ sec  10. ___ sec
**Average:** ___ sec  **P95:** ___ sec

### Thinking (Target: 15-30 sec)
1. ___ sec  2. ___ sec  3. ___ sec  4. ___ sec  5. ___ sec
6. ___ sec  7. ___ sec  8. ___ sec  9. ___ sec  10. ___ sec
**Average:** ___ sec  **P95:** ___ sec

- [ ] **Verify:** All averages within target ranges
- [ ] **Verify:** P95 within acceptable limits

---

## Security Testing

- [ ] **Verify:** Tier validation happens server-side
- [ ] **Verify:** Cannot bypass tier restrictions via API
- [ ] **Verify:** Action deduction is atomic
- [ ] **Verify:** No race conditions in action counting
- [ ] **Verify:** Token usage tracked accurately
- [ ] **Verify:** User cannot access locked context levels via API manipulation

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Integration Testing

- [ ] **Verify:** Works with all 6 story templates
- [ ] **Verify:** Integrates with epic selection
- [ ] **Verify:** Priority field unaffected
- [ ] **Verify:** Story points field unaffected
- [ ] **Verify:** Custom fields preserved
- [ ] **Verify:** Acceptance criteria generated correctly
- [ ] **Verify:** Stories saved to database
- [ ] **Verify:** Activity log tracks generation

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Error Handling

Test each error scenario:

- [ ] Comprehensive without epic → Clear error message
- [ ] Thinking without Team plan → Upgrade prompt
- [ ] Insufficient actions → Quota error
- [ ] API failure → Graceful error handling
- [ ] Network timeout → Retry mechanism
- [ ] Invalid input → Validation error
- [ ] No project selected → Validation error

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________

---

## Final Sign-Off

### Core Functionality
- [ ] All 4 context levels generate stories successfully
- [ ] AI action counting accurate for all levels
- [ ] Epic requirement enforced
- [ ] Upgrade gates work correctly
- [ ] Token usage within expected ranges

### Quality
- [ ] Minimal: Generic, fast, no context
- [ ] Standard: Project-specific context
- [ ] Comprehensive: Semantic search works
- [ ] Thinking: Advanced reasoning evident

### Performance
- [ ] All generation times within targets
- [ ] UI remains responsive
- [ ] No memory leaks

### Security
- [ ] Server-side validation enforced
- [ ] No bypass vulnerabilities
- [ ] Action tracking accurate

### UX
- [ ] Clear error messages
- [ ] Intuitive UI
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)

---

## Overall Result

**Total Tests:** _______  
**Passed:** _______  
**Failed:** _______  
**Skipped:** _______  

**Status:** ✅ PRODUCTION READY / ⚠️ ISSUES FOUND / ❌ BLOCKED

---

## Issues Found

| # | Severity | Description | Steps to Reproduce | Status |
|---|----------|-------------|-------------------|--------|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

---

## Sign-Off

**Tester:** _______________  
**Date:** _______________  
**Signature:** _______________

**Product Manager:** _______________  
**Date:** _______________  
**Signature:** _______________

**Engineering Lead:** _______________  
**Date:** _______________  
**Signature:** _______________

---

**Document Version:** 1.0  
**Last Updated:** November 9, 2025

