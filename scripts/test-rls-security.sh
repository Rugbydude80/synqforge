#!/bin/bash

# RLS & Security Testing Script
# Tests Row-Level Security and cross-tenant isolation

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_FILE="rls-security-results-$(date +%Y%m%d-%H%M%S).md"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         RLS & SECURITY TESTING SUITE                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Initialize results file
cat > "$RESULTS_FILE" <<EOF
# RLS & Security Test Results
**Generated:** $(date)
**Base URL:** $BASE_URL

---

## Test Configuration

### Required Setup
Before running these tests, you need:

1. **Two test users in different organizations:**
   - User A: Organization 1
   - User B: Organization 2

2. **Test data:**
   - Project A1 (owned by User A's org)
   - Project B1 (owned by User B's org)
   - Epic A1 (in Project A1)
   - Story A1 (in Project A1, Epic A1)

3. **Authentication tokens:**
   - Set USER_A_TOKEN environment variable
   - Set USER_B_TOKEN environment variable

### Environment Variables

\`\`\`bash
export USER_A_TOKEN="your_user_a_auth_token"
export USER_B_TOKEN="your_user_b_auth_token"
export PROJECT_A_ID="user_a_project_id"
export PROJECT_B_ID="user_b_project_id"
export EPIC_A_ID="user_a_epic_id"
export STORY_A_ID="user_a_story_id"
\`\`\`

---

## Test Results

EOF

# Check required environment variables
if [ -z "$USER_A_TOKEN" ] || [ -z "$USER_B_TOKEN" ]; then
    echo -e "${RED}ERROR: USER_A_TOKEN and USER_B_TOKEN must be set${NC}"
    echo -e "Please set authentication tokens for two different users:\n"
    echo -e "  export USER_A_TOKEN=\"your_user_a_token\""
    echo -e "  export USER_B_TOKEN=\"your_user_b_token\""
    echo ""
    echo "Run this script after setting these variables."
    exit 1
fi

log_test() {
    local status=$1
    local test_name=$2
    local expected=$3
    local actual=$4
    local details=$5

    echo -e "\n### Test: $test_name\n" >> "$RESULTS_FILE"
    echo -e "**Expected:** $expected\n" >> "$RESULTS_FILE"
    echo -e "**Actual:** $actual\n" >> "$RESULTS_FILE"

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        echo -e "**Result:** ✅ PASS\n" >> "$RESULTS_FILE"
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "**Result:** ❌ FAIL\n" >> "$RESULTS_FILE"
    fi

    if [ -n "$details" ]; then
        echo -e "**Details:**\n\`\`\`\n$details\n\`\`\`\n" >> "$RESULTS_FILE"
    fi

    echo "---" >> "$RESULTS_FILE"
    echo ""
}

# Test 1: User B cannot access User A's project
test_cross_tenant_project_access() {
    echo -e "${BLUE}Test 1: Cross-tenant project access${NC}"

    if [ -z "$PROJECT_A_ID" ]; then
        log_test "SKIP" "Cross-tenant project access" "403 Forbidden" "Skipped" "PROJECT_A_ID not set"
        return
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/projects/$PROJECT_A_ID" 2>/dev/null)

    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
        log_test "PASS" \
            "Cross-tenant project access" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    else
        log_test "FAIL" \
            "Cross-tenant project access" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    fi
}

# Test 2: User B cannot see User A's projects in list
test_cross_tenant_project_list() {
    echo -e "${BLUE}Test 2: Cross-tenant project list isolation${NC}"

    local response=$(curl -s \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/projects" 2>/dev/null)

    # Check if PROJECT_A_ID appears in User B's project list
    if echo "$response" | grep -q "$PROJECT_A_ID" 2>/dev/null; then
        log_test "FAIL" \
            "Cross-tenant project list isolation" \
            "User B's project list should not contain User A's projects" \
            "User A's project found in User B's list" \
            "$response"
    else
        log_test "PASS" \
            "Cross-tenant project list isolation" \
            "User B's project list should not contain User A's projects" \
            "No cross-tenant leakage detected" \
            "Response length: $(echo "$response" | wc -c) bytes"
    fi
}

# Test 3: User B cannot access User A's epic
test_cross_tenant_epic_access() {
    echo -e "${BLUE}Test 3: Cross-tenant epic access${NC}"

    if [ -z "$EPIC_A_ID" ]; then
        log_test "SKIP" "Cross-tenant epic access" "403 Forbidden" "Skipped" "EPIC_A_ID not set"
        return
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/epics/$EPIC_A_ID" 2>/dev/null)

    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
        log_test "PASS" \
            "Cross-tenant epic access" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    else
        log_test "FAIL" \
            "Cross-tenant epic access" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    fi
}

# Test 4: User B cannot access User A's story
test_cross_tenant_story_access() {
    echo -e "${BLUE}Test 4: Cross-tenant story access${NC}"

    if [ -z "$STORY_A_ID" ]; then
        log_test "SKIP" "Cross-tenant story access" "403 Forbidden" "Skipped" "STORY_A_ID not set"
        return
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/stories/$STORY_A_ID" 2>/dev/null)

    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
        log_test "PASS" \
            "Cross-tenant story access" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    else
        log_test "FAIL" \
            "Cross-tenant story access" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    fi
}

# Test 5: User B cannot see User A's stories in global Stories page
test_cross_tenant_stories_list() {
    echo -e "${BLUE}Test 5: Global Stories page isolation${NC}"

    local response=$(curl -s \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/stories" 2>/dev/null)

    # Check if STORY_A_ID or PROJECT_A_ID appears in User B's stories list
    if echo "$response" | grep -q "$STORY_A_ID\|$PROJECT_A_ID" 2>/dev/null; then
        log_test "FAIL" \
            "Global Stories page isolation" \
            "User B should not see User A's stories" \
            "User A's stories found in User B's list" \
            "$response"
    else
        log_test "PASS" \
            "Global Stories page isolation" \
            "User B should not see User A's stories" \
            "No cross-tenant leakage detected" \
            "Response length: $(echo "$response" | wc -c) bytes"
    fi
}

# Test 6: User B cannot update User A's project
test_cross_tenant_project_update() {
    echo -e "${BLUE}Test 6: Cross-tenant project update${NC}"

    if [ -z "$PROJECT_A_ID" ]; then
        log_test "SKIP" "Cross-tenant project update" "403 Forbidden" "Skipped" "PROJECT_A_ID not set"
        return
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -X PATCH \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Hacked Project"}' \
        "$BASE_URL/api/projects/$PROJECT_A_ID" 2>/dev/null)

    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
        log_test "PASS" \
            "Cross-tenant project update" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    else
        log_test "FAIL" \
            "Cross-tenant project update" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code - UPDATE SUCCEEDED (CRITICAL SECURITY ISSUE)" \
            "$body"
    fi
}

# Test 7: User B cannot delete User A's story
test_cross_tenant_story_delete() {
    echo -e "${BLUE}Test 7: Cross-tenant story delete${NC}"

    if [ -z "$STORY_A_ID" ]; then
        log_test "SKIP" "Cross-tenant story delete" "403 Forbidden" "Skipped" "STORY_A_ID not set"
        return
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -X DELETE \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/stories/$STORY_A_ID" 2>/dev/null)

    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
        log_test "PASS" \
            "Cross-tenant story delete" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    else
        log_test "FAIL" \
            "Cross-tenant story delete" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code - DELETE SUCCEEDED (CRITICAL SECURITY ISSUE)" \
            "$body"
    fi
}

# Test 8: User B cannot publish User A's epic
test_cross_tenant_epic_publish() {
    echo -e "${BLUE}Test 8: Cross-tenant epic publish${NC}"

    if [ -z "$EPIC_A_ID" ]; then
        log_test "SKIP" "Cross-tenant epic publish" "403 Forbidden" "Skipped" "EPIC_A_ID not set"
        return
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $USER_B_TOKEN" \
        "$BASE_URL/api/epics/$EPIC_A_ID/publish" 2>/dev/null)

    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
        log_test "PASS" \
            "Cross-tenant epic publish" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code" \
            "$body"
    else
        log_test "FAIL" \
            "Cross-tenant epic publish" \
            "403 Forbidden or 404 Not Found" \
            "HTTP $http_code - PUBLISH SUCCEEDED (CRITICAL SECURITY ISSUE)" \
            "$body"
    fi
}

# Test 9: Unauthenticated access blocked
test_unauthenticated_access() {
    echo -e "${BLUE}Test 9: Unauthenticated access${NC}"

    local endpoints=(
        "/api/projects"
        "/api/epics"
        "/api/stories"
    )

    local all_pass=true
    local details=""

    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -w "\n%{http_code}" \
            "$BASE_URL$endpoint" 2>/dev/null)

        local http_code=$(echo "$response" | tail -1)

        details+="$endpoint: HTTP $http_code\n"

        if [ "$http_code" != "401" ] && [ "$http_code" != "403" ]; then
            all_pass=false
        fi
    done

    if [ "$all_pass" = true ]; then
        log_test "PASS" \
            "Unauthenticated access blocked" \
            "401 Unauthorized or 403 Forbidden" \
            "All endpoints properly protected" \
            "$details"
    else
        log_test "FAIL" \
            "Unauthenticated access blocked" \
            "401 Unauthorized or 403 Forbidden" \
            "Some endpoints accessible without auth" \
            "$details"
    fi
}

# Test 10: Rate limiting (basic check)
test_rate_limiting() {
    echo -e "${BLUE}Test 10: Rate limiting${NC}"

    echo "Sending 100 rapid requests to /api/stories..."

    local rate_limited=false
    local request_count=0

    for i in {1..100}; do
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $USER_A_TOKEN" \
            "$BASE_URL/api/stories" 2>/dev/null)

        request_count=$((request_count + 1))

        if [ "$http_code" = "429" ]; then
            rate_limited=true
            break
        fi

        # Small delay to avoid overwhelming the server
        sleep 0.01
    done

    if [ "$rate_limited" = true ]; then
        log_test "PASS" \
            "Rate limiting active" \
            "429 Too Many Requests after threshold" \
            "Rate limited after $request_count requests" \
            "Rate limiting is working"
    else
        log_test "FAIL" \
            "Rate limiting active" \
            "429 Too Many Requests after threshold" \
            "No rate limiting detected after $request_count requests" \
            "Rate limiting may not be configured"
    fi
}

# =============================================================================
# RUN ALL TESTS
# =============================================================================

echo -e "${YELLOW}Starting RLS & Security tests...${NC}\n"
echo "Using:"
echo "  Base URL: $BASE_URL"
echo "  User A Token: ${USER_A_TOKEN:0:20}..."
echo "  User B Token: ${USER_B_TOKEN:0:20}..."
echo ""

test_cross_tenant_project_access
test_cross_tenant_project_list
test_cross_tenant_epic_access
test_cross_tenant_story_access
test_cross_tenant_stories_list
test_cross_tenant_project_update
test_cross_tenant_story_delete
test_cross_tenant_epic_publish
test_unauthenticated_access
test_rate_limiting

# =============================================================================
# SUMMARY
# =============================================================================

cat >> "$RESULTS_FILE" <<EOF

## Summary

### Critical Security Requirements

All tests above **MUST PASS** for production deployment. Any failures indicate:

- **403/404 failures:** RLS policies may not be working correctly
- **List isolation failures:** Cross-tenant data leakage (CRITICAL)
- **Update/delete failures:** Users can modify other organizations' data (CRITICAL)
- **Unauthenticated access:** API endpoints not properly secured
- **Rate limiting failures:** DoS protection not active

### Recommended Actions

If any tests failed:

1. Review RLS policies in database schema
2. Verify organization filtering in API route handlers
3. Check authentication middleware configuration
4. Implement rate limiting for all public API endpoints
5. Re-run tests after fixes

---

**Generated:** $(date)
**Test Suite Version:** 1.0
EOF

echo -e "\n${GREEN}RLS & Security testing complete!${NC}"
echo -e "Full report saved to: ${BLUE}$RESULTS_FILE${NC}\n"
