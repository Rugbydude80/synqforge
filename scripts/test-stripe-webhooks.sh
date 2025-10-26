#!/bin/bash
# Stripe Webhook Testing Script
# Verifies webhook handlers using Stripe CLI

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🎯 Stripe Webhook Testing"
echo "========================="
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo -e "${RED}❌ Stripe CLI not found${NC}"
  echo "Install with: brew install stripe/stripe-cli/stripe"
  exit 1
fi

# Check if logged in
if ! stripe config --list &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not logged in to Stripe CLI${NC}"
  echo "Run: stripe login"
  exit 1
fi

echo -e "${GREEN}✅ Stripe CLI detected${NC}"
echo ""

# Function to test webhook
test_webhook() {
  local event="$1"
  local description="$2"
  
  echo -e "${BLUE}Testing: $description${NC}"
  echo "Event: $event"
  
  stripe trigger "$event" --api-key "$STRIPE_SECRET_KEY" 2>&1 | grep -E "(Trigger|succeeded|failed)" || true
  
  echo ""
  echo "Check logs for:"
  echo "  - Organization tier updated"
  echo "  - Subscription status changed"
  echo "  - Entitlements synced"
  echo ""
  read -p "Press Enter to continue..."
  echo ""
}

echo "=== Subscription Lifecycle Tests ==="
echo ""

test_webhook "customer.subscription.created" "New subscription created"
test_webhook "customer.subscription.updated" "Subscription plan changed"
test_webhook "invoice.payment_succeeded" "Payment succeeded"
test_webhook "invoice.payment_failed" "Payment failed"
test_webhook "customer.subscription.deleted" "Subscription canceled"

echo ""
echo "=== Checkout Tests ==="
echo ""

test_webhook "checkout.session.completed" "Checkout completed"

echo ""
echo "=== Manual Testing ==="
echo ""
echo "For full integration testing:"
echo ""
echo "1. Start webhook listener:"
echo "   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe"
echo ""
echo "2. Create test subscription:"
echo "   - Go to Stripe Dashboard → Customers"
echo "   - Create new customer"
echo "   - Add subscription"
echo ""
echo "3. Verify in database:"
echo "   SELECT subscription_tier, subscription_status, plan"
echo "   FROM organizations"
echo "   WHERE stripe_customer_id = 'cus_xxx';"
echo ""
echo "4. Test route access:"
echo "   curl http://localhost:3000/api/stories/export \\"
echo "        -H 'Cookie: session-token=xxx'"
echo ""
echo "✅ Webhook testing complete!"

