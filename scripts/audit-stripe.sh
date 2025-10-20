#!/bin/bash

# Stripe Audit Script
# Checks all products, prices, and configuration

# Get Stripe key from environment variable
STRIPE_KEY="${STRIPE_SECRET_KEY}"

if [ -z "$STRIPE_KEY" ]; then
  echo "Error: STRIPE_SECRET_KEY environment variable not set"
  echo "Usage: STRIPE_SECRET_KEY=sk_live_xxx ./audit-stripe.sh"
  exit 1
fi

echo "=================================================="
echo "STRIPE ACCOUNT AUDIT - $(date)"
echo "=================================================="
echo ""

# Get all products
echo "📦 PRODUCTS:"
echo "--------------------------------------------------"
curl -s https://api.stripe.com/v1/products \
  -H "Authorization: Bearer ${STRIPE_KEY}" \
  -G -d limit=100 | jq -r '
  .data[] |
  "ID: \(.id)
Name: \(.name)
Active: \(.active)
Default Price: \(.default_price // "none")
Metadata: \(.metadata | to_entries | map("\(.key)=\(.value)") | join(", "))
---"
'

echo ""
echo "💰 PRICES:"
echo "--------------------------------------------------"
curl -s https://api.stripe.com/v1/prices \
  -H "Authorization: Bearer ${STRIPE_KEY}" \
  -G -d limit=100 -d active=true | jq -r '
  .data[] |
  "ID: \(.id)
Product: \(.product)
Amount: \(.currency | ascii_upcase) \(.unit_amount / 100)
Interval: \(.recurring.interval // "one-time")
Active: \(.active)
---"
'

echo ""
echo "🔔 WEBHOOKS:"
echo "--------------------------------------------------"
curl -s https://api.stripe.com/v1/webhook_endpoints \
  -H "Authorization: Bearer ${STRIPE_KEY}" \
  -G | jq -r '
  .data[] |
  "ID: \(.id)
URL: \(.url)
Status: \(.status)
Events: \(.enabled_events | join(", "))
---"
'

echo ""
echo "=================================================="
echo "AUDIT COMPLETE"
echo "=================================================="
