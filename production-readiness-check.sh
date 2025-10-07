#!/bin/bash

echo "🚀 PRODUCTION READINESS CHECK"
echo "======================================"
echo ""

ISSUES=0
WARNINGS=0

# Function to mark success
success() {
  echo "   ✅ $1"
}

# Function to mark warning
warning() {
  echo "   ⚠️  $1"
  ((WARNINGS++))
}

# Function to mark failure
fail() {
  echo "   ❌ $1"
  ((ISSUES++))
}

# CHECK 1: Code Quality - Model Names
echo "1️⃣  Checking AI model names in code..."
invalid_models=$(grep -r "claude-3-5-sonnet-latest\|anthropic/claude-sonnet-4" app/api/ai --include="*.ts" 2>/dev/null)
if [ -z "$invalid_models" ]; then
  success "All model names are valid"
else
  fail "Found invalid model names in code"
  echo "$invalid_models"
fi
echo ""

# CHECK 2: Environment Variables
echo "2️⃣  Checking environment variables..."

# Check Anthropic API Key
if vercel env ls 2>&1 | grep -q "ANTHROPIC_API_KEY"; then
  success "ANTHROPIC_API_KEY configured in Vercel"
else
  fail "ANTHROPIC_API_KEY missing from Vercel"
fi

# Check Database URL
if vercel env ls 2>&1 | grep -q "DATABASE_URL"; then
  success "DATABASE_URL configured in Vercel"
else
  fail "DATABASE_URL missing from Vercel"
fi

# Check NextAuth Secret
if vercel env ls 2>&1 | grep -q "NEXTAUTH_SECRET"; then
  success "NEXTAUTH_SECRET configured in Vercel"
else
  fail "NEXTAUTH_SECRET missing from Vercel"
fi

# Check Rate Limiting
if vercel env ls 2>&1 | grep -q "UPSTASH_REDIS_REST_URL"; then
  success "UPSTASH_REDIS_REST_URL configured (rate limiting)"
else
  warning "UPSTASH_REDIS_REST_URL not configured (rate limiting disabled)"
fi

echo ""

# CHECK 3: Git Status
echo "3️⃣  Checking Git repository..."
if [ -z "$(git status --porcelain)" ]; then
  success "No uncommitted changes"
else
  warning "Uncommitted changes detected"
  git status --short | head -5
fi
echo ""

# CHECK 4: Latest Commit
echo "4️⃣  Latest commit..."
git_commit=$(git log --oneline -1)
echo "   📝 $git_commit"
echo ""

# CHECK 5: API Endpoints
echo "5️⃣  Testing API endpoints..."

# Health check
health=$(curl -s https://synqforge.com/api/health)
health_status=$(echo "$health" | jq -r '.status' 2>/dev/null)
if [ "$health_status" == "healthy" ]; then
  success "Health endpoint responding"
else
  fail "Health endpoint not responding correctly"
fi

# AI endpoint (should return 401)
ai_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"requirement":"test","projectId":"test"}' \
  https://synqforge.com/api/ai/generate-single-story)

if [ "$ai_status" == "401" ]; then
  success "AI endpoint configured correctly (401 - auth required)"
elif [ "$ai_status" == "500" ]; then
  fail "AI endpoint returns 500 (configuration error)"
else
  warning "AI endpoint returns unexpected code: $ai_status"
fi

echo ""

# CHECK 6: Error Handling
echo "6️⃣  Checking error handling..."

# Test with invalid JSON
invalid_json_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d 'invalid json' \
  https://synqforge.com/api/ai/generate-single-story)

if [ "$invalid_json_status" == "400" ] || [ "$invalid_json_status" == "401" ]; then
  success "Invalid JSON handled correctly"
else
  warning "Invalid JSON returns: $invalid_json_status"
fi

echo ""

# CHECK 7: Security Headers
echo "7️⃣  Checking security headers..."
headers=$(curl -s -I https://synqforge.com)

if echo "$headers" | grep -qi "x-frame-options"; then
  success "X-Frame-Options header present"
else
  warning "X-Frame-Options header missing"
fi

if echo "$headers" | grep -qi "strict-transport-security"; then
  success "HSTS header present"
else
  warning "HSTS header missing (Vercel should add this)"
fi

echo ""

# CHECK 8: Database Connection
echo "8️⃣  Checking database connection..."
db_status=$(echo "$health" | jq -r '.database' 2>/dev/null)
if [ "$db_status" == "connected" ]; then
  success "Database connected"
else
  fail "Database connection issue"
fi

echo ""

# CHECK 9: Deployment Status
echo "9️⃣  Checking Vercel deployment..."
latest_deploy=$(vercel ls 2>&1 | grep "● Ready" | grep "Production" | head -1)
if [ -n "$latest_deploy" ]; then
  deploy_age=$(echo "$latest_deploy" | awk '{print $1}')
  success "Latest production deployment: $deploy_age"
else
  warning "Could not verify deployment status"
fi

echo ""

# CHECK 10: TypeScript Build
echo "🔟  Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
  success "TypeScript configuration exists"

  # Check if we can compile (optional, may be slow)
  # if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  #   fail "TypeScript compilation errors detected"
  # else
  #   success "TypeScript compiles without errors"
  # fi
else
  warning "tsconfig.json not found"
fi

echo ""

# SUMMARY
echo "======================================"
echo "📊 PRODUCTION READINESS SUMMARY"
echo "======================================"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "🎉 ALL CHECKS PASSED!"
  echo "✅ Your application is production-ready"
  echo ""
  echo "✨ Ready to deploy with confidence!"
elif [ $ISSUES -eq 0 ]; then
  echo "✅ ALL CRITICAL CHECKS PASSED"
  echo "⚠️  $WARNINGS warning(s) - review recommended"
  echo ""
  echo "The application should work in production, but consider addressing warnings."
else
  echo "❌ FOUND $ISSUES CRITICAL ISSUE(S)"
  if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  $WARNINGS warning(s)"
  fi
  echo ""
  echo "⚠️  Please fix critical issues before deploying to production!"
fi

echo ""
echo "======================================"

exit $ISSUES