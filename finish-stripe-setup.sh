#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🚀 Final Stripe Setup & Deployment Script 🚀        ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if webhook secret is provided
if [ -z "$1" ]; then
  echo "⚠️  Webhook secret not provided!"
  echo ""
  echo "📋 Steps to complete setup:"
  echo ""
  echo "1. Create webhook in Stripe Dashboard:"
  echo "   👉 https://dashboard.stripe.com/test/webhooks/create"
  echo ""
  echo "   Endpoint URL:"
  echo "   https://synqforge-hd5qh5aw1-synq-forge.vercel.app/api/webhooks/stripe"
  echo ""
  echo "   Events to select:"
  echo "   ✓ customer.subscription.created"
  echo "   ✓ customer.subscription.updated"
  echo "   ✓ customer.subscription.deleted"
  echo "   ✓ invoice.payment_succeeded"
  echo "   ✓ invoice.payment_failed"
  echo "   ✓ checkout.session.completed"
  echo ""
  echo "2. After creating, get the webhook secret (click 'Reveal')"
  echo ""
  echo "3. Run this script with the secret:"
  echo "   ./finish-stripe-setup.sh whsec_YOUR_SECRET_HERE"
  echo ""
  exit 1
fi

WEBHOOK_SECRET="$1"

echo "🔐 Adding webhook secret to Vercel..."
echo "$WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production

if [ $? -eq 0 ]; then
  echo "✅ Webhook secret added successfully!"
  echo ""
  echo "🚀 Deploying to production..."
  vercel --prod --yes

  if [ $? -eq 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║          ✅ STRIPE INTEGRATION COMPLETE! ✅              ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "🎉 Your application is now fully configured for payments!"
    echo ""
    echo "📊 Summary of what was configured:"
    echo "   ✅ 3 Products (Team, Business, Enterprise)"
    echo "   ✅ 7 Price points (monthly & annual)"
    echo "   ✅ Webhook endpoint configured"
    echo "   ✅ All environment variables set"
    echo "   ✅ Deployed to production"
    echo ""
    echo "🧪 Test your integration:"
    echo "   1. Visit: https://synqforge-hd5qh5aw1-synq-forge.vercel.app"
    echo "   2. Sign up / Sign in"
    echo "   3. Go to Settings → Billing"
    echo "   4. Click 'Upgrade to Team'"
    echo "   5. Use test card: 4242 4242 4242 4242"
    echo ""
    echo "📊 Monitor webhooks:"
    echo "   https://dashboard.stripe.com/test/webhooks"
    echo ""
    echo "🎊 You're ready to accept payments!"
  else
    echo "❌ Deployment failed. Check the error above."
    exit 1
  fi
else
  echo "❌ Failed to add webhook secret. Check the error above."
  exit 1
fi
