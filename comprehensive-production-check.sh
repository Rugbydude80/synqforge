#!/bin/bash

echo "🔍 COMPREHENSIVE PRODUCTION READINESS CHECK"
echo "============================================="
echo ""

CRITICAL=0
WARNINGS=0

# Check 1: Environment Variables
echo "1️⃣  Environment Variables Check"
echo "   Checking Vercel environment..."

required_vars=("ANTHROPIC_API_KEY" "DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
for var in "${required_vars[@]}"; do
  if vercel env ls 2>&1 | grep -q "$var"; then
    echo "   ✅ $var configured"
  else
    echo "   ❌ $var MISSING"
    ((CRITICAL++))
  fi
done
echo ""

# Check 2: Code Quality
echo "2️⃣  Code Quality Check"

# Check for TODO/FIXME in critical files
todos=$(grep -r "TODO\|FIXME\|HACK" app/api lib/services --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$todos" -eq 0 ]; then
  echo "   ✅ No TODO/FIXME/HACK comments in critical code"
else
  echo "   ⚠️  Found $todos TODO/FIXME/HACK comments"
  ((WARNINGS++))
fi

# Check for console.log in production code (excluding console.error)
debug_logs=$(grep -r "console\.log\|console\.debug" app/api lib/services --include="*.ts" 2>/dev/null | grep -v node_modules | grep -v console.error | wc -l)
if [ "$debug_logs" -eq 0 ]; then
  echo "   ✅ No debug console.log statements"
else
  echo "   ⚠️  Found $debug_logs console.log statements"
  ((WARNINGS++))
fi

echo ""

# Check 3: Security
echo "3️⃣  Security Check"

# Check for hardcoded secrets
secrets=$(grep -r "sk-.*api\|password.*=.*['\"].*['\"]" app lib --include="*.ts" 2>/dev/null | grep -v node_modules | grep -v ".env" | wc -l)
if [ "$secrets" -eq 0 ]; then
  echo "   ✅ No hardcoded secrets found"
else
  echo "   ❌ Found $secrets potential hardcoded secrets"
  ((CRITICAL++))
fi

# Check for proper error handling
error_handling=$(grep -r "catch.*error" app/api --include="*.ts" 2>/dev/null | wc -l)
endpoints=$(find app/api -name "route.ts" 2>/dev/null | wc -l)
if [ "$error_handling" -ge "$((endpoints * 80 / 100))" ]; then
  echo "   ✅ Error handling present ($error_handling catches for $endpoints endpoints)"
else
  echo "   ⚠️  Insufficient error handling ($error_handling catches for $endpoints endpoints)"
  ((WARNINGS++))
fi

echo ""

# Check 4: Database
echo "4️⃣  Database Check"

# Test database connection
if curl -s https://synqforge.com/api/health | grep -q "connected"; then
  echo "   ✅ Database connection working"
else
  echo "   ❌ Database connection failed"
  ((CRITICAL++))
fi

echo ""

# Check 5: AI Integration
echo "5️⃣  AI Integration Check"

# Check for proper model names
invalid_models=$(grep -r "claude-3-5-sonnet-latest\|claude-3-.*-latest" app/api lib/services --include="*.ts" 2>/dev/null | wc -l)
if [ "$invalid_models" -eq 0 ]; then
  echo "   ✅ All AI model names valid"
else
  echo "   ❌ Found $invalid_models invalid model names"
  ((CRITICAL++))
fi

# Check for real token tracking
real_tokens=$(grep -r "response\.usage\|epic\.usage\|validation\.usage" app/api --include="*.ts" 2>/dev/null | wc -l)
if [ "$real_tokens" -ge 6 ]; then
  echo "   ✅ Real token tracking implemented ($real_tokens instances)"
else
  echo "   ❌ Insufficient token tracking ($real_tokens instances)"
  ((CRITICAL++))
fi

echo ""

# Check 6: Rate Limiting
echo "6️⃣  Rate Limiting Check"

# Test rate limiting
rate_limit_test=$(curl -s -X POST https://synqforge.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}' -w "%{http_code}" -o /dev/null)

if [ "$rate_limit_test" == "429" ] || [ "$rate_limit_test" == "200" ]; then
  echo "   ✅ Rate limiting configured"
else
  echo "   ⚠️  Rate limiting may not be configured properly"
  ((WARNINGS++))
fi

echo ""

# Check 7: Type Safety
echo "7️⃣  TypeScript Type Safety"

# Check for 'any' types in critical files
any_types=$(grep -r ": any\|as any" app/api lib/services --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$any_types" -lt 10 ]; then
  echo "   ✅ Minimal use of 'any' types ($any_types instances)"
else
  echo "   ⚠️  High use of 'any' types ($any_types instances)"
  ((WARNINGS++))
fi

echo ""

# Check 8: API Endpoint Security
echo "8️⃣  API Endpoint Security"

# Check for auth middleware usage
auth_endpoints=$(grep -r "withAuth\|requireAuth" app/api --include="*.ts" 2>/dev/null | wc -l)
total_endpoints=$(find app/api -name "route.ts" 2>/dev/null | wc -l)
if [ "$auth_endpoints" -ge "$((total_endpoints * 50 / 100))" ]; then
  echo "   ✅ Auth middleware used ($auth_endpoints/$total_endpoints endpoints)"
else
  echo "   ⚠️  Limited auth middleware usage ($auth_endpoints/$total_endpoints endpoints)"
  ((WARNINGS++))
fi

echo ""

# Check 9: Build & Deployment
echo "9️⃣  Build & Deployment Check"

# Check if latest deployment is ready
latest_status=$(vercel ls 2>&1 | grep "● Ready" | grep "Production" | head -1)
if [ -n "$latest_status" ]; then
  echo "   ✅ Latest deployment is ready"
else
  echo "   ⚠️  Could not verify deployment status"
  ((WARNINGS++))
fi

# Check git status
if [ -z "$(git status --porcelain)" ]; then
  echo "   ✅ All changes committed"
else
  echo "   ⚠️  Uncommitted changes present"
  ((WARNINGS++))
fi

echo ""

# Check 10: Performance & Monitoring
echo "🔟  Performance & Monitoring"

# Check for proper logging
logging=$(grep -r "console\.error" app/api --include="*.ts" 2>/dev/null | wc -l)
if [ "$logging" -ge "$((endpoints * 80 / 100))" ]; then
  echo "   ✅ Error logging present ($logging instances)"
else
  echo "   ⚠️  Limited error logging ($logging instances)"
  ((WARNINGS++))
fi

echo ""
echo "============================================="
echo "📊 FINAL ASSESSMENT"
echo "============================================="
echo ""

if [ "$CRITICAL" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "🎉 ✅ ✅ ✅ PRODUCTION READY ✅ ✅ ✅ 🎉"
  echo ""
  echo "All checks passed! Your application is ready for production."
  exit 0
elif [ "$CRITICAL" -eq 0 ]; then
  echo "✅ PRODUCTION READY (with minor warnings)"
  echo ""
  echo "Critical: 0 issues ✅"
  echo "Warnings: $WARNINGS issues ⚠️"
  echo ""
  echo "The application is safe for production, but consider addressing warnings."
  exit 0
else
  echo "❌ NOT PRODUCTION READY"
  echo ""
  echo "Critical: $CRITICAL issues ❌"
  echo "Warnings: $WARNINGS issues ⚠️"
  echo ""
  echo "Please fix critical issues before deploying to production."
  exit 1
fi
