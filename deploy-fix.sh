#!/bin/bash

echo "🚀 Deploying Fix to Production"
echo "================================"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Add the fix documentation
echo "📝 Committing changes..."
git add FIX_PRODUCTION_ERRORS.md diagnose-production.sh

# Create commit
git commit -m "docs: add production error diagnosis and fix guide" 2>/dev/null || echo "Nothing to commit"

echo ""
echo "🔄 Pushing to trigger Vercel deployment..."
echo ""

# Push to remote
git push clean $CURRENT_BRANCH

echo ""
echo "✅ Push complete!"
echo ""
echo "📊 Next Steps:"
echo "=============="
echo ""
echo "1. Go to https://vercel.com/dashboard"
echo "2. Wait for deployment to complete (2-3 minutes)"
echo "3. Check deployment logs for any errors"
echo ""
echo "4. Once deployed, test these endpoints:"
echo "   curl -I https://synqforge.com/api/ai/generate-single-story"
echo "   curl -I https://synqforge.com/api/epics?projectId=test"
echo ""
echo "5. If you still see 404 or 500 errors:"
echo "   - In Vercel Dashboard → Deployments → Latest → ⋯"
echo "   - Click 'Redeploy'"
echo "   - Uncheck 'Use existing Build Cache'"
echo "   - Click 'Redeploy'"
echo ""
echo "📖 See FIX_PRODUCTION_ERRORS.md for detailed troubleshooting"
echo ""
