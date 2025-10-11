#!/bin/bash

# Production Validation Test Suite
# Comprehensive validation before production sign-off

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_FILE="validation-results-$(date +%Y%m%d-%H%M%S).md"

# Test results tracking
MUST_PASS_TESTS=0
MUST_PASS_PASSED=0
MUST_PASS_FAILED=0
SHOULD_PASS_TESTS=0
SHOULD_PASS_PASSED=0
SHOULD_PASS_FAILED=0

# Initialize results file
cat > "$RESULTS_FILE" <<EOF
# Production Validation Results
Generated: $(date)
Base URL: $BASE_URL

---

EOF

log_section() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}\n"
    echo -e "\n## $1\n" >> "$RESULTS_FILE"
}

log_test() {
    local status=$1
    local message=$2
    local criticality=$3

    if [ "$criticality" = "must-pass" ]; then
        MUST_PASS_TESTS=$((MUST_PASS_TESTS + 1))
        if [ "$status" = "PASS" ]; then
            MUST_PASS_PASSED=$((MUST_PASS_PASSED + 1))
            echo -e "${GREEN}✓${NC} $message"
            echo "- ✅ $message" >> "$RESULTS_FILE"
        else
            MUST_PASS_FAILED=$((MUST_PASS_FAILED + 1))
            echo -e "${RED}✗${NC} $message"
            echo "- ❌ **CRITICAL:** $message" >> "$RESULTS_FILE"
        fi
    else
        SHOULD_PASS_TESTS=$((SHOULD_PASS_TESTS + 1))
        if [ "$status" = "PASS" ]; then
            SHOULD_PASS_PASSED=$((SHOULD_PASS_PASSED + 1))
            echo -e "${GREEN}✓${NC} $message"
            echo "- ✅ $message" >> "$RESULTS_FILE"
        else
            SHOULD_PASS_FAILED=$((SHOULD_PASS_FAILED + 1))
            echo -e "${YELLOW}⚠${NC} $message"
            echo "- ⚠️ $message" >> "$RESULTS_FILE"
        fi
    fi
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
    echo "  $1" >> "$RESULTS_FILE"
}

log_error() {
    echo -e "${RED}ERROR:${NC} $1"
    echo "  **ERROR:** $1" >> "$RESULTS_FILE"
}

# =============================================================================
# 1. PERMISSIONS & DATA SECURITY (MUST-PASS)
# =============================================================================

test_permissions_and_security() {
    log_section "1. PERMISSIONS & DATA SECURITY (MUST-PASS)"

    log_info "Testing RLS and cross-tenant isolation..."
    log_info "This requires manual testing with multiple user accounts"
    log_info "Automated API endpoint validation..."

    # Check if auth middleware exists
    if [ -f "middleware.ts" ]; then
        log_test "PASS" "Auth middleware file exists" "must-pass"
    else
        log_test "FAIL" "Auth middleware file missing" "must-pass"
    fi

    # Check for RLS policies in schema
    if grep -r "RLS\|POLICY\|security_definer" db/schema 2>/dev/null | grep -q .; then
        log_test "PASS" "RLS policies defined in schema" "must-pass"
    else
        log_test "FAIL" "No RLS policies found in schema" "must-pass"
    fi

    # Check rate limiting implementation
    if grep -r "rateLimit\|rate-limit\|429" app/api 2>/dev/null | grep -q .; then
        log_test "PASS" "Rate limiting code found in API routes" "must-pass"
    else
        log_test "FAIL" "Rate limiting not implemented" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] User A cannot access User B's projects via API
- [ ] User A cannot see User B's stories in global Stories page
- [ ] Non-member receives 403 when accessing project endpoint
- [ ] Only owner/admin can publish epics (403 for members)
- [ ] Rate limits return 429 after threshold
- [ ] UI shows friendly error for 403/429 responses
EOF
}

# =============================================================================
# 2. PUBLISH EPIC - END-TO-END (MUST-PASS)
# =============================================================================

test_publish_epic() {
    log_section "2. PUBLISH EPIC - END-TO-END (MUST-PASS)"

    # Check publish endpoint exists
    if [ -f "app/api/epics/[id]/publish/route.ts" ]; then
        log_test "PASS" "Publish epic endpoint exists" "must-pass"
    else
        log_test "FAIL" "Publish epic endpoint missing" "must-pass"
    fi

    # Check for status update logic
    if grep -r "status.*published\|published.*status" app/api/epics 2>/dev/null | grep -q .; then
        log_test "PASS" "Status update logic found" "must-pass"
    else
        log_test "FAIL" "Status update logic missing" "must-pass"
    fi

    # Check for audit trail
    if grep -r "audit\|activity\|publishedBy\|publishedAt" app/api/epics 2>/dev/null | grep -q .; then
        log_test "PASS" "Audit trail implementation found" "must-pass"
    else
        log_test "FAIL" "Audit trail implementation missing" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Draft epic can be published by owner/admin
- [ ] Published epic shows correct publishedAt timestamp
- [ ] Linked stories become visible in boards after publish
- [ ] Notification generated exactly once (no duplicates)
- [ ] Realtime update appears in other sessions within 2s
- [ ] Double-click publish is idempotent (no duplicate notifications)
- [ ] Unpublish button disabled if not supported
EOF
}

# =============================================================================
# 3. CRUD INTEGRITY & EDGE CASES (MUST-PASS)
# =============================================================================

test_crud_integrity() {
    log_section "3. CRUD INTEGRITY & EDGE CASES (MUST-PASS)"

    # Check CRUD endpoints exist
    local entities=("projects" "epics" "stories")
    local methods=("POST" "PATCH" "DELETE")

    for entity in "${entities[@]}"; do
        if [ -f "app/api/$entity/route.ts" ] || [ -f "app/api/$entity/[id]/route.ts" ]; then
            log_test "PASS" "$entity CRUD endpoints exist" "must-pass"
        else
            log_test "FAIL" "$entity CRUD endpoints missing" "must-pass"
        fi
    done

    # Check validation logic
    if grep -r "zod\|validation\|.parse\|.safeParse" app/api 2>/dev/null | grep -q .; then
        log_test "PASS" "Validation logic implemented" "must-pass"
    else
        log_test "FAIL" "Validation logic missing" "must-pass"
    fi

    # Check XSS protection
    if grep -r "sanitize\|escape\|DOMPurify" lib 2>/dev/null | grep -q . || \
       grep -r "dangerouslySetInnerHTML" app --include="*.tsx" 2>/dev/null | grep -v -q .; then
        log_test "PASS" "XSS protection measures in place" "must-pass"
    else
        log_test "FAIL" "XSS protection needs verification" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Create project/epic/story from all entry points (modal, card, page)
- [ ] Edit title/description with empty string (should show validation error)
- [ ] Create with extreme lengths (10000 chars) - validate truncation/error
- [ ] Test emoji/unicode in titles: "🚀 Epic Name 中文"
- [ ] Test XSS payload: "<script>alert('xss')</script>" (should be escaped)
- [ ] Two users edit same epic simultaneously → last write wins + conflict toast
- [ ] Delete project with epics → confirm cascade rules (block or cascade)
- [ ] Delete epic with stories → confirm story linkage (orphan or blocked)
- [ ] Delete confirmation shows clear, unambiguous copy
- [ ] No dangling foreign keys after any delete operation
EOF
}

# =============================================================================
# 4. STORIES PAGE FILTERS/SEARCH (MUST-PASS)
# =============================================================================

test_stories_filters() {
    log_section "4. STORIES PAGE FILTERS/SEARCH (MUST-PASS)"

    # Check stories API supports filtering
    if [ -f "app/api/stories/route.ts" ]; then
        if grep -q "projectId\|epicId\|status\|priority\|search" app/api/stories/route.ts; then
            log_test "PASS" "Stories API supports filter parameters" "must-pass"
        else
            log_test "FAIL" "Stories API missing filter support" "must-pass"
        fi
    else
        log_test "FAIL" "Stories API route missing" "must-pass"
    fi

    # Check stories page exists
    if [ -f "app/stories/page.tsx" ] || [ -f "app/(app)/stories/page.tsx" ]; then
        log_test "PASS" "Stories page component exists" "must-pass"
    else
        log_test "FAIL" "Stories page component missing" "must-pass"
    fi

    # Check for URL query param handling
    if grep -r "useSearchParams\|searchParams" app/stories 2>/dev/null | grep -q . || \
       grep -r "useSearchParams\|searchParams" "app/(app)/stories" 2>/dev/null | grep -q .; then
        log_test "PASS" "URL query param handling implemented" "must-pass"
    else
        log_test "FAIL" "URL query param handling missing" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Filter by Project only → correct results
- [ ] Filter by Epic only → correct results
- [ ] Filter by Status only → correct results
- [ ] Filter by Priority only → correct results
- [ ] Combine all filters → correct intersection
- [ ] Search text + filters → correct results
- [ ] Pagination/infinite scroll with filters active
- [ ] Filters preserved on browser back/forward
- [ ] Filters preserved on page refresh
- [ ] Deep-link with query params reproduces exact state
- [ ] Result counts match board view counts
- [ ] Zero results shows friendly empty state
EOF
}

# =============================================================================
# 5. REALTIME & OPTIMISTIC UI (MUST-PASS)
# =============================================================================

test_realtime() {
    log_section "5. REALTIME & OPTIMISTIC UI (MUST-PASS)"

    # Check for realtime/websocket implementation
    if grep -r "pusher\|supabase.*realtime\|socket\|EventSource" lib 2>/dev/null | grep -q .; then
        log_test "PASS" "Realtime implementation found" "must-pass"
    else
        log_test "FAIL" "Realtime implementation missing" "must-pass"
    fi

    # Check for optimistic updates
    if grep -r "optimistic\|useMutation\|invalidateQueries" app 2>/dev/null | grep -q .; then
        log_test "PASS" "Optimistic update patterns found" "must-pass"
    else
        log_test "FAIL" "Optimistic update patterns missing" "must-pass"
    fi

    # Check for error rollback
    if grep -r "onError.*rollback\|revert\|onError.*previous" app 2>/dev/null | grep -q .; then
        log_test "PASS" "Error rollback logic found" "must-pass"
    else
        log_test "FAIL" "Error rollback logic needs verification" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Open two browser sessions (different profiles)
- [ ] Create story in session A → appears in session B within 2s
- [ ] Edit story in session A → updates in session B within 2s
- [ ] Delete story in session A → removed from session B within 2s
- [ ] Publish epic in session A → board updates in session B within 2s
- [ ] Simulate server error → optimistic update rolls back
- [ ] Error toast shows server error message
- [ ] No "ghost" cards remain after rollback
- [ ] State consistent after page refresh in both sessions
EOF
}

# =============================================================================
# 6. PERFORMANCE & LOADING (MUST-PASS)
# =============================================================================

test_performance() {
    log_section "6. PERFORMANCE & LOADING (MUST-PASS)"

    log_info "Performance tests require manual measurement with DevTools"

    # Check for loading states
    if grep -r "Skeleton\|Loading\|Spinner\|isLoading" app 2>/dev/null | grep -q .; then
        log_test "PASS" "Loading states implemented" "must-pass"
    else
        log_test "FAIL" "Loading states missing" "must-pass"
    fi

    # Check for pagination/virtualization
    if grep -r "virtual\|pagination\|infinite.*scroll\|useInfiniteQuery" app 2>/dev/null | grep -q .; then
        log_test "PASS" "Pagination/virtualization found" "must-pass"
    else
        log_test "FAIL" "Pagination/virtualization needs verification" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Measure P95 GET /api/stories (filtered) - Target: <500ms server
- [ ] Measure P95 TTI Stories page - Target: <1.5s
- [ ] Measure POST /api/epics/{id}/publish - Target: <1s server
- [ ] Skeleton shown within 150ms of navigation
- [ ] No layout shift when data loads (CLS < 0.1)
- [ ] Test on cold load (cleared cache)
- [ ] Test on warm load (with cache)
- [ ] Record measurements in DevTools Network + Performance tabs
EOF
}

# =============================================================================
# 7. ACCESSIBILITY & UX POLISH (SHOULD-PASS)
# =============================================================================

test_accessibility() {
    log_section "7. ACCESSIBILITY & UX POLISH (SHOULD-PASS)"

    # Check for ARIA attributes
    if grep -r "aria-label\|aria-describedby\|role=" app --include="*.tsx" 2>/dev/null | grep -q .; then
        log_test "PASS" "ARIA attributes found in components" "should-pass"
    else
        log_test "FAIL" "ARIA attributes missing or sparse" "should-pass"
    fi

    # Check for keyboard handlers
    if grep -r "onKeyDown\|onKeyPress\|tabIndex" app --include="*.tsx" 2>/dev/null | grep -q .; then
        log_test "PASS" "Keyboard event handlers found" "should-pass"
    else
        log_test "FAIL" "Keyboard event handlers missing" "should-pass"
    fi

    # Check for focus management
    if grep -r "focus\|autoFocus\|FocusTrap" app --include="*.tsx" 2>/dev/null | grep -q .; then
        log_test "PASS" "Focus management implemented" "should-pass"
    else
        log_test "FAIL" "Focus management needs improvement" "should-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Tab through modal → focus trap works, logical order
- [ ] Press Escape to close modal
- [ ] Use Enter/Space to activate buttons
- [ ] Navigate edit/delete/publish with keyboard only
- [ ] Run axe DevTools on Stories page → 0 critical issues
- [ ] Run axe DevTools on Epic modal → 0 critical issues
- [ ] Test high-contrast mode (Windows High Contrast, system dark mode)
- [ ] All error messages visible and readable
- [ ] Toast notifications have sufficient contrast
- [ ] Inline validation errors positioned clearly
EOF
}

# =============================================================================
# 8. OBSERVABILITY (MUST-PASS)
# =============================================================================

test_observability() {
    log_section "8. OBSERVABILITY (MUST-PASS)"

    # Check for error tracking setup
    if grep -r "sentry\|@sentry/nextjs" . --include="*.json" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -q .; then
        log_test "PASS" "Sentry error tracking configured" "must-pass"
    else
        log_test "FAIL" "Error tracking not configured" "must-pass"
    fi

    # Check for audit logging
    if grep -r "audit\|activity.*log\|trackEvent\|logAction" lib app 2>/dev/null | grep -q .; then
        log_test "PASS" "Audit logging implementation found" "must-pass"
    else
        log_test "FAIL" "Audit logging missing" "must-pass"
    fi

    # Check for health check endpoint
    if [ -f "app/api/health/route.ts" ] || [ -f "app/api/healthz/route.ts" ]; then
        log_test "PASS" "Health check endpoint exists" "must-pass"
    else
        log_test "FAIL" "Health check endpoint missing" "must-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Trigger API error → event captured in Sentry with context
- [ ] User ID and project ID attached to Sentry events
- [ ] Create project → audit event logged
- [ ] Update epic → audit event logged
- [ ] Delete story → audit event logged
- [ ] Publish epic → audit event logged with publisher ID
- [ ] Visit /api/health → returns 200 OK
- [ ] Configure uptime monitoring alert (e.g., Pingdom, UptimeRobot)
- [ ] Review audit events in dashboard during smoke test
EOF
}

# =============================================================================
# 9. AI FLOWS REGRESSION (SHOULD-PASS)
# =============================================================================

test_ai_regression() {
    log_section "9. AI FLOWS REGRESSION (SHOULD-PASS)"

    # Check AI endpoints exist
    if [ -f "app/api/ai/generate-stories/route.ts" ] || \
       [ -f "app/api/ai/validate-story/route.ts" ]; then
        log_test "PASS" "AI endpoint files exist" "should-pass"
    else
        log_test "FAIL" "AI endpoint files missing" "should-pass"
    fi

    # Check AI integration with epics/projects
    if grep -r "projectId\|epicId" app/api/ai 2>/dev/null | grep -q .; then
        log_test "PASS" "AI endpoints reference project/epic context" "should-pass"
    else
        log_test "FAIL" "AI endpoints may not respect project/epic context" "should-pass"
    fi

    echo -e "\n### Manual Tests Required:\n" >> "$RESULTS_FILE"
    cat >> "$RESULTS_FILE" <<EOF
- [ ] Generate stories for published epic → stories created successfully
- [ ] Generate stories for draft epic → stories created successfully
- [ ] Generated stories land in correct project
- [ ] Generated stories linked to correct epic
- [ ] Batch story creation respects filters and permissions
- [ ] Generated stories appear in Stories page filters
- [ ] Validate story with AI → validation response returned
- [ ] AI calls respect rate limits
EOF
}

# =============================================================================
# FINAL REPORT
# =============================================================================

generate_final_report() {
    log_section "VALIDATION SUMMARY"

    echo -e "\n---\n" >> "$RESULTS_FILE"
    echo -e "\n## Summary\n" >> "$RESULTS_FILE"

    local total_must=$((MUST_PASS_PASSED + MUST_PASS_FAILED))
    local total_should=$((SHOULD_PASS_PASSED + SHOULD_PASS_FAILED))

    echo "MUST-PASS Tests: $MUST_PASS_PASSED/$total_must passed"
    echo "SHOULD-PASS Tests: $SHOULD_PASS_PASSED/$total_should passed"

    cat >> "$RESULTS_FILE" <<EOF
### Automated Test Results

**MUST-PASS Tests:** $MUST_PASS_PASSED/$total_must passed
**SHOULD-PASS Tests:** $SHOULD_PASS_PASSED/$total_should passed

EOF

    if [ $MUST_PASS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ All automated MUST-PASS tests passed${NC}"
        echo "✅ **All automated MUST-PASS tests passed**" >> "$RESULTS_FILE"
    else
        echo -e "\n${RED}✗ $MUST_PASS_FAILED MUST-PASS test(s) failed${NC}"
        echo "❌ **$MUST_PASS_FAILED MUST-PASS test(s) failed**" >> "$RESULTS_FILE"
    fi

    if [ $SHOULD_PASS_FAILED -gt 0 ]; then
        echo -e "${YELLOW}⚠ $SHOULD_PASS_FAILED SHOULD-PASS test(s) failed${NC}"
        echo "⚠️ **$SHOULD_PASS_FAILED SHOULD-PASS test(s) failed**" >> "$RESULTS_FILE"
    fi

    cat >> "$RESULTS_FILE" <<EOF

### Go/No-Go Decision

**Production sign-off requires:**
- ✅ All MUST-PASS automated tests green
- ✅ All MUST-PASS manual tests completed and passing
- ✅ Performance targets met (documented)
- ⚠️ SHOULD-PASS tests recommended but not blocking

**Next Steps:**
1. Complete all manual test checklists above
2. Document performance measurements
3. Review and fix any failed tests
4. Final sign-off from team lead

---

Generated: $(date)
Results saved to: $RESULTS_FILE
EOF

    echo -e "\n${BLUE}Full results saved to: $RESULTS_FILE${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║       PRODUCTION VALIDATION TEST SUITE                     ║"
    echo "║       Comprehensive Pre-Launch Validation                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    test_permissions_and_security
    test_publish_epic
    test_crud_integrity
    test_stories_filters
    test_realtime
    test_performance
    test_accessibility
    test_observability
    test_ai_regression
    generate_final_report

    echo -e "\n${GREEN}Validation suite complete!${NC}"
    echo -e "Review the full report: ${BLUE}$RESULTS_FILE${NC}\n"

    # Exit with failure if any must-pass tests failed
    if [ $MUST_PASS_FAILED -gt 0 ]; then
        exit 1
    fi
}

# Run main function
main
