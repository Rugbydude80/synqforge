#!/bin/bash

# Complete User Journey Test
# Tests the actual signup flow with real API calls

echo "🔍 Testing Complete User Journey"
echo "================================="
echo ""

BASE_URL="${1:-https://synqforge.com}"
TEST_EMAIL="test-$(date +%s)@example.com"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

test_step() {
    echo -e "\n${YELLOW}Testing: $1${NC}"
}

pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

# Test 1: Signup page structure
test_step "Step 1: Signup page shows plan selection"
SIGNUP_PAGE=$(curl -s "$BASE_URL/auth/signup")
if echo "$SIGNUP_PAGE" | grep -q "Choose your plan"; then
    pass "Plan selection UI is displayed"
else
    fail "Plan selection UI not found"
fi

if echo "$SIGNUP_PAGE" | grep -q "Free" && echo "$SIGNUP_PAGE" | grep -q "Pro" && echo "$SIGNUP_PAGE" | grep -q "Enterprise"; then
    pass "All three plans are visible"
else
    fail "Not all plans are visible"
fi

# Test 2: Test Free plan signup (actual API call)
test_step "Step 2: Free plan signup via API"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Test User Free\",
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"TestPassword123!\",
        \"plan\": \"free\"
    }")

if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
    pass "Free plan signup successful"

    # Check that no checkout URL was created
    if echo "$SIGNUP_RESPONSE" | grep -q '"checkoutUrl"'; then
        # Check if checkoutUrl is null
        if echo "$SIGNUP_RESPONSE" | grep -q '"checkoutUrl":null'; then
            pass "Free plan correctly has no checkout URL"
        else
            fail "Free plan should have null checkout URL"
        fi
    else
        pass "Free plan correctly has no checkout URL field"
    fi
else
    fail "Free plan signup failed"
    echo "Response: $SIGNUP_RESPONSE"
fi

# Test 3: Check pricing page
test_step "Step 3: Pricing page content"
PRICING_PAGE=$(curl -s "$BASE_URL/pricing")
if echo "$PRICING_PAGE" | grep -q "29" && echo "$PRICING_PAGE" | grep -q "99"; then
    pass "Pricing page displays Pro and Enterprise prices"
else
    fail "Pricing page not displaying prices correctly"
fi

# Test 4: Stripe webhook endpoint
test_step "Step 4: Stripe webhook endpoint accessibility"
WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/stripe" \
    -H "Content-Type: application/json" \
    -d '{"type": "test"}')
HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    pass "Stripe webhook endpoint is accessible (status: $HTTP_CODE)"
else
    fail "Stripe webhook endpoint returned unexpected status: $HTTP_CODE"
fi

# Test 5: Test Pro plan signup (should create checkout session)
test_step "Step 5: Pro plan signup with Stripe checkout"
TEST_EMAIL_PRO="test-pro-$(date +%s)@example.com"
PRO_SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Test User Pro\",
        \"email\": \"$TEST_EMAIL_PRO\",
        \"password\": \"TestPassword123!\",
        \"plan\": \"pro\"
    }")

if echo "$PRO_SIGNUP_RESPONSE" | grep -q '"success":true'; then
    pass "Pro plan signup successful"

    # Check that checkout URL was created
    if echo "$PRO_SIGNUP_RESPONSE" | grep -q '"checkoutUrl":"https://'; then
        pass "Pro plan creates Stripe checkout URL"
        CHECKOUT_URL=$(echo "$PRO_SIGNUP_RESPONSE" | grep -o '"checkoutUrl":"[^"]*"' | cut -d'"' -f4)
        echo "   Checkout URL: $CHECKOUT_URL"
    else
        fail "Pro plan should create Stripe checkout URL"
        echo "Response: $PRO_SIGNUP_RESPONSE"
    fi
else
    fail "Pro plan signup failed"
    echo "Response: $PRO_SIGNUP_RESPONSE"
fi

# Summary
echo ""
echo "================================="
echo "Test Summary:"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review above.${NC}"
    exit 1
fi
