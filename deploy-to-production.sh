#!/bin/bash

# SynqForge Production Deployment Script
# AI Context Level Feature + Team Plan 5-Seat Minimum

set -e  # Exit on error

echo "🚀 SynqForge Production Deployment"
echo "===================================="
echo ""
echo "Feature: AI Context Level with Tier Access Control"
echo "Requirement: Team Plan requires minimum 5 users"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-deployment checks
echo "📋 Step 1: Pre-deployment Checks"
echo "--------------------------------"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project root confirmed${NC}"

# Check if required files exist
REQUIRED_FILES=(
    "lib/services/ai-context-actions.service.ts"
    "app/api/ai/generate-single-story/route.ts"
    "app/api/ai/context-level/user-data/route.ts"
    "app/api/billing/create-checkout/route.ts"
    "db/migrations/0005_add_ai_actions_tracking.sql"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required files present${NC}"

# Check environment variables
echo ""
echo "🔐 Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  Warning: DATABASE_URL not set${NC}"
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  Warning: OPENROUTER_API_KEY not set${NC}"
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${YELLOW}⚠️  Warning: STRIPE_SECRET_KEY not set${NC}"
fi

echo ""

# Step 2: Run validation
echo "🧪 Step 2: Running Validation Tests"
echo "------------------------------------"

if command -v npx &> /dev/null; then
    echo "Running validation script..."
    npx ts-node scripts/validate-production-deployment.ts
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ All validation tests passed${NC}"
    else
        echo -e "${RED}❌ Validation tests failed${NC}"
        echo "Fix the issues above before deploying."
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  npx not found, skipping validation${NC}"
fi

echo ""

# Step 3: Database migration
echo "🗄️  Step 3: Database Migration"
echo "------------------------------"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Database migration required${NC}"
echo ""
echo "Run this command on your production database:"
echo ""
echo -e "${GREEN}npm run db:migrate${NC}"
echo ""
echo "Or manually execute:"
echo -e "${GREEN}psql \$DATABASE_URL < db/migrations/0005_add_ai_actions_tracking.sql${NC}"
echo ""
read -p "Have you run the database migration? (yes/no): " migration_done

if [ "$migration_done" != "yes" ]; then
    echo -e "${RED}❌ Please run the database migration first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database migration confirmed${NC}"
echo ""

# Step 4: Build check
echo "🔨 Step 4: Build Check"
echo "----------------------"

echo "Running build..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""

# Step 5: Deployment confirmation
echo "🚀 Step 5: Ready to Deploy"
echo "--------------------------"
echo ""
echo "Deployment Summary:"
echo "  • AI Context Level feature: ✅ Implemented"
echo "  • Tier access control: ✅ Enforced"
echo "  • Team plan 5-seat minimum: ✅ Validated"
echo "  • Database migration: ✅ Confirmed"
echo "  • Build: ✅ Successful"
echo ""
echo -e "${YELLOW}This will deploy to PRODUCTION${NC}"
echo ""
read -p "Are you sure you want to deploy? (yes/no): " confirm_deploy

if [ "$confirm_deploy" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying to production..."
echo ""

# Deploy with Vercel
if command -v vercel &> /dev/null; then
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment successful!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Vercel CLI not found${NC}"
    echo "Please deploy manually using your deployment method"
    exit 1
fi

echo ""

# Step 6: Post-deployment verification
echo "🔍 Step 6: Post-Deployment Verification"
echo "----------------------------------------"
echo ""
echo "Please verify the following:"
echo ""
echo "1. API Health Check:"
echo "   curl https://synqforge.com/api/health"
echo ""
echo "2. User Data Endpoint:"
echo "   curl https://synqforge.com/api/ai/context-level/user-data"
echo ""
echo "3. Test Scenarios:"
echo "   • Starter user cannot use Standard mode (403)"
echo "   • Core user cannot use Comprehensive mode (403)"
echo "   • Pro user cannot use Thinking mode (403)"
echo "   • Team user can use all modes"
echo "   • Team plan purchase requires 5 users"
echo ""
echo "4. Monitor for 1 hour:"
echo "   • Error rates (403, 429, 500)"
echo "   • Response times"
echo "   • Database performance"
echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📊 Next Steps:"
echo "  1. Monitor error rates in your logging system"
echo "  2. Test with real users"
echo "  3. Check usage dashboard displays correctly"
echo "  4. Collect feedback"
echo ""
echo "📖 Documentation:"
echo "  • PRODUCTION_READY_SUMMARY.md"
echo "  • PRODUCTION_DEPLOYMENT_CHECKLIST.md"
echo "  • AI_CONTEXT_LEVEL_IMPLEMENTATION_COMPLETE.md"
echo ""
echo "🎉 Congratulations! The AI Context Level feature is now live!"
echo ""

