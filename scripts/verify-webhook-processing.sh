#!/bin/bash
# Verify Stripe Webhook Processing
# Checks database to verify webhooks were processed correctly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔍 Verifying Stripe Webhook Processing${NC}"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not set${NC}"
  echo ""
  echo "Set it with:"
  echo "  export DATABASE_URL='postgresql://...'"
  echo ""
  echo "Or get it from Vercel:"
  echo "  vercel env pull .env.local"
  exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo -e "${YELLOW}⚠️  psql not found. Using alternative method...${NC}"
  USE_PSQL=false
else
  USE_PSQL=true
fi

# Function to run SQL query
run_query() {
  local query="$1"
  local description="$2"
  
  echo -e "${BLUE}${description}${NC}"
  
  if [ "$USE_PSQL" = true ]; then
    psql "$DATABASE_URL" -t -A -F"," -c "$query" 2>/dev/null || echo "Query failed"
  else
    echo "  (Install psql to run this query)"
    echo "  Query: $query"
  fi
  echo ""
}

# Recent subscription updates
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Recent Subscription Updates (Last 10)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_query "
SELECT 
  name,
  subscription_tier,
  subscription_status,
  stripe_subscription_id,
  updated_at
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
" "Recent subscriptions:"

# Subscription status breakdown
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Subscription Status Breakdown${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_query "
SELECT 
  subscription_status,
  COUNT(*) as count
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
GROUP BY subscription_status
ORDER BY count DESC;
" "Status breakdown:"

# Active subscriptions
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Active Subscriptions${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_query "
SELECT COUNT(*) as active_count
FROM organizations
WHERE subscription_status = 'active';
" "Active subscriptions:"

# Recent updates (last hour)
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Webhook Activity (Last Hour)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_query "
SELECT 
  COUNT(*) as recent_updates,
  MAX(updated_at) as last_update
FROM organizations
WHERE updated_at > NOW() - INTERVAL '1 hour'
AND stripe_subscription_id IS NOT NULL;
" "Recent activity:"

# Subscription tier distribution
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Subscription Tier Distribution${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_query "
SELECT 
  subscription_tier,
  COUNT(*) as count
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
GROUP BY subscription_tier
ORDER BY count DESC;
" "Tier distribution:"

# Check for potential issues
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Potential Issues${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_query "
SELECT 
  COUNT(*) as subscriptions_without_customer_id
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
AND stripe_customer_id IS NULL;
" "Subscriptions without customer ID:"

run_query "
SELECT 
  COUNT(*) as subscriptions_without_price_id
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
AND stripe_price_id IS NULL;
" "Subscriptions without price ID:"

echo ""
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Check Vercel logs for webhook processing"
echo "  2. Check Stripe Dashboard for webhook deliveries"
echo "  3. Verify specific organization if needed"
echo ""

