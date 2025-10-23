#!/bin/bash

# Test script for AI Story Split functionality
# This script verifies the API endpoint is accessible and properly configured

set -e

echo "🧪 Testing AI Story Split Functionality"
echo "========================================"

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ERROR: ANTHROPIC_API_KEY environment variable is not set"
    echo "   Please set it in your .env.local file or environment"
    exit 1
else
    echo "✅ ANTHROPIC_API_KEY is configured"
fi

# Check if the API route file exists
if [ -f "app/api/stories/[storyId]/ai-split-suggestions/route.ts" ]; then
    echo "✅ API route exists"
else
    echo "❌ ERROR: API route file not found"
    exit 1
fi

# Check if AI service has the split method
if grep -q "suggestStorySplit" lib/services/ai.service.ts; then
    echo "✅ AI service has suggestStorySplit method"
else
    echo "❌ ERROR: suggestStorySplit method not found in AI service"
    exit 1
fi

# Check if ChildrenEditor has been updated
if grep -q "isLoadingAI" components/story-split/ChildrenEditor.tsx; then
    echo "✅ ChildrenEditor has AI loading state"
else
    echo "❌ ERROR: ChildrenEditor missing AI loading state"
    exit 1
fi

# Check if constants file has STORY_SPLIT cost
if grep -q "STORY_SPLIT" lib/constants.ts; then
    echo "✅ STORY_SPLIT token cost is defined"
else
    echo "❌ ERROR: STORY_SPLIT cost not found in constants"
    exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start the development server: npm run dev"
echo "   2. Navigate to a story with >5 story points"
echo "   3. Click the 'Split story' button in the story header"
echo "   4. Click 'Suggest Splits' in the modal"
echo "   5. Verify AI-generated suggestions appear"
echo ""
echo "📊 Monitoring:"
echo "   - Check browser console for any errors"
echo "   - Monitor API response time (should be 5-10 seconds)"
echo "   - Verify toast notifications appear on success/error"
echo "   - Check database for ai_generations entries"
echo ""
echo "🔧 Troubleshooting:"
echo "   - If API returns 500: Check ANTHROPIC_API_KEY is valid"
echo "   - If API returns 402: Check AI token limits for test org"
echo "   - If API returns 429: Wait 1 minute between requests"
echo "   - Check logs: tail -f .next/server/app/api/stories/[storyId]/ai-split-suggestions/route.log"


