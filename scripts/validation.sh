#!/bin/bash

# SynqForge Stripe Product Validation Script
# Usage: ./scripts/validation.sh [test|live]
# Verifies that Stripe products match config/products.json

set -e

MODE="${1:-test}"
CONFIG_FILE="config/products.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: $CONFIG_FILE not found"
  exit 1
fi

if [ "$MODE" != "test" ] && [ "$MODE" != "live" ]; then
  echo "❌ Error: Mode must be 'test' or 'live'"
  echo "Usage: $0 [test|live]"
  exit 1
fi

if [ "$MODE" = "live" ]; then
  echo "🔍 Validating LIVE Stripe products"
  STRIPE_FLAGS=""
else
  echo "🔍 Validating TEST Stripe products"
  STRIPE_FLAGS="--test"
fi

# Check dependencies
if ! command -v stripe &> /dev/null; then
  echo "❌ Error: Stripe CLI not found"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ Error: jq not found"
  exit 1
fi

echo ""
echo "=== PRODUCT VALIDATION ==="
echo ""

ERRORS=0
WARNINGS=0

# Expected products
EXPECTED_TIER_PRODUCTS=("prod_starter" "prod_pro" "prod_team" "prod_enterprise")
EXPECTED_ADDON_PRODUCTS=("prod_ai_actions_pack" "prod_ai_booster_starter" "prod_priority_support")

# Fetch all products from Stripe
ALL_PRODUCTS=$(stripe $STRIPE_FLAGS products list --limit 100)

echo "Checking tier products..."
for product_id in "${EXPECTED_TIER_PRODUCTS[@]}"; do
  product=$(echo "$ALL_PRODUCTS" | jq -r ".data[] | select(.id == \"$product_id\")")
  
  if [ -z "$product" ]; then
    echo "  ❌ Missing tier product: $product_id"
    ((ERRORS++))
  else
    name=$(echo "$product" | jq -r '.name')
    active=$(echo "$product" | jq -r '.active')
    tier=$(echo "$product" | jq -r '.metadata.tier // empty')
    
    if [ "$active" != "true" ]; then
      echo "  ⚠️  Product $product_id ($name) is not active"
      ((WARNINGS++))
    else
      echo "  ✓ $product_id ($name) - tier: $tier"
    fi
    
    # Check for at least one active price
    prices=$(stripe $STRIPE_FLAGS prices list --product="$product_id" --limit 10)
    active_prices=$(echo "$prices" | jq '[.data[] | select(.active == true)] | length')
    
    if [ "$product_id" != "prod_enterprise" ] && [ "$active_prices" -eq 0 ]; then
      echo "    ⚠️  No active prices found for $product_id"
      ((WARNINGS++))
    elif [ "$product_id" != "prod_enterprise" ]; then
      echo "    ✓ $active_prices active price(s)"
    fi
  fi
done

echo ""
echo "Checking add-on products..."
for product_id in "${EXPECTED_ADDON_PRODUCTS[@]}"; do
  product=$(echo "$ALL_PRODUCTS" | jq -r ".data[] | select(.id == \"$product_id\")")
  
  if [ -z "$product" ]; then
    echo "  ❌ Missing add-on product: $product_id"
    ((ERRORS++))
  else
    name=$(echo "$product" | jq -r '.name')
    active=$(echo "$product" | jq -r '.active')
    addon_type=$(echo "$product" | jq -r '.metadata.type // empty')
    available_for=$(echo "$product" | jq -r '.metadata.availableFor // empty')
    
    if [ "$active" != "true" ]; then
      echo "  ⚠️  Add-on $product_id ($name) is not active"
      ((WARNINGS++))
    else
      echo "  ✓ $product_id ($name) - type: $addon_type, available: $available_for"
    fi
    
    # Check for at least one active price
    prices=$(stripe $STRIPE_FLAGS prices list --product="$product_id" --limit 10)
    active_prices=$(echo "$prices" | jq '[.data[] | select(.active == true)] | length')
    
    if [ "$active_prices" -eq 0 ]; then
      echo "    ⚠️  No active prices found for $product_id"
      ((WARNINGS++))
    else
      echo "    ✓ $active_prices active price(s)"
    fi
  fi
done

echo ""
echo "=== METADATA VALIDATION ==="
echo ""

# Validate metadata fields for tier products
echo "Checking tier metadata..."
for product_id in "${EXPECTED_TIER_PRODUCTS[@]}"; do
  product=$(echo "$ALL_PRODUCTS" | jq -r ".data[] | select(.id == \"$product_id\")")
  
  if [ -n "$product" ]; then
    metadata=$(echo "$product" | jq -r '.metadata')
    tier=$(echo "$metadata" | jq -r '.tier // empty')
    ai_actions=$(echo "$metadata" | jq -r '.aiActionsBase // empty')
    
    if [ -z "$tier" ]; then
      echo "  ⚠️  $product_id missing 'tier' metadata"
      ((WARNINGS++))
    fi
    
    if [ -z "$ai_actions" ]; then
      echo "  ⚠️  $product_id missing 'aiActionsBase' metadata"
      ((WARNINGS++))
    fi
  fi
done

# Validate add-on metadata
echo ""
echo "Checking add-on metadata..."
for product_id in "${EXPECTED_ADDON_PRODUCTS[@]}"; do
  product=$(echo "$ALL_PRODUCTS" | jq -r ".data[] | select(.id == \"$product_id\")")
  
  if [ -n "$product" ]; then
    metadata=$(echo "$product" | jq -r '.metadata')
    addon=$(echo "$metadata" | jq -r '.addon // empty')
    type=$(echo "$metadata" | jq -r '.type // empty')
    available_for=$(echo "$metadata" | jq -r '.availableFor // empty')
    
    if [ "$addon" != "true" ]; then
      echo "  ⚠️  $product_id missing 'addon=true' metadata"
      ((WARNINGS++))
    fi
    
    if [ -z "$type" ]; then
      echo "  ⚠️  $product_id missing 'type' metadata"
      ((WARNINGS++))
    fi
    
    if [ -z "$available_for" ]; then
      echo "  ⚠️  $product_id missing 'availableFor' metadata"
      ((WARNINGS++))
    fi
  fi
done

echo ""
echo "=== VALIDATION SUMMARY ==="
echo ""
echo "Expected products: 7 (4 tiers + 3 add-ons)"
echo "Found tier products: $(echo "$ALL_PRODUCTS" | jq '[.data[] | select(.metadata.tier != null)] | length')"
echo "Found add-on products: $(echo "$ALL_PRODUCTS" | jq '[.data[] | select(.metadata.addon == "true")] | length')"
echo ""
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "❌ Validation FAILED with $ERRORS error(s)"
  echo "Run ./scripts/stripe_sync.sh $MODE to fix"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  Validation passed with $WARNINGS warning(s)"
  exit 0
else
  echo "✅ All validations passed!"
  exit 0
fi

