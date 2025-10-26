#!/bin/bash

# Test Stripe Checkout Flow for All Tiers
# This script verifies that all products and prices are correctly set up

set -e

echo "======================================"
echo "SynqForge Checkout Flow Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if app is running
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
echo "Testing against: $APP_URL"
echo ""

# Function to test API endpoint
test_endpoint() {
  local endpoint=$1
  local description=$2
  
  echo -n "Testing $description... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL$endpoint")
  
  if [ "$response" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
    return 1
  fi
}

# Function to test prices API
test_prices_api() {
  echo "Testing Prices API..."
  echo "------------------------------"
  
  response=$(curl -s "$APP_URL/api/billing/prices")
  
  if echo "$response" | jq -e '.prices' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prices API returns valid JSON${NC}"
    
    # Extract product names
    products=$(echo "$response" | jq -r '.prices | keys[]')
    echo ""
    echo "Available products:"
    echo "$products" | while read -r product; do
      echo "  - $product"
      
      # Check currencies
      currencies=$(echo "$response" | jq -r ".prices[\"$product\"] | keys[]")
      echo "    Currencies: $currencies"
    done
    echo ""
    return 0
  else
    echo -e "${RED}✗ Prices API failed${NC}"
    echo "Response: $response"
    return 1
  fi
}

# Function to check Stripe products
check_stripe_products() {
  echo "Checking Stripe Products..."
  echo "------------------------------"
  
  if ! command -v stripe &> /dev/null; then
    echo -e "${YELLOW}⚠ Stripe CLI not installed - skipping product check${NC}"
    echo "  Install from: https://stripe.com/docs/stripe-cli"
    return 0
  fi
  
  echo "Fetching products from Stripe..."
  products=$(stripe products list --limit 10 2>/dev/null || echo "")
  
  if [ -z "$products" ]; then
    echo -e "${YELLOW}⚠ Could not fetch Stripe products${NC}"
    echo "  Make sure you're logged in: stripe login"
    return 0
  fi
  
  # Check for expected products
  expected_products=("SynqForge Free" "SynqForge Core" "SynqForge Pro" "SynqForge Team" "SynqForge Enterprise")
  
  for product in "${expected_products[@]}"; do
    if echo "$products" | grep -q "$product"; then
      echo -e "${GREEN}✓${NC} Found: $product"
    else
      echo -e "${RED}✗${NC} Missing: $product"
    fi
  done
  echo ""
}

# Function to test checkout creation (requires authentication)
test_checkout_creation() {
  echo "Testing Checkout Creation..."
  echo "------------------------------"
  echo -e "${YELLOW}⚠ Checkout creation requires authentication${NC}"
  echo "  This test will check if the endpoint exists but won't create actual sessions"
  echo ""
  
  # Test without auth (should return 401)
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$APP_URL/api/billing/create-checkout" \
    -H "Content-Type: application/json" \
    -d '{"priceId":"test","tier":"core"}')
  
  if [ "$response" -eq 401 ]; then
    echo -e "${GREEN}✓ Checkout endpoint properly requires authentication${NC}"
  else
    echo -e "${YELLOW}⚠ Unexpected response: HTTP $response${NC}"
  fi
  echo ""
}

# Run all tests
echo "Starting tests..."
echo ""

# Test 1: Health check
test_endpoint "/api/health" "Health Check"
echo ""

# Test 2: Prices API
test_prices_api
echo ""

# Test 3: Stripe products
check_stripe_products

# Test 4: Checkout endpoint
test_checkout_creation

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""
echo "Next steps for manual testing:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Navigate to the pricing page:"
echo "   $APP_URL/pricing"
echo ""
echo "3. Sign in with a test account"
echo ""
echo "4. Try purchasing each tier:"
echo "   - Core (£10.99/month)"
echo "   - Pro (£19.99/month)"
echo "   - Team (£16.99/month, min 5 seats)"
echo ""
echo "5. Use Stripe test card:"
echo "   Card: 4242 4242 4242 4242"
echo "   Expiry: Any future date"
echo "   CVC: Any 3 digits"
echo ""
echo "6. Verify webhook processing:"
echo "   stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo ""
echo "7. Check organization limits after purchase:"
echo "   Query the 'organizations' table"
echo "   Verify 'aiTokensIncluded', 'seatsIncluded', etc."
echo ""

