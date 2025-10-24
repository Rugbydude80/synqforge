#!/bin/bash

# SynqForge Stripe Product Sync Script
# Usage: ./scripts/stripe_sync.sh [test|live]
# Creates/updates Stripe products and prices from config/products.json

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
  echo "⚠️  WARNING: Running in LIVE mode. This will affect production!"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
  STRIPE_FLAGS=""
else
  echo "🧪 Running in TEST mode"
  STRIPE_FLAGS="--test"
fi

echo "📦 Syncing products from $CONFIG_FILE..."
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo "❌ Error: Stripe CLI not found. Install from https://stripe.com/docs/stripe-cli"
  exit 1
fi

# Parse JSON and create products
# Note: This requires jq for JSON parsing
if ! command -v jq &> /dev/null; then
  echo "❌ Error: jq not found. Install with: brew install jq"
  exit 1
fi

# Function to create or update product
create_or_update_product() {
  local product_id=$1
  local name=$2
  local description=$3
  local metadata_json=$4
  
  echo "Processing product: $name ($product_id)"
  
  # Check if product exists
  existing=$(stripe $STRIPE_FLAGS products list --limit 100 | jq -r ".data[] | select(.id == \"$product_id\") | .id" || echo "")
  
  if [ -n "$existing" ]; then
    echo "  ✓ Product exists, updating..."
    stripe $STRIPE_FLAGS products update "$product_id" \
      --name="$name" \
      --description="$description" \
      --metadata="$metadata_json" \
      --active=true
  else
    echo "  + Creating new product..."
    stripe $STRIPE_FLAGS products create \
      --id="$product_id" \
      --name="$name" \
      --description="$description" \
      --metadata="$metadata_json"
  fi
}

# Function to create or update price
create_or_update_price() {
  local price_id=$1
  local product_id=$2
  local unit_amount=$3
  local currency=$4
  local recurring_interval=${5:-}
  
  echo "  Processing price: $price_id"
  
  # Check if price exists
  existing_price=$(stripe $STRIPE_FLAGS prices list --limit 100 | jq -r ".data[] | select(.id == \"$price_id\") | .id" || echo "")
  
  if [ -n "$existing_price" ]; then
    echo "    ✓ Price exists, ensuring active..."
    stripe $STRIPE_FLAGS prices update "$price_id" --active=true
  else
    echo "    + Creating new price..."
    if [ -n "$recurring_interval" ]; then
      stripe $STRIPE_FLAGS prices create \
        --id="$price_id" \
        --product="$product_id" \
        --unit-amount="$unit_amount" \
        --currency="$currency" \
        --recurring-interval="$recurring_interval"
    else
      stripe $STRIPE_FLAGS prices create \
        --id="$price_id" \
        --product="$product_id" \
        --unit-amount="$unit_amount" \
        --currency="$currency"
    fi
  fi
}

echo "=== TIER PRODUCTS ==="
echo ""

# Process tier products
jq -c '.tiers[]' "$CONFIG_FILE" | while read -r tier; do
  product_id=$(echo "$tier" | jq -r '.id')
  name=$(echo "$tier" | jq -r '.name')
  description=$(echo "$tier" | jq -r '.description')
  metadata=$(echo "$tier" | jq -c '.metadata')
  
  # Convert metadata JSON object to key=value format for Stripe CLI
  metadata_str=$(echo "$metadata" | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')
  
  create_or_update_product "$product_id" "$name" "$description" "$metadata_str"
  
  # Process prices for this product
  echo "$tier" | jq -c '.prices[]?' | while read -r price; do
    if [ -n "$price" ]; then
      price_id=$(echo "$price" | jq -r '.id')
      unit_amount=$(echo "$price" | jq -r '.unit_amount')
      currency=$(echo "$price" | jq -r '.currency')
      recurring_interval=$(echo "$price" | jq -r '.recurring.interval // empty')
      
      create_or_update_price "$price_id" "$product_id" "$unit_amount" "$currency" "$recurring_interval"
    fi
  done
  
  echo ""
done

echo "=== ADD-ON PRODUCTS ==="
echo ""

# Process add-on products
jq -c '.addons[]' "$CONFIG_FILE" | while read -r addon; do
  product_id=$(echo "$addon" | jq -r '.id')
  name=$(echo "$addon" | jq -r '.name')
  description=$(echo "$addon" | jq -r '.description')
  metadata=$(echo "$addon" | jq -c '.metadata')
  
  # Convert metadata JSON object to key=value format for Stripe CLI
  metadata_str=$(echo "$metadata" | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')
  
  create_or_update_product "$product_id" "$name" "$description" "$metadata_str"
  
  # Process prices for this add-on
  echo "$addon" | jq -c '.prices[]?' | while read -r price; do
    if [ -n "$price" ]; then
      price_id=$(echo "$price" | jq -r '.id')
      unit_amount=$(echo "$price" | jq -r '.unit_amount')
      currency=$(echo "$price" | jq -r '.currency')
      recurring_interval=$(echo "$price" | jq -r '.recurring.interval // empty')
      
      create_or_update_price "$price_id" "$product_id" "$unit_amount" "$currency" "$recurring_interval"
    fi
  done
  
  echo ""
done

echo "✅ Product sync complete!"
echo ""
echo "Summary:"
echo "  - 4 tier products (Starter, Pro, Team, Enterprise)"
echo "  - 3 add-on products (AI Actions Pack, AI Booster, Priority Support)"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/validation.sh $MODE to verify"
echo "  2. Configure webhooks for checkout.session.completed"
echo "  3. Deploy backend services with add-on support"

