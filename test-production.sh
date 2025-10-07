#!/bin/bash

echo "🧪 Testing Production Rate Limiting on synqforge.com"
echo "===================================================="
echo ""

TEST_EMAIL="production-test-$(date +%s)@example.com"

for i in {1..4}; do
  echo "📬 Request $i of 4 to https://synqforge.com..."

  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST https://synqforge.com/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}")

  HTTP_BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | sed 's/HTTP_CODE://')

  echo "   Status: $HTTP_CODE"
  echo "   Response: $(echo $HTTP_BODY | head -c 80)..."
  echo ""

  if [ $i -lt 4 ]; then
    sleep 2
  fi
done

echo "===================================================="
echo "✅ Test Complete!"
echo ""
echo "Expected Results:"
echo "  • Requests 1-3: HTTP 200 (Success)"
echo "  • Request 4: HTTP 429 (Rate Limited) ← This means it's working!"
echo ""
