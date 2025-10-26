#!/bin/bash
# Update Vercel Environment Variables for Signup Fix
# Run this when you're ready to deploy to production

echo "🚀 Updating Vercel environment variables..."
echo ""
echo "This will update Production, Preview, and Development environments."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Pro Plan (Solo/Core in UI)
vercel env add NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID production preview development << EOF
price_1SLnMuJBjlYCYeTTDapdXMJv
EOF

vercel env add NEXT_PUBLIC_STRIPE_PRO_EUR_PRICE_ID production preview development << EOF
price_1SLnMxJBjlYCYeTTslVAJD1l
EOF

vercel env add NEXT_PUBLIC_STRIPE_PRO_USD_PRICE_ID production preview development << EOF
price_1SLnMzJBjlYCYeTTdoaoKSO0
EOF

# Team Plan
vercel env add NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID production preview development << EOF
price_1SLnN3JBjlYCYeTTAXqwUVV9
EOF

vercel env add NEXT_PUBLIC_STRIPE_TEAM_EUR_PRICE_ID production preview development << EOF
price_1SLnN5JBjlYCYeTTCrlPFItL
EOF

vercel env add NEXT_PUBLIC_STRIPE_TEAM_USD_PRICE_ID production preview development << EOF
price_1SLnN7JBjlYCYeTT0JF2zQYd
EOF

# Free Plan
vercel env add NEXT_PUBLIC_STRIPE_FREE_PRICE_ID production preview development << EOF
price_1SLnLWJBjlYCYeTTrDeVaRBZ
EOF

# Product IDs
vercel env add NEXT_PUBLIC_STRIPE_FREE_PRODUCT_ID production preview development << EOF
prod_TIO7BKK4jaiz1J
EOF

vercel env add NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID production preview development << EOF
prod_TIO0vsmF3eS7de
EOF

vercel env add NEXT_PUBLIC_STRIPE_TEAM_PRODUCT_ID production preview development << EOF
prod_TIO9VWV13sTZUN
EOF

echo ""
echo "✅ Vercel environment variables updated!"
echo ""
echo "Next steps:"
echo "1. Redeploy your app: vercel --prod"
echo "2. Or push to main branch to trigger auto-deployment"
echo ""

