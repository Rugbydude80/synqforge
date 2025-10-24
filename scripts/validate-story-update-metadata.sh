#!/bin/bash

###############################################################################
# Validate Story Update Metadata in Stripe
#
# Checks that all products have correct story_update_limit metadata
#
# Usage:
#   ./scripts/validate-story-update-metadata.sh [test|live]
###############################################################################

set -euo pipefail

MODE="${1:-test}"

if [ "$MODE" != "test" ] && [ "$MODE" != "live" ]; then
  echo "Error: Mode must be 'test' or 'live'"
  exit 1
fi

echo "================================================"
echo "Validating Stripe Story Update Metadata"
echo "Mode: $MODE"
echo "================================================"
echo

# Check for required tools
if ! command -v stripe &> /dev/null; then
  echo "❌ Stripe CLI not found"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ jq not found (required for JSON parsing)"
  exit 1
fi

# Set API key
if [ "$MODE" == "live" ]; then
  export STRIPE_API_KEY="${STRIPE_SECRET_KEY_LIVE:-}"
else
  export STRIPE_API_KEY="${STRIPE_SECRET_KEY:-}"
fi

if [ -z "$STRIPE_API_KEY" ]; then
  echo "❌ Stripe API key not set"
  exit 1
fi

echo "✓ Prerequisites OK"
echo

###############################################################################
# Validation Functions
###############################################################################

VALIDATION_ERRORS=0

validate_product() {
  local product_id=$1
  local expected_tier=$2
  local expected_limit=$3
  local tier_name=$4

  echo "Validating $tier_name ($product_id)..."

  # Fetch product
  local product_json=$(stripe products retrieve "$product_id" --format json 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "  ❌ Product not found: $product_id"
    ((VALIDATION_ERRORS++))
    echo
    return
  fi

  # Extract metadata
  local tier=$(echo "$product_json" | jq -r '.metadata.tier // "NOT SET"')
  local update_limit=$(echo "$product_json" | jq -r '.metadata.story_update_limit // "NOT SET"')
  local product_name=$(echo "$product_json" | jq -r '.name')

  echo "  Product name: $product_name"
  echo "  Tier metadata: $tier"
  echo "  Update limit: $update_limit"

  # Validate tier
  if [ "$tier" != "$expected_tier" ]; then
    echo "  ❌ Tier mismatch (expected: $expected_tier, got: $tier)"
    ((VALIDATION_ERRORS++))
  else
    echo "  ✓ Tier correct"
  fi

  # Validate update limit
  if [ "$update_limit" != "$expected_limit" ]; then
    echo "  ❌ Update limit mismatch (expected: $expected_limit, got: $update_limit)"
    ((VALIDATION_ERRORS++))
  else
    echo "  ✓ Update limit correct"
  fi

  echo
}

###############################################################################
# Validate All Products
###############################################################################

echo "Fetching product IDs from environment..."
echo

# Get product IDs from environment
if [ "$MODE" == "test" ]; then
  STARTER_ID="${STRIPE_STARTER_PRODUCT_ID_TEST:-}"
  PRO_ID="${STRIPE_PRO_PRODUCT_ID_TEST:-}"
  TEAM_ID="${STRIPE_TEAM_PRODUCT_ID_TEST:-}"
  ENTERPRISE_ID="${STRIPE_ENTERPRISE_PRODUCT_ID_TEST:-}"
else
  STARTER_ID="${STRIPE_STARTER_PRODUCT_ID_LIVE:-}"
  PRO_ID="${STRIPE_PRO_PRODUCT_ID_LIVE:-}"
  TEAM_ID="${STRIPE_TEAM_PRODUCT_ID_LIVE:-}"
  ENTERPRISE_ID="${STRIPE_ENTERPRISE_PRODUCT_ID_LIVE:-}"
fi

# Validate each product
if [ -n "$STARTER_ID" ]; then
  validate_product "$STARTER_ID" "starter" "5" "Starter/Free"
else
  echo "⚠️  Starter product ID not set in environment"
  echo
fi

if [ -n "$PRO_ID" ]; then
  validate_product "$PRO_ID" "pro" "1000" "Pro"
else
  echo "⚠️  Pro product ID not set in environment"
  echo
fi

if [ -n "$TEAM_ID" ]; then
  validate_product "$TEAM_ID" "team" "-1" "Team"
else
  echo "⚠️  Team product ID not set in environment"
  echo
fi

if [ -n "$ENTERPRISE_ID" ]; then
  validate_product "$ENTERPRISE_ID" "enterprise" "-1" "Enterprise"
else
  echo "⚠️  Enterprise product ID not set in environment"
  echo
fi

###############################################################################
# Additional Checks
###############################################################################

echo "================================================"
echo "Additional Checks"
echo "================================================"
echo

echo "Checking for orphaned products with tier metadata..."
all_products=$(stripe products list --limit 100 --format json 2>/dev/null | jq -r '.data[] | select(.metadata.tier != null) | .id + " (" + .metadata.tier + ")"')

if [ -n "$all_products" ]; then
  echo "$all_products"
else
  echo "  No products with tier metadata found"
fi

echo

###############################################################################
# Summary
###############################################################################

echo "================================================"
echo "Validation Summary"
echo "================================================"
echo

if [ $VALIDATION_ERRORS -eq 0 ]; then
  echo "✅ All validations passed!"
  echo
  echo "Story update limits:"
  echo "  - Starter/Free: 5 updates/month"
  echo "  - Pro: 1,000 updates/month"
  echo "  - Team: Unlimited (-1)"
  echo "  - Enterprise: Unlimited (-1)"
  echo
  exit 0
else
  echo "❌ Validation failed with $VALIDATION_ERRORS error(s)"
  echo
  echo "Please run: ./scripts/update-stripe-metadata.sh $MODE"
  echo
  exit 1
fi
