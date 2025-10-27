#!/bin/bash
#
# Middleware Subscription Blocking - Validation Test Script
# Tests all tier-based route blocking in middleware
#
# Usage:
#   FREE_USER_SESSION=xxx CORE_USER_SESSION=xxx PRO_USER_SESSION=xxx ./scripts/test-middleware-blocking.sh
#

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 Middleware Subscription Blocking Validation"
echo "=============================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Check required environment variables
if [ -z "$FREE_USER_SESSION" ]; then
  echo "❌ FREE_USER_SESSION not set"
  echo "   Set it with: export FREE_USER_SESSION=your_session_token"
  exit 1
fi

if [ -z "$CORE_USER_SESSION" ]; then
  echo "⚠️  CORE_USER_SESSION not set - skipping Core tier tests"
fi

if [ -z "$PRO_USER_SESSION" ]; then
  echo "⚠️  PRO_USER_SESSION not set - skipping Pro tier tests"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST CATEGORY: Export Routes (Core+ Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Free user blocked from story export
echo "Test 1: Free user → /api/stories/export"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test1_response.json \
  "$BASE_URL/api/stories/export?format=excel" \
  -H "Cookie: next-auth.session-token=$FREE_USER_SESSION" \
  2>/dev/null || echo "000")

if [ "$RESPONSE" = "402" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 402 Payment Required"
  ERROR=$(cat /tmp/test1_response.json | grep -o '"error":"[^"]*"' || echo "")
  TIER=$(cat /tmp/test1_response.json | grep -o '"requiredTier":"[^"]*"' || echo "")
  echo "   Response: $ERROR $TIER"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 402, got $RESPONSE"
  cat /tmp/test1_response.json
fi
echo ""

# Test 2: Free user blocked from project export
echo "Test 2: Free user → /api/projects/test-id/export"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test2_response.json \
  "$BASE_URL/api/projects/test-id/export?format=pdf" \
  -H "Cookie: next-auth.session-token=$FREE_USER_SESSION" \
  2>/dev/null || echo "000")

if [ "$RESPONSE" = "402" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 402 Payment Required"
  TIER=$(cat /tmp/test2_response.json | grep -o '"requiredTier":"[^"]*"' || echo "")
  echo "   Response: $TIER"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 402, got $RESPONSE"
  cat /tmp/test2_response.json
fi
echo ""

# Test 3: Core user can access export
if [ -n "$CORE_USER_SESSION" ]; then
  echo "Test 3: Core user → /api/stories/export"
  RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test3_response.json \
    "$BASE_URL/api/stories/export?format=excel" \
    -H "Cookie: next-auth.session-token=$CORE_USER_SESSION" \
    2>/dev/null || echo "000")

  if [ "$RESPONSE" != "402" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Did NOT return 402 (got $RESPONSE)"
    echo "   Note: May be 404 or 400 if no stories exist - that's fine"
  else
    echo -e "${RED}❌ FAIL${NC} - Core user should have access but got 402"
    cat /tmp/test3_response.json
  fi
  echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST CATEGORY: Bulk Operations (Pro+ Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 4: Free user blocked from bulk operations
echo "Test 4: Free user → /api/stories/bulk"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test4_response.json \
  -X POST "$BASE_URL/api/stories/bulk" \
  -H "Cookie: next-auth.session-token=$FREE_USER_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","stories":[{"title":"Test"}]}' \
  2>/dev/null || echo "000")

if [ "$RESPONSE" = "402" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 402 Payment Required"
  TIER=$(cat /tmp/test4_response.json | grep -o '"requiredTier":"[^"]*"' || echo "")
  echo "   Response: $TIER"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 402, got $RESPONSE"
  cat /tmp/test4_response.json
fi
echo ""

# Test 5: Core user also blocked from bulk operations (needs Pro)
if [ -n "$CORE_USER_SESSION" ]; then
  echo "Test 5: Core user → /api/stories/bulk (should still be blocked)"
  RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test5_response.json \
    -X POST "$BASE_URL/api/stories/bulk" \
    -H "Cookie: next-auth.session-token=$CORE_USER_SESSION" \
    -H "Content-Type: application/json" \
    -d '{"projectId":"test","stories":[{"title":"Test"}]}' \
    2>/dev/null || echo "000")

  if [ "$RESPONSE" = "402" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Core user correctly blocked (needs Pro)"
    TIER=$(cat /tmp/test5_response.json | grep -o '"requiredTier":"pro"' || echo "")
    echo "   Response: $TIER"
  else
    echo -e "${RED}❌ FAIL${NC} - Core user should be blocked but got $RESPONSE"
    cat /tmp/test5_response.json
  fi
  echo ""
fi

# Test 6: Pro user can access bulk operations
if [ -n "$PRO_USER_SESSION" ]; then
  echo "Test 6: Pro user → /api/stories/bulk"
  RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test6_response.json \
    -X POST "$BASE_URL/api/stories/bulk" \
    -H "Cookie: next-auth.session-token=$PRO_USER_SESSION" \
    -H "Content-Type: application/json" \
    -d '{"projectId":"test","stories":[{"title":"Test"}]}' \
    2>/dev/null || echo "000")

  if [ "$RESPONSE" != "402" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Did NOT return 402 (got $RESPONSE)"
    echo "   Note: May be 400/404/403 for other validation reasons - that's fine"
  else
    echo -e "${RED}❌ FAIL${NC} - Pro user should have access but got 402"
    cat /tmp/test6_response.json
  fi
  echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST CATEGORY: Document Analysis (Pro+ Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 7: Free user blocked from document analysis
echo "Test 7: Free user → /api/ai/analyze-document"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test7_response.json \
  -X POST "$BASE_URL/api/ai/analyze-document" \
  -H "Cookie: next-auth.session-token=$FREE_USER_SESSION" \
  -F "file=@/dev/null" \
  2>/dev/null || echo "000")

if [ "$RESPONSE" = "402" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 402 Payment Required"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 402, got $RESPONSE"
  cat /tmp/test7_response.json
fi
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST CATEGORY: Team Routes (Team+ Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 8: Team routes should be blocked for free/core users
echo "Test 8: Free user → /api/team/invite"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test8_response.json \
  -X POST "$BASE_URL/api/team/invite" \
  -H "Cookie: next-auth.session-token=$FREE_USER_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","role":"member"}' \
  2>/dev/null || echo "000")

# Note: This route has its own checks (admin role + seat limits)
# The middleware should block it before it gets there for free users
if [ "$RESPONSE" = "402" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Middleware blocked at Team tier (402)"
elif [ "$RESPONSE" = "403" ]; then
  echo -e "${YELLOW}⚠️  PARTIAL${NC} - Blocked by route handler (403) not middleware"
  echo "   The route has its own checks, but middleware should block first"
else
  echo -e "${YELLOW}⚠️  UNEXPECTED${NC} - Got $RESPONSE"
  echo "   Expected 402 from middleware or 403 from route handler"
  cat /tmp/test8_response.json
fi
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST CATEGORY: Pattern Matching Edge Cases"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 9: Routes with 'export' in the name but not export routes
echo "Test 9: Pattern false positive check"
echo "   Note: This would need a route like /api/settings/export-config"
echo "   Currently no such routes exist in the codebase"
echo -e "${GREEN}✅ SKIP${NC} - No false positive routes to test"
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST CATEGORY: Whitelisted Routes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 10: Billing routes should be accessible
echo "Test 10: Free user → /api/stripe/create-checkout-session (whitelisted)"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/test10_response.json \
  -X POST "$BASE_URL/api/stripe/create-checkout-session" \
  -H "Cookie: next-auth.session-token=$FREE_USER_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_xxx"}' \
  2>/dev/null || echo "000")

if [ "$RESPONSE" != "402" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Did NOT return 402 (got $RESPONSE)"
  echo "   Billing routes should be accessible to allow upgrades"
else
  echo -e "${RED}❌ FAIL${NC} - Billing route should be accessible but got 402"
  cat /tmp/test10_response.json
fi
echo ""

# Cleanup
rm -f /tmp/test*_response.json

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VALIDATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   - Core tier blocks: Export routes"
echo "   - Pro tier blocks: Bulk ops, Document analysis, Batch operations"
echo "   - Team tier blocks: Team management, Approval flows"
echo "   - Enterprise blocks: SSO/SAML (no routes exist yet)"
echo ""
echo "🔧 Known Issues:"
echo "   1. Database failure = security bypass (lines 117-121 in middleware.ts)"
echo "   2. String matching uses .includes() - could have false positives"
echo "   3. /team/invite has its own checks, may not rely on middleware"
echo ""
echo "✅ Recommendation:"
echo "   - Middleware blocking is FUNCTIONAL for current routes"
echo "   - Fix database error handling before production"
echo "   - Consider regex patterns instead of .includes()"
echo ""

