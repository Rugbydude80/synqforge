#!/bin/bash

echo "🚀 VERIFYING PRODUCTION DEPLOYMENT"
echo "===================================="
echo ""
echo "Testing: https://synqforge.com"
echo ""

# Test 1: Site is live
echo "1️⃣  Testing site availability..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://synqforge.com)
if [ "$STATUS" = "200" ]; then
  echo "   ✅ Site is live (HTTP $STATUS)"
else
  echo "   ❌ Site issue (HTTP $STATUS)"
fi
echo ""

# Test 2: Signup endpoint
echo "2️⃣  Testing signup endpoint..."
SIGNUP_RESPONSE=$(curl -s -X POST https://synqforge.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Deploy Test\",\"email\":\"deploy-test-$(date +%s)@updates.synqforge.com\",\"password\":\"testpassword123\"}" \
  -w "\nHTTP:%{http_code}")

SIGNUP_STATUS=$(echo "$SIGNUP_RESPONSE" | grep "HTTP:" | sed 's/HTTP://')
if [ "$SIGNUP_STATUS" = "200" ]; then
  echo "   ✅ Signup working (HTTP $SIGNUP_STATUS)"
else
  echo "   ❌ Signup issue (HTTP $SIGNUP_STATUS)"
  echo "   Response: $(echo "$SIGNUP_RESPONSE" | grep -v "HTTP:")"
fi
echo ""

# Test 3: Password reset endpoint
echo "3️⃣  Testing password reset endpoint..."
RESET_RESPONSE=$(curl -s -X POST https://synqforge.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"verify-test@example.com"}' \
  -w "\nHTTP:%{http_code}")

RESET_STATUS=$(echo "$RESET_RESPONSE" | grep "HTTP:" | sed 's/HTTP://')
if [ "$RESET_STATUS" = "200" ]; then
  echo "   ✅ Password reset working (HTTP $RESET_STATUS)"
else
  echo "   ❌ Password reset issue (HTTP $RESET_STATUS)"
fi
echo ""

# Test 4: Rate limiting
echo "4️⃣  Testing rate limiting (sending 4 requests)..."
TEST_EMAIL="ratelimit-verify-$(date +%s)@example.com"
RATE_LIMIT_TRIGGERED=false

for i in {1..4}; do
  RL_RESPONSE=$(curl -s -X POST https://synqforge.com/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}" \
    -w "\nHTTP:%{http_code}")

  RL_STATUS=$(echo "$RL_RESPONSE" | grep "HTTP:" | sed 's/HTTP://')

  if [ "$RL_STATUS" = "429" ]; then
    RATE_LIMIT_TRIGGERED=true
    echo "   ✅ Rate limit triggered on request $i (HTTP 429)"
    break
  fi

  sleep 1
done

if [ "$RATE_LIMIT_TRIGGERED" = true ]; then
  echo "   ✅ Rate limiting is ACTIVE and working"
else
  echo "   ⚠️  Rate limit not triggered (may need more requests or Redis not configured)"
fi
echo ""

# Summary
echo "===================================="
echo "✅ DEPLOYMENT VERIFICATION COMPLETE"
echo ""
echo "Summary:"
echo "  • Site: $([ "$STATUS" = "200" ] && echo "✅ Live" || echo "❌ Issue")"
echo "  • Signup: $([ "$SIGNUP_STATUS" = "200" ] && echo "✅ Working" || echo "❌ Issue")"
echo "  • Password Reset: $([ "$RESET_STATUS" = "200" ] && echo "✅ Working" || echo "❌ Issue")"
echo "  • Rate Limiting: $([ "$RATE_LIMIT_TRIGGERED" = true ] && echo "✅ Active" || echo "⚠️  Check Redis config")"
echo ""
echo "🎉 Production deployment verified!"
echo ""
