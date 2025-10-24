#!/bin/bash

# SynqForge Stripe Products & Pricing Setup
# Version: 2025-10-24
# This script creates all products, prices, and add-ons in Stripe

set -e

echo "======================================"
echo "SynqForge Stripe Setup (v2025-10-24)"
echo "======================================"
echo ""

# Check if stripe CLI is available
if ! command -v stripe &> /dev/null; then
    echo "Error: Stripe CLI not found. Install from https://stripe.com/docs/stripe-cli"
    exit 1
fi

echo "Step 1: Archive old products (if they exist)"
echo "--------------------------------------"

# Set old price IDs to inactive (if you have them from previous setup)
# stripe prices update PRICE_ID --active=false

echo "Skipping archive step (manual if needed)"
echo ""

echo "Step 2: Create Products"
echo "--------------------------------------"

# Create SynqForge Free product
echo "Creating: SynqForge Free..."
PRODUCT_FREE=$(stripe products create \
  --name="SynqForge Free" \
  --description="For individuals trying SynqForge" \
  --metadata[tier]=starter \
  --metadata[version]=2025-10-24 \
  --metadata[trial_days]=7 \
  --format=json | jq -r '.id')
echo "  Product ID: $PRODUCT_FREE"

# Create SynqForge Core product
echo "Creating: SynqForge Core..."
PRODUCT_CORE=$(stripe products create \
  --name="SynqForge Core" \
  --description="For independent makers and freelancers" \
  --metadata[tier]=core \
  --metadata[aiActionsPerSeat]=400 \
  --metadata[rollover]=20 \
  --metadata[maxChildrenPerSplit]=3 \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $PRODUCT_CORE"

# Create SynqForge Pro product
echo "Creating: SynqForge Pro..."
PRODUCT_PRO=$(stripe products create \
  --name="SynqForge Pro" \
  --description="For small teams collaborating on stories" \
  --metadata[tier]=pro \
  --metadata[aiActionsPerSeat]=800 \
  --metadata[rollover]=20 \
  --metadata[sharedTemplates]=true \
  --metadata[structuredPatching]=true \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $PRODUCT_PRO"

# Create SynqForge Team product
echo "Creating: SynqForge Team..."
PRODUCT_TEAM=$(stripe products create \
  --name="SynqForge Team" \
  --description="For larger teams needing pooled AI actions" \
  --metadata[tier]=team \
  --metadata[aiActionsBase]=10000 \
  --metadata[aiActionsPerSeat]=1000 \
  --metadata[pooling]=true \
  --metadata[min_quantity]=5 \
  --metadata[approvalFlows]=true \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $PRODUCT_TEAM"

# Create SynqForge Enterprise product
echo "Creating: SynqForge Enterprise..."
PRODUCT_ENTERPRISE=$(stripe products create \
  --name="SynqForge Enterprise" \
  --description="For orgs needing compliance & SLAs" \
  --metadata[tier]=enterprise \
  --metadata[sso]=true \
  --metadata[rbac]=true \
  --metadata[budgetAllocations]=true \
  --metadata[unlimitedChildren]=true \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $PRODUCT_ENTERPRISE"

echo ""
echo "Step 3: Create Prices (Multi-currency)"
echo "--------------------------------------"

# Helper function to create price
create_price() {
  local product_id=$1
  local amount=$2
  local currency=$3
  local interval=$4
  local nickname=$5

  stripe prices create \
    --product="$product_id" \
    --unit-amount="$amount" \
    --currency="$currency" \
    --recurring[interval]="$interval" \
    --nickname="$nickname" \
    --metadata[version]=2025-10-24 \
    --format=json | jq -r '.id'
}

# SynqForge Free (£0)
echo "Creating prices for: SynqForge Free..."
PRICE_FREE_GBP_MONTH=$(create_price "$PRODUCT_FREE" 0 gbp month "Free - GBP - Monthly")
PRICE_FREE_EUR_MONTH=$(create_price "$PRODUCT_FREE" 0 eur month "Free - EUR - Monthly")
PRICE_FREE_USD_MONTH=$(create_price "$PRODUCT_FREE" 0 usd month "Free - USD - Monthly")
echo "  GBP Monthly: $PRICE_FREE_GBP_MONTH"
echo "  EUR Monthly: $PRICE_FREE_EUR_MONTH"
echo "  USD Monthly: $PRICE_FREE_USD_MONTH"

# SynqForge Core (£10.99/month, £109.90/year)
echo "Creating prices for: SynqForge Core..."
PRICE_CORE_GBP_MONTH=$(create_price "$PRODUCT_CORE" 1099 gbp month "Core - GBP - Monthly")
PRICE_CORE_GBP_YEAR=$(create_price "$PRODUCT_CORE" 10990 gbp year "Core - GBP - Annual")
PRICE_CORE_EUR_MONTH=$(create_price "$PRODUCT_CORE" 1199 eur month "Core - EUR - Monthly")
PRICE_CORE_EUR_YEAR=$(create_price "$PRODUCT_CORE" 11990 eur year "Core - EUR - Annual")
PRICE_CORE_USD_MONTH=$(create_price "$PRODUCT_CORE" 1200 usd month "Core - USD - Monthly")
PRICE_CORE_USD_YEAR=$(create_price "$PRODUCT_CORE" 12000 usd year "Core - USD - Annual")
echo "  GBP Monthly: $PRICE_CORE_GBP_MONTH"
echo "  GBP Annual: $PRICE_CORE_GBP_YEAR"
echo "  EUR Monthly: $PRICE_CORE_EUR_MONTH"
echo "  EUR Annual: $PRICE_CORE_EUR_YEAR"
echo "  USD Monthly: $PRICE_CORE_USD_MONTH"
echo "  USD Annual: $PRICE_CORE_USD_YEAR"

# SynqForge Pro (£19.99/month, £199.90/year)
echo "Creating prices for: SynqForge Pro..."
PRICE_PRO_GBP_MONTH=$(create_price "$PRODUCT_PRO" 1999 gbp month "Pro - GBP - Monthly")
PRICE_PRO_GBP_YEAR=$(create_price "$PRODUCT_PRO" 19990 gbp year "Pro - GBP - Annual")
PRICE_PRO_EUR_MONTH=$(create_price "$PRODUCT_PRO" 2199 eur month "Pro - EUR - Monthly")
PRICE_PRO_EUR_YEAR=$(create_price "$PRODUCT_PRO" 21990 eur year "Pro - EUR - Annual")
PRICE_PRO_USD_MONTH=$(create_price "$PRODUCT_PRO" 2200 usd month "Pro - USD - Monthly")
PRICE_PRO_USD_YEAR=$(create_price "$PRODUCT_PRO" 22000 usd year "Pro - USD - Annual")
echo "  GBP Monthly: $PRICE_PRO_GBP_MONTH"
echo "  GBP Annual: $PRICE_PRO_GBP_YEAR"
echo "  EUR Monthly: $PRICE_PRO_EUR_MONTH"
echo "  EUR Annual: $PRICE_PRO_EUR_YEAR"
echo "  USD Monthly: $PRICE_PRO_USD_MONTH"
echo "  USD Annual: $PRICE_PRO_USD_YEAR"

# SynqForge Team (£16.99/month, £169.90/year)
echo "Creating prices for: SynqForge Team..."
PRICE_TEAM_GBP_MONTH=$(create_price "$PRODUCT_TEAM" 1699 gbp month "Team - GBP - Monthly")
PRICE_TEAM_GBP_YEAR=$(create_price "$PRODUCT_TEAM" 16990 gbp year "Team - GBP - Annual")
PRICE_TEAM_EUR_MONTH=$(create_price "$PRODUCT_TEAM" 1899 eur month "Team - EUR - Monthly")
PRICE_TEAM_EUR_YEAR=$(create_price "$PRODUCT_TEAM" 18990 eur year "Team - EUR - Annual")
PRICE_TEAM_USD_MONTH=$(create_price "$PRODUCT_TEAM" 2000 usd month "Team - USD - Monthly")
PRICE_TEAM_USD_YEAR=$(create_price "$PRODUCT_TEAM" 20000 usd year "Team - USD - Annual")
echo "  GBP Monthly: $PRICE_TEAM_GBP_MONTH"
echo "  GBP Annual: $PRICE_TEAM_GBP_YEAR"
echo "  EUR Monthly: $PRICE_TEAM_EUR_MONTH"
echo "  EUR Annual: $PRICE_TEAM_EUR_YEAR"
echo "  USD Monthly: $PRICE_TEAM_USD_MONTH"
echo "  USD Annual: $PRICE_TEAM_USD_YEAR"

echo ""
echo "Step 4: Create Add-on Products"
echo "--------------------------------------"

# AI Booster add-on
echo "Creating: AI Booster..."
ADDON_BOOSTER=$(stripe products create \
  --name="AI Booster" \
  --description="+200 extra AI actions per month" \
  --metadata[addon]=true \
  --metadata[availableFor]=starter \
  --metadata[aiActionsBonus]=200 \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $ADDON_BOOSTER"

PRICE_BOOSTER_GBP=$(create_price "$ADDON_BOOSTER" 500 gbp month "AI Booster - GBP")
PRICE_BOOSTER_EUR=$(create_price "$ADDON_BOOSTER" 500 eur month "AI Booster - EUR")
PRICE_BOOSTER_USD=$(create_price "$ADDON_BOOSTER" 500 usd month "AI Booster - USD")
echo "  GBP: $PRICE_BOOSTER_GBP"
echo "  EUR: $PRICE_BOOSTER_EUR"
echo "  USD: $PRICE_BOOSTER_USD"

# AI Actions 1,000 Pack (one-time)
echo "Creating: AI Actions 1,000 Pack..."
ADDON_PACK=$(stripe products create \
  --name="AI Actions 1,000 Pack" \
  --description="+1,000 AI actions (90-day expiry; stackable)" \
  --metadata[addon]=true \
  --metadata[availableFor]="core,pro,team" \
  --metadata[feature_key]=overage \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $ADDON_PACK"

# One-time prices (no recurring)
PRICE_PACK_GBP=$(stripe prices create \
  --product="$ADDON_PACK" \
  --unit-amount=2000 \
  --currency=gbp \
  --nickname="AI Pack - GBP" \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
PRICE_PACK_EUR=$(stripe prices create \
  --product="$ADDON_PACK" \
  --unit-amount=2000 \
  --currency=eur \
  --nickname="AI Pack - EUR" \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
PRICE_PACK_USD=$(stripe prices create \
  --product="$ADDON_PACK" \
  --unit-amount=2000 \
  --currency=usd \
  --nickname="AI Pack - USD" \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  GBP: $PRICE_PACK_GBP"
echo "  EUR: $PRICE_PACK_EUR"
echo "  USD: $PRICE_PACK_USD"

# Priority Support Pack
echo "Creating: Priority Support Pack..."
ADDON_SUPPORT=$(stripe products create \
  --name="Priority Support Pack" \
  --description="Upgrades to 24h email + chat support" \
  --metadata[addon]=true \
  --metadata[version]=2025-10-24 \
  --format=json | jq -r '.id')
echo "  Product ID: $ADDON_SUPPORT"

PRICE_SUPPORT_GBP=$(create_price "$ADDON_SUPPORT" 1500 gbp month "Priority Support - GBP")
PRICE_SUPPORT_EUR=$(create_price "$ADDON_SUPPORT" 1500 eur month "Priority Support - EUR")
PRICE_SUPPORT_USD=$(create_price "$ADDON_SUPPORT" 1500 usd month "Priority Support - USD")
echo "  GBP: $PRICE_SUPPORT_GBP"
echo "  EUR: $PRICE_SUPPORT_EUR"
echo "  USD: $PRICE_SUPPORT_USD"

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Summary of Created Products:"
echo "----------------------------"
echo "SynqForge Free: $PRODUCT_FREE"
echo "SynqForge Core: $PRODUCT_CORE"
echo "SynqForge Pro: $PRODUCT_PRO"
echo "SynqForge Team: $PRODUCT_TEAM"
echo "SynqForge Enterprise: $PRODUCT_ENTERPRISE"
echo ""
echo "Add-ons:"
echo "--------"
echo "AI Booster: $ADDON_BOOSTER"
echo "AI Actions Pack: $ADDON_PACK"
echo "Priority Support: $ADDON_SUPPORT"
echo ""
echo "Next Steps:"
echo "1. Verify products in Stripe Dashboard"
echo "2. Test checkout flows for each tier"
echo "3. Configure webhook handlers"
echo "4. Update environment variables with product IDs"
echo ""
