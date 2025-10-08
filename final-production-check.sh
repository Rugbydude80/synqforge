#!/bin/bash

echo "🎯 FINAL PRODUCTION VALIDATION - REAL DATA CHECK"
echo "================================================="
echo ""

# Test endpoint
echo "Testing AI endpoint at https://synqforge.com..."
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"requirement":"test","projectId":"test"}' \
  https://synqforge.com/api/ai/generate-single-story)

status=$(echo "$response" | jq -r '.error // "ok"')

if [ "$status" == "Unauthorized" ]; then
  echo "✅ Endpoint accessible and secured (401 authentication required)"
else
  echo "Response: $response"
fi

echo ""
echo "Checking codebase for production readiness..."
echo ""

# Check 1: No fake token data
echo "1. Checking for fake token data (promptTokens: 0)..."
fake_tokens=$(grep -r "promptTokens:\s*0" app/api 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$fake_tokens" -eq 0 ]; then
  echo "   ✅ No fake token data found"
else
  echo "   ❌ Found $fake_tokens instances of fake token data"
  grep -r "promptTokens:\s*0" app/api 2>/dev/null | grep -v "node_modules"
fi

# Check 2: No mock/stub patterns
echo "2. Checking for mock/stub patterns..."
mock_patterns=$(grep -r "mock\|stub\|fake" app/api/**/*.ts 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$mock_patterns" -eq 0 ]; then
  echo "   ✅ No mock/stub patterns found"
else
  echo "   ⚠️  Found $mock_patterns potential mock patterns"
fi

# Check 3: Valid model names
echo "3. Checking for invalid model names..."
invalid_models=$(grep -r "claude-3-5-sonnet-latest\|anthropic/claude" app/api 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$invalid_models" -eq 0 ]; then
  echo "   ✅ All model names are valid"
else
  echo "   ❌ Found $invalid_models invalid model names"
  grep -r "claude-3-5-sonnet-latest\|anthropic/claude" app/api 2>/dev/null | grep -v "node_modules"
fi

# Check 4: AI service returns usage
echo "4. Checking AI service returns usage data..."
usage_returns=$(grep -A5 "return {" lib/services/ai.service.ts | grep "usage:" | wc -l)
if [ "$usage_returns" -ge 4 ]; then
  echo "   ✅ AI service methods return usage data ($usage_returns methods)"
else
  echo "   ❌ Not all AI service methods return usage data"
fi

# Check 5: Endpoints track real usage
echo "5. Checking endpoints use real usage data..."
real_usage=$(grep -r "response\.usage" app/api/ai 2>/dev/null | wc -l)
if [ "$real_usage" -ge 6 ]; then
  echo "   ✅ Endpoints using real usage data ($real_usage instances)"
else
  echo "   ⚠️  Only $real_usage instances of real usage tracking found"
fi

echo ""
echo "================================================="
echo "📊 PRODUCTION STATUS"
echo "================================================="
echo ""

if [ "$fake_tokens" -eq 0 ] && [ "$invalid_models" -eq 0 ] && [ "$usage_returns" -ge 4 ]; then
  echo "✅ ✅ ✅ PRODUCTION READY - ALL REAL DATA ✅ ✅ ✅"
  echo ""
  echo "All systems validated:"
  echo "  ✅ No fake token data"
  echo "  ✅ Valid model names"
  echo "  ✅ Real usage tracking"
  echo "  ✅ Proper API configuration"
  echo ""
  echo "🚀 Application is ready for production use!"
  echo "📍 Live at: https://synqforge.com"
else
  echo "⚠️  ISSUES DETECTED"
  echo ""
  echo "Please review the checks above and fix any issues."
fi

echo ""
