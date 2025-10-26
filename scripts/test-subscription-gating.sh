#!/bin/bash
# Subscription Gating Verification Script
# Tests subscription enforcement using Stripe CLI and curl

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 Subscription Gating Verification"
echo "=================================="
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_TOKEN="${SESSION_TOKEN:-}"

if [ -z "$SESSION_TOKEN" ]; then
  echo -e "${RED}❌ Error: SESSION_TOKEN environment variable not set${NC}"
  echo "Usage: SESSION_TOKEN=your-token ./scripts/test-subscription-gating.sh"
  exit 1
fi

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local tier="$5"

  echo -e "${YELLOW}Testing: $name${NC}"
  
  response=$(curl -s -w "\n%{http_code}" \
    -X "$method" \
    "$BASE_URL$endpoint" \
    -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
    -H "Content-Type: application/json")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $http_code (Expected tier: $tier)"
  else
    echo -e "${RED}❌ FAIL${NC} - Status: $http_code (Expected: $expected_status)"
    echo "Response: $body"
  fi
  echo ""
}

echo "=== Testing Free User Access ==="
echo "All requests should return 402 Payment Required"
echo ""

# Test export endpoints (Core+ required)
test_endpoint "Stories Export" "GET" "/api/stories/export?format=excel" "402" "Core"
test_endpoint "Project Export" "GET" "/api/projects/test-project-id/export?format=pdf" "402" "Core"

# Test bulk operations (Pro+ required)
test_endpoint "Bulk Story Creation" "POST" "/api/stories/bulk" "402" "Pro"
test_endpoint "Batch AI Creation" "POST" "/api/ai/batch-create-stories" "402" "Pro"

# Test document analysis (Pro+ required)
echo "Note: Document analysis requires multipart/form-data, skipping in this test"

echo "=== Subscription Gate Summary ==="
echo "All tests above should return 402 for free users"
echo ""
echo "To test with paid users:"
echo "1. Create a Pro subscription in Stripe"
echo "2. Trigger webhook: stripe trigger customer.subscription.created"
echo "3. Verify tier updated in database"
echo "4. Re-run this script with pro user session token"
echo ""
echo "✅ Verification complete!"

