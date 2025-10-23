#!/bin/bash

# Test AI Story Generation Endpoints
# Usage: ./scripts/test-ai-endpoints.sh

set -e

echo "🧪 Testing AI Story Generation Endpoints"
echo "========================================"
echo ""

# Get your API base URL
if [ -z "$API_URL" ]; then
    echo "📝 Enter your API URL (e.g., https://synqforge.vercel.app or http://localhost:3000):"
    read API_URL
fi

# Get auth token (you'll need to implement based on your auth)
if [ -z "$AUTH_TOKEN" ]; then
    echo "📝 Enter your auth token (from browser cookies/localStorage):"
    read AUTH_TOKEN
fi

echo ""
echo "🔍 Testing endpoints at: $API_URL"
echo ""

# Test 1: Decompose requirements
echo "1️⃣ Testing POST /api/ai/decompose"
echo "-----------------------------------"

DECOMPOSE_RESPONSE=$(curl -s -X POST "$API_URL/api/ai/decompose" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "requirements": "Build a product filtering system where users can filter by category, price range, and rating. Include a search box and sorting options.",
    "projectId": "test-project-id",
    "similarityThreshold": 0.85
  }')

echo "$DECOMPOSE_RESPONSE" | jq '.' || echo "$DECOMPOSE_RESPONSE"

if echo "$DECOMPOSE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Decompose endpoint working!"
    REQUEST_ID=$(echo "$DECOMPOSE_RESPONSE" | jq -r '.data.requestId')
    echo "   Request ID: $REQUEST_ID"
else
    echo "❌ Decompose endpoint failed"
fi

echo ""
echo ""

# Test 2: Generate story from capability
echo "2️⃣ Testing POST /api/ai/generate-from-capability"
echo "------------------------------------------------"

CAPABILITY_JSON='{
  "capability": {
    "key": "cap-filter-products",
    "title": "Filter Products by Category",
    "description": "Users can filter product listings by selecting category filters",
    "estimate": 3,
    "themes": ["filtering", "data-display"],
    "acceptanceCriteria": [
      {
        "given": "I am on the product listing page",
        "when": "I select a category filter",
        "then": "only products in that category are displayed",
        "is_interactive": true,
        "themes": ["filtering"]
      }
    ],
    "technicalHints": ["Use indexed queries"],
    "hasUI": true,
    "requiresWCAG": true,
    "requiresPersistence": false
  },
  "projectId": "test-project-id",
  "qualityThreshold": 7.0
}'

STORY_RESPONSE=$(curl -s -X POST "$API_URL/api/ai/generate-from-capability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$CAPABILITY_JSON")

echo "$STORY_RESPONSE" | jq '.' || echo "$STORY_RESPONSE"

if echo "$STORY_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Generate story endpoint working!"
    QUALITY_SCORE=$(echo "$STORY_RESPONSE" | jq -r '.data.validation.quality_score')
    READY=$(echo "$STORY_RESPONSE" | jq -r '.data.validation.ready_for_sprint')
    echo "   Quality Score: $QUALITY_SCORE"
    echo "   Ready for Sprint: $READY"
else
    echo "❌ Generate story endpoint failed"
fi

echo ""
echo ""

# Test 3: Health check
echo "3️⃣ Testing GET /api/health"
echo "--------------------------"

HEALTH_RESPONSE=$(curl -s "$API_URL/api/health")
echo "$HEALTH_RESPONSE" | jq '.' || echo "$HEALTH_RESPONSE"

echo ""
echo ""
echo "🎉 Testing complete!"
echo ""
echo "Next steps:"
echo "  1. Check your application logs for any errors"
echo "  2. Try creating a real epic through the UI"
echo "  3. Test idempotency by sending the same request twice"
echo "  4. Monitor metrics in your observability dashboard"

