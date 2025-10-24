#!/bin/bash

###############################################################################
# Update Stripe Product Metadata - Story Update Limits
#
# Adds story_update_limit metadata to all Stripe products based on tier
#
# Usage:
#   ./scripts/update-stripe-metadata.sh [test|live]
#
# Requirements:
#   - Stripe CLI installed (stripe login)
#   - STRIPE_SECRET_KEY environment variable set
###############################################################################

set -euo pipefail

# Configuration
MODE="${1:-test}"

if [ "$MODE" != "test" ] && [ "$MODE" != "live" ]; then
  echo "Error: Mode must be 'test' or 'live'"
  echo "Usage: ./scripts/update-stripe-metadata.sh [test|live]"
  exit 1
fi

echo "================================================"
echo "Updating Stripe Product Metadata ($MODE mode)"
echo "================================================"
echo

# Check for Stripe CLI
if ! command -v stripe &> /dev/null; then
  echo "Error: Stripe CLI not found. Please install from https://stripe.com/docs/stripe-cli"
  exit 1
fi

# Set API key based on mode
if [ "$MODE" == "live" ]; then
  if [ -z "${STRIPE_SECRET_KEY_LIVE:-}" ]; then
    echo "Error: STRIPE_SECRET_KEY_LIVE environment variable not set"
    exit 1
  fi
  export STRIPE_API_KEY="$STRIPE_SECRET_KEY_LIVE"
  echo "Using LIVE mode - changes will affect production!"
  read -p "Continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
else
  if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
    echo "Error: STRIPE_SECRET_KEY environment variable not set"
    exit 1
  fi
  export STRIPE_API_KEY="$STRIPE_SECRET_KEY"
  echo "Using TEST mode"
fi

echo

###############################################################################
# Update Product Metadata
###############################################################################

update_product_metadata() {
  local product_id=$1
  local tier=$2
  local update_limit=$3

  echo "Updating product: $product_id ($tier)"
  echo "  - story_update_limit: $update_limit"

  stripe products update "$product_id" \
    --metadata story_update_limit="$update_limit" \
    --metadata tier="$tier" \
    > /dev/null 2>&1

  echo "  ✓ Updated successfully"
  echo
}

###############################################################################
# Find products by tier (assumes tier is in product metadata)
###############################################################################

echo "Fetching existing products..."
echo

# Note: You'll need to replace these product IDs with your actual Stripe product IDs
# You can find them by running: stripe products list

# Free/Starter Tier
if [ "$MODE" == "test" ]; then
  STARTER_PRODUCT_ID="${STRIPE_STARTER_PRODUCT_ID_TEST:-prod_starter_test}"
else
  STARTER_PRODUCT_ID="${STRIPE_STARTER_PRODUCT_ID_LIVE:-prod_starter_live}"
fi

# Pro Tier
if [ "$MODE" == "test" ]; then
  PRO_PRODUCT_ID="${STRIPE_PRO_PRODUCT_ID_TEST:-prod_pro_test}"
else
  PRO_PRODUCT_ID="${STRIPE_PRO_PRODUCT_ID_LIVE:-prod_pro_live}"
fi

# Team Tier
if [ "$MODE" == "test" ]; then
  TEAM_PRODUCT_ID="${STRIPE_TEAM_PRODUCT_ID_TEST:-prod_team_test}"
else
  TEAM_PRODUCT_ID="${STRIPE_TEAM_PRODUCT_ID_LIVE:-prod_team_live}"
fi

# Enterprise Tier
if [ "$MODE" == "test" ]; then
  ENTERPRISE_PRODUCT_ID="${STRIPE_ENTERPRISE_PRODUCT_ID_TEST:-prod_enterprise_test}"
else
  ENTERPRISE_PRODUCT_ID="${STRIPE_ENTERPRISE_PRODUCT_ID_LIVE:-prod_enterprise_live}"
fi

###############################################################################
# Update each product
###############################################################################

echo "Updating product metadata..."
echo

# Starter/Free: 5 updates/month
if [ -n "$STARTER_PRODUCT_ID" ]; then
  update_product_metadata "$STARTER_PRODUCT_ID" "starter" "5"
fi

# Pro: 1000 updates/month
if [ -n "$PRO_PRODUCT_ID" ]; then
  update_product_metadata "$PRO_PRODUCT_ID" "pro" "1000"
fi

# Team: unlimited (represented as -1)
if [ -n "$TEAM_PRODUCT_ID" ]; then
  update_product_metadata "$TEAM_PRODUCT_ID" "team" "-1"
fi

# Enterprise: unlimited (represented as -1)
if [ -n "$ENTERPRISE_PRODUCT_ID" ]; then
  update_product_metadata "$ENTERPRISE_PRODUCT_ID" "enterprise" "-1"
fi

###############################################################################
# Validation
###############################################################################

echo "================================================"
echo "Validation"
echo "================================================"
echo

echo "Verifying metadata updates..."

verify_product() {
  local product_id=$1
  local expected_limit=$2

  echo -n "  Checking $product_id... "

  local metadata=$(stripe products retrieve "$product_id" --format json 2>/dev/null | jq -r '.metadata.story_update_limit // "NOT SET"')

  if [ "$metadata" == "$expected_limit" ]; then
    echo "✓ OK (limit: $metadata)"
  else
    echo "✗ MISMATCH (expected: $expected_limit, got: $metadata)"
  fi
}

if [ -n "$STARTER_PRODUCT_ID" ]; then
  verify_product "$STARTER_PRODUCT_ID" "5"
fi

if [ -n "$PRO_PRODUCT_ID" ]; then
  verify_product "$PRO_PRODUCT_ID" "1000"
fi

if [ -n "$TEAM_PRODUCT_ID" ]; then
  verify_product "$TEAM_PRODUCT_ID" "-1"
fi

if [ -n "$ENTERPRISE_PRODUCT_ID" ]; then
  verify_product "$ENTERPRISE_PRODUCT_ID" "-1"
fi

echo
echo "================================================"
echo "Metadata update complete!"
echo "================================================"
echo

echo "Summary of story update limits:"
echo "  - Starter/Free: 5 updates/month"
echo "  - Pro: 1,000 updates/month"
echo "  - Team: Unlimited"
echo "  - Enterprise: Unlimited"
echo

echo "Next steps:"
echo "  1. Verify metadata in Stripe Dashboard"
echo "  2. Test entitlement checks in your application"
echo "  3. Deploy updated application code"
echo

exit 0
