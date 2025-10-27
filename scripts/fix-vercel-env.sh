#!/bin/bash
# Fix Vercel Environment Variables - Remove newlines

set -e

echo "🔧 Fixing Vercel environment variables (removing newlines)..."
echo ""

# Function to safely update an environment variable
update_env() {
  local name=$1
  local value=$2
  local env=$3
  
  echo "Updating $name in $env..."
  
  # Remove if exists
  vercel env rm "$name" "$env" -y 2>/dev/null || true
  
  # Add with printf (no newline)
  printf "%s" "$value" | vercel env add "$name" "$env"
}

# Pro Plan
update_env "NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID" "price_1SLnMuJBjlYCYeTTDapdXMJv" "production"
update_env "NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID" "price_1SLnMuJBjlYCYeTTDapdXMJv" "preview"
update_env "NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID" "price_1SLnMuJBjlYCYeTTDapdXMJv" "development"

update_env "NEXT_PUBLIC_STRIPE_PRO_EUR_PRICE_ID" "price_1SLnMxJBjlYCYeTTslVAJD1l" "production"
update_env "NEXT_PUBLIC_STRIPE_PRO_EUR_PRICE_ID" "price_1SLnMxJBjlYCYeTTslVAJD1l" "preview"
update_env "NEXT_PUBLIC_STRIPE_PRO_EUR_PRICE_ID" "price_1SLnMxJBjlYCYeTTslVAJD1l" "development"

update_env "NEXT_PUBLIC_STRIPE_PRO_USD_PRICE_ID" "price_1SLnMzJBjlYCYeTTdoaoKSO0" "production"
update_env "NEXT_PUBLIC_STRIPE_PRO_USD_PRICE_ID" "price_1SLnMzJBjlYCYeTTdoaoKSO0" "preview"
update_env "NEXT_PUBLIC_STRIPE_PRO_USD_PRICE_ID" "price_1SLnMzJBjlYCYeTTdoaoKSO0" "development"

# Team Plan
update_env "NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID" "price_1SLnN3JBjlYCYeTTAXqwUVV9" "production"
update_env "NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID" "price_1SLnN3JBjlYCYeTTAXqwUVV9" "preview"
update_env "NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID" "price_1SLnN3JBjlYCYeTTAXqwUVV9" "development"

update_env "NEXT_PUBLIC_STRIPE_TEAM_EUR_PRICE_ID" "price_1SLnN5JBjlYCYeTTCrlPFItL" "production"
update_env "NEXT_PUBLIC_STRIPE_TEAM_EUR_PRICE_ID" "price_1SLnN5JBjlYCYeTTCrlPFItL" "preview"
update_env "NEXT_PUBLIC_STRIPE_TEAM_EUR_PRICE_ID" "price_1SLnN5JBjlYCYeTTCrlPFItL" "development"

update_env "NEXT_PUBLIC_STRIPE_TEAM_USD_PRICE_ID" "price_1SLnN7JBjlYCYeTT0JF2zQYd" "production"
update_env "NEXT_PUBLIC_STRIPE_TEAM_USD_PRICE_ID" "price_1SLnN7JBjlYCYeTT0JF2zQYd" "preview"
update_env "NEXT_PUBLIC_STRIPE_TEAM_USD_PRICE_ID" "price_1SLnN7JBjlYCYeTT0JF2zQYd" "development"

# Free Plan
update_env "NEXT_PUBLIC_STRIPE_FREE_PRICE_ID" "price_1SLnLWJBjlYCYeTTrDeVaRBZ" "production"
update_env "NEXT_PUBLIC_STRIPE_FREE_PRICE_ID" "price_1SLnLWJBjlYCYeTTrDeVaRBZ" "preview"
update_env "NEXT_PUBLIC_STRIPE_FREE_PRICE_ID" "price_1SLnLWJBjlYCYeTTrDeVaRBZ" "development"

# Product IDs
update_env "NEXT_PUBLIC_STRIPE_FREE_PRODUCT_ID" "prod_TIO7BKK4jaiz1J" "production"
update_env "NEXT_PUBLIC_STRIPE_FREE_PRODUCT_ID" "prod_TIO7BKK4jaiz1J" "preview"
update_env "NEXT_PUBLIC_STRIPE_FREE_PRODUCT_ID" "prod_TIO7BKK4jaiz1J" "development"

update_env "NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID" "prod_TIO0vsmF3eS7de" "production"
update_env "NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID" "prod_TIO0vsmF3eS7de" "preview"
update_env "NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID" "prod_TIO0vsmF3eS7de" "development"

update_env "NEXT_PUBLIC_STRIPE_TEAM_PRODUCT_ID" "prod_TIO9VWV13sTZUN" "production"
update_env "NEXT_PUBLIC_STRIPE_TEAM_PRODUCT_ID" "prod_TIO9VWV13sTZUN" "preview"
update_env "NEXT_PUBLIC_STRIPE_TEAM_PRODUCT_ID" "prod_TIO9VWV13sTZUN" "development"

echo ""
echo "✅ All environment variables fixed!"
echo ""
echo "Next: Redeploy your app to use the fixed variables"
echo "Run: vercel --prod"

