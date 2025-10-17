#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          🚀 STRIPE LIVE MODE DEPLOYMENT SCRIPT 🚀           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will update your Vercel environment with LIVE Stripe keys."
echo ""
echo "⚠️  IMPORTANT: You must have already created:"
echo "   1. Products in Stripe Dashboard (LIVE MODE)"
echo "   2. Webhook endpoint in Stripe (LIVE MODE)"
echo ""
read -p "Have you completed these steps? (yes/no): " READY

if [ "$READY" != "yes" ]; then
  echo ""
  echo "📋 Please complete the setup first:"
  echo "   See GO_LIVE_NOW.md for detailed instructions"
  echo ""
  exit 1
fi

echo ""
echo "Please enter your LIVE Stripe values:"
echo ""

read -p "Secret Key (sk_live_...): " SK
read -p "Team Monthly Price ID (price_...): " TEAM_MONTHLY
read -p "Team Annual Price ID (price_...): " TEAM_ANNUAL
read -p "Business Monthly Price ID (price_...): " BUSINESS_MONTHLY
read -p "Business Annual Price ID (price_...): " BUSINESS_ANNUAL
read -p "Enterprise Monthly Price ID (price_...): " ENTERPRISE_MONTHLY
read -p "Webhook Secret (whsec_...): " WEBHOOK_SECRET

PK="pk_live_51RjJLdJBjlYCYeTTtObMu8jQoYF8aXgG7XyKBSpCITE1UTJWS2twAE8PHcE2JwxKsQMEEGteyut25czpdGNC1I3n00TqEs5eau"

echo ""
echo "🔄 Updating Vercel environment variables..."
echo ""

# Remove old values
vercel env rm STRIPE_SECRET_KEY production --yes 2>/dev/null
vercel env rm STRIPE_PUBLISHABLE_KEY production --yes 2>/dev/null
vercel env rm STRIPE_WEBHOOK_SECRET production --yes 2>/dev/null
vercel env rm STRIPE_TEAM_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_TEAM_ANNUAL_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_BUSINESS_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_BUSINESS_ANNUAL_PRICE_ID production --yes 2>/dev/null
vercel env rm STRIPE_ENTERPRISE_PRICE_ID production --yes 2>/dev/null

# Add new values
echo "$SK" | vercel env add STRIPE_SECRET_KEY production
echo "$PK" | vercel env add STRIPE_PUBLISHABLE_KEY production
echo "$WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production
echo "$TEAM_MONTHLY" | vercel env add STRIPE_TEAM_PRICE_ID production
echo "$TEAM_ANNUAL" | vercel env add STRIPE_TEAM_ANNUAL_PRICE_ID production
echo "$BUSINESS_MONTHLY" | vercel env add STRIPE_BUSINESS_PRICE_ID production
echo "$BUSINESS_ANNUAL" | vercel env add STRIPE_BUSINESS_ANNUAL_PRICE_ID production
echo "$ENTERPRISE_MONTHLY" | vercel env add STRIPE_ENTERPRISE_PRICE_ID production

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "🚀 Deploying to production..."
echo ""

vercel --prod --yes

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              🎉 YOU ARE NOW LIVE! 🎉                         ║"
echo "║                                                              ║"
echo "║   Your application is now accepting REAL payments!          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Next steps:"
echo "   1. Test a real subscription"
echo "   2. Monitor: https://dashboard.stripe.com/payments"
echo "   3. Check webhooks: https://dashboard.stripe.com/webhooks"
echo ""
