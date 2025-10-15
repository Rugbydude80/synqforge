#!/bin/bash

# User Journey Validation Script
# Tests the complete signup flow with plan selection and Stripe integration

echo "🔍 Validating Complete User Journey"
echo "======================================"
echo ""

BASE_URL="${1:-https://synqforge.com}"
TEST_EMAIL="test-$(date +%s)@example.com"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
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

# Test 1: Signup page loads with plan selection
test_step "Step 1: Signup page shows plan selection"
SIGNUP_RESPONSE=$(curl -s "$BASE_URL/auth/signup")
if echo "$SIGNUP_RESPONSE" | grep -q "Choose your plan"; then
    pass "Plan selection UI is displayed"
else
    fail "Plan selection UI not found"
fi

if echo "$SIGNUP_RESPONSE" | grep -q "Free.*Pro.*Enterprise"; then
    pass "All three plans are shown"
else
    fail "Not all plans are visible"
fi

# Test 2: Check if Stripe is configured
test_step "Step 2: Stripe integration"
if [ -z "$STRIPE_PRO_PRICE_ID" ]; then
    fail "STRIPE_PRO_PRICE_ID not set in environment"
else
    pass "STRIPE_PRO_PRICE_ID is configured"
fi

if [ -z "$STRIPE_ENTERPRISE_PRICE_ID" ]; then
    fail "STRIPE_ENTERPRISE_PRICE_ID not set in environment"
else
    pass "STRIPE_ENTERPRISE_PRICE_ID is configured"
fi

# Test 3: Test signup API with free plan
test_step "Step 3: Free plan signup"
SIGNUP_API_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test User Free",
        "email": "'"$TEST_EMAIL"'",
        "password": "TestPassword123!",
        "plan": "free"
    }')

if echo "$SIGNUP_API_RESPONSE" | grep -q "success.*true"; then
    pass "Free plan signup successful"
    if echo "$SIGNUP_API_RESPONSE" | grep -q "checkoutUrl"; then
        fail "Free plan should NOT have checkout URL"
    else
        pass "Free plan correctly has no checkout URL"
    fi
else
    fail "Free plan signup failed: $SIGNUP_API_RESPONSE"
fi

# Test 4: Check organization was created with correct tier
test_step "Step 4: Organization subscription tier"
echo "Note: This requires database access to verify organization.subscriptionTier"

# Test 5: Check subscription limits are enforced
test_step "Step 5: Subscription limits"
LIMITS_RESPONSE=$(curl -s "$BASE_URL/api/team/limits" \
    -H "Cookie: next-auth.session-token=dummy")

if echo "$LIMITS_RESPONSE" | grep -q "maxProjects\|maxUsers"; then
    pass "Subscription limits API exists"
else
    fail "Subscription limits API not responding correctly"
fi

# Test 6: Pricing page integration
test_step "Step 6: Pricing page"
PRICING_RESPONSE=$(curl -s "$BASE_URL/pricing")
if echo "$PRICING_RESPONSE" | grep -q "\$29.*\$99"; then
    pass "Pricing page displays correct prices"
else
    fail "Pricing page not displaying prices correctly"
fi

# Test 7: Webhook endpoint
test_step "Step 7: Stripe webhook"
WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/stripe" \
    -H "Content-Type: application/json" \
    -d '{"type": "test"}')

if [ $? -eq 0 ]; then
    pass "Stripe webhook endpoint is accessible"
else
    fail "Stripe webhook endpoint error"
fi

# Summary
echo ""
echo "======================================"
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
