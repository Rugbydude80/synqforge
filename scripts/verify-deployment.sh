#!/bin/bash
# Deployment Verification Script
# Checks environment, build, and deployment readiness

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Deployment Verification Checklist"
echo "===================================="
echo ""

# Track failures
failures=0

# Check function
check_step() {
  local name="$1"
  local command="$2"
  
  echo -n "Checking: $name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((failures++))
  fi
}

# Check file exists
check_file() {
  local name="$1"
  local file="$2"
  
  echo -n "Checking: $name... "
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Missing: $file"
    ((failures++))
  fi
}

echo "=== Environment Checks ==="
echo ""

# Check required environment variables
check_env() {
  local var="$1"
  echo -n "Env var: $var... "
  
  if [ -n "${!var}" ]; then
    echo -e "${GREEN}✅ SET${NC}"
  else
    echo -e "${RED}❌ MISSING${NC}"
    ((failures++))
  fi
}

check_env "DATABASE_URL"
check_env "NEXTAUTH_SECRET"
check_env "STRIPE_SECRET_KEY"
check_env "STRIPE_WEBHOOK_SECRET"

echo ""
echo "=== CLI Tools ==="
echo ""

check_step "Node.js installed" "node --version"
check_step "npm installed" "npm --version"
check_step "Vercel CLI installed" "vercel --version"
check_step "Stripe CLI installed" "stripe --version"

echo ""
echo "=== Project Files ==="
echo ""

check_file "Middleware" "middleware.ts"
check_file "Edge Guard" "lib/middleware/subscription-guard-edge.ts"
check_file "Subscription Guard" "lib/middleware/subscription-guard.ts"
check_file "Stripe Webhook Handler" "app/api/webhooks/stripe/route.ts"

echo ""
echo "=== Build Checks ==="
echo ""

echo -n "TypeScript compilation... "
if npm run typecheck > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
  ((failures++))
fi

echo -n "Linting... "
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${YELLOW}⚠️  WARNINGS${NC}"
fi

echo -n "Production build... "
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
  ((failures++))
fi

echo ""
echo "=== Database Connection ==="
echo ""

echo -n "Neon database reachable... "
if npx tsx -e "import { db } from './lib/db'; await db.execute('SELECT 1'); console.log('OK')" 2>&1 | grep -q "OK"; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
  ((failures++))
fi

echo ""
echo "=== Stripe Connection ==="
echo ""

echo -n "Stripe API accessible... "
if stripe products list --limit 1 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Run: stripe login"
  ((failures++))
fi

echo ""
echo "=== Git Status ==="
echo ""

echo "Uncommitted changes:"
if git diff --quiet && git diff --cached --quiet; then
  echo -e "${GREEN}✅ Working tree clean${NC}"
else
  echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
  git status -s
fi

echo ""
echo "=================================="

if [ $failures -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Ready to deploy:"
  echo "  vercel --prod"
  echo ""
  echo "Or canary deploy (10%):"
  echo "  vercel --prod --percent=10"
  exit 0
else
  echo -e "${RED}❌ $failures check(s) failed${NC}"
  echo ""
  echo "Fix issues above before deploying."
  exit 1
fi

