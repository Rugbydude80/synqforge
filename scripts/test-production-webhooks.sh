#!/bin/bash
# Test Stripe Webhooks in Production via Stripe CLI
# This script tests webhooks against production Vercel deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROD_URL="${PROD_URL:-https://synqforge.com}"
WEBHOOK_ENDPOINT="${PROD_URL}/api/webhooks/stripe"

echo -e "${CYAN}🧪 Stripe Webhook Production Testing${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Production URL:${NC} ${PROD_URL}"
echo -e "${BLUE}Webhook Endpoint:${NC} ${WEBHOOK_ENDPOINT}"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo -e "${RED}❌ Stripe CLI not found${NC}"
  echo ""
  echo "Install with:"
  echo "  macOS: brew install stripe/stripe-cli/stripe"
  echo "  Linux: https://github.com/stripe/stripe-cli/releases"
  echo "  Windows: https://github.com/stripe/stripe-cli/releases"
  exit 1
fi

echo -e "${GREEN}✅ Stripe CLI detected${NC}"

# Check if logged in
if ! stripe config --list &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not logged in to Stripe CLI${NC}"
  echo ""
  echo "Please run: ${CYAN}stripe login${NC}"
  exit 1
fi

# Get current Stripe account info
STRIPE_ACCOUNT=$(stripe config --list | grep "test_mode_api_key" | head -1 | awk '{print $3}' | cut -d'_' -f3 || echo "unknown")
echo -e "${GREEN}✅ Stripe CLI authenticated${NC} (Account: ${STRIPE_ACCOUNT})"
echo ""

# Check if production webhook endpoint is accessible
echo -e "${BLUE}Checking webhook endpoint accessibility...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${WEBHOOK_ENDPOINT}" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ Webhook endpoint is accessible (HTTP ${HTTP_CODE} - expected for missing signature)${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
  echo -e "${RED}❌ Cannot reach webhook endpoint${NC}"
  echo "   Check: ${WEBHOOK_ENDPOINT}"
  exit 1
else
  echo -e "${YELLOW}⚠️  Unexpected response: HTTP ${HTTP_CODE}${NC}"
fi
echo ""

# Function to test webhook event
test_webhook_event() {
  local event_type="$1"
  local description="$2"
  local expected_status="${3:-200}"
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📤 Testing: ${description}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Event Type: ${CYAN}${event_type}${NC}"
  echo "Target: ${CYAN}${WEBHOOK_ENDPOINT}${NC}"
  echo ""
  
  echo -e "${YELLOW}Triggering event via Stripe CLI...${NC}"
  
  # Trigger the event
  if stripe trigger "${event_type}" > /tmp/stripe_webhook_test.log 2>&1; then
    echo -e "${GREEN}✅ Event triggered successfully${NC}"
    echo ""
    echo "Event details:"
    cat /tmp/stripe_webhook_test.log | grep -E "(Trigger|succeeded|event ID)" || echo "  (Check Stripe Dashboard for details)"
  else
    echo -e "${RED}❌ Failed to trigger event${NC}"
    cat /tmp/stripe_webhook_test.log
    return 1
  fi
  
  echo ""
  echo -e "${YELLOW}⏳ Waiting 3 seconds for webhook processing...${NC}"
  sleep 3
  
  echo ""
  echo -e "${BLUE}📋 Next Steps:${NC}"
  echo "  1. Check Vercel logs: https://vercel.com/dashboard"
  echo "  2. Check Stripe Dashboard: https://dashboard.stripe.com/webhooks"
  echo "  3. Verify database updates (if applicable)"
  echo ""
  
  read -p "Press Enter to continue to next test..."
  echo ""
}

# Function to forward live webhooks
forward_live_webhooks() {
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🔄 Forwarding Live Webhooks to Production${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "This will forward ALL live webhook events from Stripe to your production endpoint."
  echo ""
  echo -e "${YELLOW}⚠️  WARNING:${NC} This forwards REAL webhook events!"
  echo ""
  read -p "Continue? (y/N): " confirm
  
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    return
  fi
  
  echo ""
  echo -e "${BLUE}Starting webhook forwarding...${NC}"
  echo "Target: ${CYAN}${WEBHOOK_ENDPOINT}${NC}"
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop forwarding${NC}"
  echo ""
  
  stripe listen --forward-to "${WEBHOOK_ENDPOINT}"
}

# Function to test with test mode
test_with_test_mode() {
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🧪 Testing with Stripe Test Mode${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "This will trigger test events that will be sent to your production endpoint."
  echo ""
  
  # Critical events
  test_webhook_event "customer.subscription.created" "Subscription Created (Critical)" 
  test_webhook_event "customer.subscription.updated" "Subscription Updated (Critical)"
  test_webhook_event "customer.subscription.deleted" "Subscription Cancelled (Critical)"
  
  # Payment events
  test_webhook_event "invoice.payment_succeeded" "Payment Succeeded (High Priority)"
  test_webhook_event "invoice.payment_failed" "Payment Failed (High Priority)"
  
  # Checkout events
  test_webhook_event "checkout.session.completed" "Checkout Completed (High Priority)"
  
  echo ""
  echo -e "${GREEN}✅ Test mode webhook testing complete!${NC}"
  echo ""
}

# Main menu
show_menu() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Select Testing Mode:${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  1) Test Individual Events (Recommended)"
  echo "  2) Forward Live Webhooks (Real Events)"
  echo "  3) Test All Critical Events"
  echo "  4) Check Webhook Secret Configuration"
  echo "  5) View Recent Webhook Events"
  echo "  6) Exit"
  echo ""
  read -p "Select option (1-6): " option
  
  case $option in
    1)
      echo ""
      echo "Available events:"
      echo "  a) customer.subscription.created"
      echo "  b) customer.subscription.updated"
      echo "  c) customer.subscription.deleted"
      echo "  d) invoice.payment_succeeded"
      echo "  e) invoice.payment_failed"
      echo "  f) checkout.session.completed"
      echo ""
      read -p "Select event (a-f): " event_choice
      
      case $event_choice in
        a) test_webhook_event "customer.subscription.created" "Subscription Created" ;;
        b) test_webhook_event "customer.subscription.updated" "Subscription Updated" ;;
        c) test_webhook_event "customer.subscription.deleted" "Subscription Cancelled" ;;
        d) test_webhook_event "invoice.payment_succeeded" "Payment Succeeded" ;;
        e) test_webhook_event "invoice.payment_failed" "Payment Failed" ;;
        f) test_webhook_event "checkout.session.completed" "Checkout Completed" ;;
        *) echo "Invalid option" ;;
      esac
      ;;
    2)
      forward_live_webhooks
      ;;
    3)
      test_with_test_mode
      ;;
    4)
      echo ""
      echo -e "${BLUE}Webhook Secret Configuration${NC}"
      echo ""
      echo "Your webhook secret should be configured in Vercel:"
      echo ""
      echo "  1. Go to: https://vercel.com/dashboard"
      echo "  2. Select your project"
      echo "  3. Go to Settings → Environment Variables"
      echo "  4. Ensure STRIPE_WEBHOOK_SECRET is set"
      echo ""
      echo "To get your webhook secret from Stripe:"
      echo ""
      echo "  1. Go to: https://dashboard.stripe.com/webhooks"
      echo "  2. Click on your webhook endpoint"
      echo "  3. Click 'Reveal' next to 'Signing secret'"
      echo "  4. Copy the value (starts with 'whsec_')"
      echo ""
      echo "To test webhook forwarding locally:"
      echo "  ${CYAN}stripe listen --forward-to ${WEBHOOK_ENDPOINT}${NC}"
      echo ""
      echo "The CLI will show you a signing secret - use this for local testing."
      echo ""
      ;;
    5)
      echo ""
      echo -e "${BLUE}Recent Webhook Events${NC}"
      echo ""
      stripe events list --limit 10
      echo ""
      ;;
    6)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
  
  show_menu
}

# Pre-flight checks
echo -e "${BLUE}Pre-flight Checks:${NC}"
echo ""

# Check if webhook secret is needed for local testing
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  echo -e "${YELLOW}⚠️  STRIPE_WEBHOOK_SECRET not set in environment${NC}"
  echo "   (Not needed for Stripe CLI forwarding, but required for direct testing)"
else
  echo -e "${GREEN}✅ STRIPE_WEBHOOK_SECRET configured${NC}"
fi
echo ""

# Show menu
show_menu

