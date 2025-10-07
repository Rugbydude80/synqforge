#!/bin/bash

# Test Rate Limiting for Password Reset
# This script sends 4 password reset requests to test the rate limit

echo "🧪 Testing Rate Limit (3 requests allowed per hour)"
echo "=================================================="
echo ""

TEST_EMAIL="ratelimit-test@example.com"

for i in {1..4}; do
  echo "📬 Request $i of 4..."

  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST http://localhost:3000/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}")

  HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
  HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

  echo "   Status: $HTTP_STATUS"
  echo "   Response: $HTTP_BODY" | head -c 100
  echo ""

  # Add small delay between requests
  if [ $i -lt 4 ]; then
    sleep 1
  fi
done

echo ""
echo "=================================================="
echo "✅ Test Complete!"
echo ""
echo "Expected Results:"
echo "  • Requests 1-3: HTTP 200 (Success)"
echo "  • Request 4: HTTP 429 (Rate Limited)"
echo ""
echo "If Request 4 returned 429, rate limiting is working! 🎉"
