#!/bin/bash
# 🚀 LAUNCH DAY EXECUTION SCRIPT
# Automates the pre-deployment checks and post-deployment smoke tests
# Run: ./scripts/launch-day-checklist.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Track phase status
PHASE1_PASS=true
PHASE2_PASS=true
PHASE3_PASS=true

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🚀 SynqForge Launch Day Checklist${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Started at: $(date)"
echo ""

#==============================================================================
# PHASE 1: PRE-DEPLOYMENT CHECKS (Est. 30 minutes)
#==============================================================================

echo -e "${BOLD}${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${BOLD}${BLUE}┃  PHASE 1: PRE-DEPLOYMENT CHECKS (Est. 30 min)     ┃${NC}"
echo -e "${BOLD}${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo ""

# 1.1 Environment Variables Check
echo -e "${BOLD}1.1 Verifying Production Environment Variables${NC}"
echo "=================================================="

required_vars=(
  "DATABASE_URL"
  "OPENROUTER_API_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "SENTRY_DSN"
  "UPSTASH_REDIS_REST_TOKEN"
  "UPSTASH_REDIS_REST_URL"
)

echo ""
echo "Checking Vercel production environment..."
if ! command -v vercel &> /dev/null; then
  echo -e "${RED}❌ Vercel CLI not installed${NC}"
  echo "   Install: npm i -g vercel"
  PHASE1_PASS=false
else
  echo -e "${GREEN}✅ Vercel CLI installed${NC}"
  
  echo ""
  echo "Production environment variables:"
  vercel env ls production 2>/dev/null | grep -E "$(IFS=\|; echo "${required_vars[*]}")" || echo "Unable to list env vars (may need: vercel login)"
  
  echo ""
  read -p "Do all required environment variables exist in production? (y/n): " env_check
  if [[ ! "$env_check" =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Missing environment variables${NC}"
    echo "   Run: vercel env add <VAR_NAME> production"
    PHASE1_PASS=false
  else
    echo -e "${GREEN}✅ All environment variables configured${NC}"
  fi
fi

echo ""
echo ""

# 1.2 Local Build Test
echo -e "${BOLD}1.2 Local Build Test${NC}"
echo "===================="
echo ""

echo "Running TypeScript compilation..."
if npm run typecheck 2>&1 | tail -5; then
  echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
  echo -e "${RED}❌ TypeScript errors found${NC}"
  PHASE1_PASS=false
fi

echo ""
echo "Running production build..."
if npm run build 2>&1 | tail -10; then
  echo -e "${GREEN}✅ Production build successful${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  PHASE1_PASS=false
fi

echo ""
echo ""

# 1.3 Database Connection Test
echo -e "${BOLD}1.3 Database Connection Test${NC}"
echo "============================"
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  DATABASE_URL not set locally. Testing production database...${NC}"
  read -p "Enter production DATABASE_URL (or press Enter to skip): " DATABASE_URL
fi

if [ -n "$DATABASE_URL" ]; then
  echo "Testing connection to Neon PostgreSQL..."
  if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    
    # Check critical tables
    echo ""
    echo "Verifying critical tables exist..."
    tables=("organizations" "workspace_usage" "stripe_webhook_logs" "users")
    for table in "${tables[@]}"; do
      if psql "$DATABASE_URL" -t -c "SELECT to_regclass('$table')" | grep -q "$table"; then
        echo -e "  ${GREEN}✅${NC} $table"
      else
        echo -e "  ${RED}❌${NC} $table"
        PHASE1_PASS=false
      fi
    done
  else
    echo -e "${RED}❌ Database connection failed${NC}"
    PHASE1_PASS=false
  fi
else
  echo -e "${YELLOW}⚠️  Skipping database check${NC}"
fi

echo ""
echo ""

# 1.4 Stripe Webhook Verification
echo -e "${BOLD}1.4 Stripe Webhook Verification${NC}"
echo "================================"
echo ""

echo "Checking Stripe CLI authentication..."
if command -v stripe &> /dev/null && stripe config --list &> /dev/null; then
  echo -e "${GREEN}✅ Stripe CLI authenticated${NC}"
  
  echo ""
  echo "Fetching webhook endpoints..."
  echo ""
  stripe webhooks list --limit 5 2>/dev/null || echo "Unable to list webhooks"
  
  echo ""
  read -p "Does webhook exist for https://synqforge.com/api/webhooks/stripe? (y/n): " webhook_check
  if [[ ! "$webhook_check" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Webhook not configured${NC}"
    echo "   Create at: https://dashboard.stripe.com/webhooks"
    echo "   Endpoint: https://synqforge.com/api/webhooks/stripe"
    echo "   Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, checkout.session.completed"
    PHASE1_PASS=false
  else
    echo -e "${GREEN}✅ Stripe webhook configured${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Stripe CLI not configured (run: stripe login)${NC}"
fi

echo ""
echo ""

# Phase 1 Summary
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$PHASE1_PASS" = true ]; then
  echo -e "${BOLD}${GREEN}✅ PHASE 1: ALL CHECKS PASSED${NC}"
  echo ""
  read -p "Continue to deployment? (y/n): " continue_deploy
  if [[ ! "$continue_deploy" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Deployment cancelled by user${NC}"
    exit 0
  fi
else
  echo -e "${BOLD}${RED}❌ PHASE 1: SOME CHECKS FAILED${NC}"
  echo ""
  echo "Fix the issues above before deploying."
  exit 1
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo ""

#==============================================================================
# PHASE 2: DEPLOYMENT (Est. 15 minutes)
#==============================================================================

echo -e "${BOLD}${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${BOLD}${BLUE}┃  PHASE 2: DEPLOYMENT (Est. 15 min)                ┃${NC}"
echo -e "${BOLD}${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo ""

echo -e "${BOLD}2.1 Deploying to Production${NC}"
echo "============================"
echo ""

echo "Initiating deployment to Vercel production..."
echo ""
vercel --prod

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Deployment successful${NC}"
else
  echo ""
  echo -e "${RED}❌ Deployment failed${NC}"
  PHASE2_PASS=false
  exit 1
fi

echo ""
echo "Waiting 30 seconds for deployment to stabilize..."
sleep 30

echo ""
echo ""

echo -e "${BOLD}2.2 Deployment Health Check${NC}"
echo "============================"
echo ""

echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" https://synqforge.com/api/health)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"

if [ "$HEALTH_CODE" = "200" ]; then
  echo ""
  echo -e "${GREEN}✅ Health check passed (HTTP $HEALTH_CODE)${NC}"
else
  echo ""
  echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CODE)${NC}"
  PHASE2_PASS=false
fi

echo ""
echo ""

# Phase 2 Summary
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$PHASE2_PASS" = true ]; then
  echo -e "${BOLD}${GREEN}✅ PHASE 2: DEPLOYMENT SUCCESSFUL${NC}"
else
  echo -e "${BOLD}${RED}❌ PHASE 2: DEPLOYMENT ISSUES DETECTED${NC}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo ""

#==============================================================================
# PHASE 3: SMOKE TESTS (Est. 30 minutes)
#==============================================================================

echo -e "${BOLD}${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${BOLD}${BLUE}┃  PHASE 3: SMOKE TESTS (Est. 30 min)               ┃${NC}"
echo -e "${BOLD}${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo ""

echo -e "${BOLD}3.1 Authentication Flow Test${NC}"
echo "============================"
echo ""

echo "Testing unauthenticated access to dashboard..."
AUTH_RESPONSE=$(curl -s -I https://synqforge.com/dashboard | grep -i "location:")
if echo "$AUTH_RESPONSE" | grep -q "/auth/signin"; then
  echo -e "${GREEN}✅ Authentication redirect working${NC}"
else
  echo -e "${RED}❌ Authentication not redirecting properly${NC}"
  echo "   Got: $AUTH_RESPONSE"
  PHASE3_PASS=false
fi

echo ""
echo ""

echo -e "${BOLD}3.2 Manual Test Checklist${NC}"
echo "=========================="
echo ""
echo "Please complete the following manual tests:"
echo ""

echo "□ 3.2.1 User Sign Up"
echo "      • Visit: https://synqforge.com/auth/signup"
echo "      • Create test account"
echo "      • Verify email confirmation"
echo ""
read -p "   Sign up test passed? (y/n): " signup_test
[[ ! "$signup_test" =~ ^[Yy]$ ]] && PHASE3_PASS=false

echo ""
echo "□ 3.2.2 Organization Creation"
echo "      • Create new organization"
echo "      • Verify: tokens_limit = 25 (Starter tier)"
echo ""
read -p "   Organization creation test passed? (y/n): " org_test
[[ ! "$org_test" =~ ^[Yy]$ ]] && PHASE3_PASS=false

if [[ "$org_test" =~ ^[Yy]$ ]] && [ -n "$DATABASE_URL" ]; then
  echo ""
  read -p "   Enter organization ID to verify: " test_org_id
  if [ -n "$test_org_id" ]; then
    echo "   Checking database..."
    psql "$DATABASE_URL" -c "SELECT organization_id, tokens_used, tokens_limit FROM workspace_usage WHERE organization_id = '$test_org_id'" 2>/dev/null || echo "   Unable to query database"
  fi
fi

echo ""
echo "□ 3.2.3 AI Story Generation"
echo "      • Create project"
echo "      • Generate single story"
echo "      • Verify: tokens_used incremented"
echo ""
read -p "   AI generation test passed? (y/n): " ai_test
[[ ! "$ai_test" =~ ^[Yy]$ ]] && PHASE3_PASS=false

echo ""
echo "□ 3.2.4 Token Limit Enforcement"
echo "      • Exhaust token limit (generate 25 stories)"
echo "      • Attempt 26th generation"
echo "      • Expected: 402 error with upgrade prompt"
echo ""
read -p "   Limit enforcement test passed? (y/n): " limit_test
[[ ! "$limit_test" =~ ^[Yy]$ ]] && PHASE3_PASS=false

echo ""
echo "□ 3.2.5 PII Detection"
echo "      • Try prompt: 'As a user with SSN 123-45-6789, I want...'"
echo "      • Expected: 400 error with 'PII_DETECTED'"
echo ""
read -p "   PII detection test passed? (y/n): " pii_test
[[ ! "$pii_test" =~ ^[Yy]$ ]] && PHASE3_PASS=false

echo ""
echo ""

echo -e "${BOLD}3.3 Stripe Webhook Test${NC}"
echo "======================="
echo ""

echo "Testing webhook from Stripe Dashboard:"
echo "1. Visit: https://dashboard.stripe.com/webhooks"
echo "2. Click your webhook for synqforge.com"
echo "3. Click 'Send test event'"
echo "4. Select: customer.subscription.created"
echo "5. Click 'Send test webhook'"
echo ""
read -p "Webhook test completed? (y/n): " webhook_test

if [[ "$webhook_test" =~ ^[Yy]$ ]] && [ -n "$DATABASE_URL" ]; then
  echo ""
  echo "Checking webhook logs..."
  psql "$DATABASE_URL" -c "SELECT event_type, status, created_at FROM stripe_webhook_logs ORDER BY created_at DESC LIMIT 5" 2>/dev/null || echo "Unable to query webhook logs"
  echo ""
  read -p "   Webhook logged with status='success'? (y/n): " webhook_success
  [[ ! "$webhook_success" =~ ^[Yy]$ ]] && PHASE3_PASS=false
else
  PHASE3_PASS=false
fi

echo ""
echo ""

# Phase 3 Summary
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$PHASE3_PASS" = true ]; then
  echo -e "${BOLD}${GREEN}✅ PHASE 3: ALL SMOKE TESTS PASSED${NC}"
else
  echo -e "${BOLD}${YELLOW}⚠️  PHASE 3: SOME TESTS FAILED OR SKIPPED${NC}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo ""

#==============================================================================
# FINAL SUMMARY
#==============================================================================

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🎯 LAUNCH DAY SUMMARY${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$PHASE1_PASS" = true ]; then
  echo -e "Phase 1 (Pre-Deployment):  ${GREEN}✅ PASS${NC}"
else
  echo -e "Phase 1 (Pre-Deployment):  ${RED}❌ FAIL${NC}"
fi

if [ "$PHASE2_PASS" = true ]; then
  echo -e "Phase 2 (Deployment):      ${GREEN}✅ PASS${NC}"
else
  echo -e "Phase 2 (Deployment):      ${RED}❌ FAIL${NC}"
fi

if [ "$PHASE3_PASS" = true ]; then
  echo -e "Phase 3 (Smoke Tests):     ${GREEN}✅ PASS${NC}"
else
  echo -e "Phase 3 (Smoke Tests):     ${YELLOW}⚠️  PARTIAL${NC}"
fi

echo ""
echo -e "${BOLD}Completed at: $(date)${NC}"
echo ""

if [ "$PHASE1_PASS" = true ] && [ "$PHASE2_PASS" = true ] && [ "$PHASE3_PASS" = true ]; then
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${GREEN}🎉 LAUNCH SUCCESSFUL!${NC}"
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Next Steps:"
  echo "  1. Set up monitoring alerts (Phase 4)"
  echo "  2. Run daily health checks: ./scripts/daily-health-check.sh"
  echo "  3. Monitor Sentry: https://sentry.io"
  echo "  4. Monitor Vercel Analytics: https://vercel.com/dashboard/analytics"
  echo ""
  echo "Production URLs:"
  echo "  🌐 App: https://synqforge.com"
  echo "  💚 Health: https://synqforge.com/api/health"
  echo "  📊 Analytics: https://synqforge.com/dashboard"
  echo ""
else
  echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${YELLOW}⚠️  LAUNCH COMPLETED WITH WARNINGS${NC}"
  echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Review failed checks and address issues."
  echo "Monitor closely for the first 24 hours."
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

