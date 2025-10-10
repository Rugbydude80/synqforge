#!/bin/bash

# AI Story Generation Test Script
# Tests the /api/ai/generate-single-story endpoint

set -e

echo "🧪 AI Story Generation Test"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-https://synqforge.com}"
SESSION_TOKEN="${2:-}"

if [ -z "$SESSION_TOKEN" ]; then
    echo -e "${RED}❌ Error: SESSION_TOKEN not provided${NC}"
    echo ""
    echo "Usage: $0 [BASE_URL] [SESSION_TOKEN]"
    echo ""
    echo "Example:"
    echo "  $0 https://synqforge.com your-session-token-here"
    echo ""
    echo "To get your session token:"
    echo "  1. Open https://synqforge.com in your browser"
    echo "  2. Open DevTools (F12)"
    echo "  3. Go to Application > Cookies"
    echo "  4. Copy the value of 'next-auth.session-token'"
    echo ""
    exit 1
fi

echo "Base URL: $BASE_URL"
echo "Session Token: ${SESSION_TOKEN:0:20}..."
echo ""

# Test 1: Simple authentication feature
echo "Test 1: Password Reset Feature"
echo "--------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/generate-single-story" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "requirement": "As a user, I want to be able to reset my password via email so that I can regain access to my account if I forget my credentials",
    "projectId": "test-project-1",
    "projectContext": "User authentication system for a SaaS platform"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq -r '.story.title // "Error: No title"'
    echo "Story Points: $(echo "$BODY" | jq -r '.story.storyPoints // "N/A"')"
    echo "Priority: $(echo "$BODY" | jq -r '.story.priority // "N/A"')"
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${YELLOW}⚠️  Rate Limited (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq -r '.error // "Rate limit exceeded"'
    echo "Retry After: $(echo "$BODY" | jq -r '.retryAfter // "Unknown"')"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""

# Wait to avoid rate limiting
echo "Waiting 10 seconds to avoid rate limiting..."
sleep 10

# Test 2: E-commerce feature
echo "Test 2: Shopping Cart Feature"
echo "------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/generate-single-story" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "requirement": "User can add products to shopping cart and update quantities before checkout",
    "projectId": "test-project-2",
    "projectContext": "E-commerce platform with product catalog and payment processing"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq -r '.story.title // "Error: No title"'
    echo "Story Points: $(echo "$BODY" | jq -r '.story.storyPoints // "N/A"')"
    echo "Priority: $(echo "$BODY" | jq -r '.story.priority // "N/A"')"
    echo ""
    echo "Acceptance Criteria:"
    echo "$BODY" | jq -r '.story.acceptanceCriteria[]? // "N/A"' | sed 's/^/  - /'
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${YELLOW}⚠️  Rate Limited (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq -r '.error // "Rate limit exceeded"'
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""

sleep 10

# Test 3: Invalid request (too short)
echo "Test 3: Invalid Request (Too Short)"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/generate-single-story" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "requirement": "short",
    "projectId": "test-project-3"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✅ Correctly Rejected (HTTP $HTTP_CODE)${NC}"
    echo "Error: $(echo "$BODY" | jq -r '.error // "Validation error"')"
else
    echo -e "${RED}❌ Unexpected Response (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""

sleep 10

# Test 4: Complex feature with context
echo "Test 4: Real-time Collaboration Feature"
echo "----------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/generate-single-story" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "requirement": "Multiple users should be able to see each other'\''s cursor positions and real-time edits when collaborating on a document",
    "projectId": "test-project-4",
    "projectContext": "Real-time collaborative document editor similar to Google Docs, using WebSocket for live updates"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq -r '.story.title // "Error: No title"'
    echo "Story Points: $(echo "$BODY" | jq -r '.story.storyPoints // "N/A"')"
    echo "Priority: $(echo "$BODY" | jq -r '.story.priority // "N/A"')"
    echo ""
    echo "Description:"
    echo "$BODY" | jq -r '.story.description // "N/A"' | fold -w 70 -s | sed 's/^/  /'
    echo ""
    echo "Reasoning:"
    echo "$BODY" | jq -r '.story.reasoning // "N/A"' | fold -w 70 -s | sed 's/^/  /'
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${YELLOW}⚠️  Rate Limited (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq -r '.error // "Rate limit exceeded"'
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""

# Summary
echo "=============================="
echo "📊 Test Summary"
echo "=============================="
echo ""
echo "✅ = Success"
echo "⚠️  = Rate Limited (expected)"
echo "❌ = Failed"
echo ""
echo "If you see consistent failures, check:"
echo "  1. ANTHROPIC_API_KEY is set in Vercel"
echo "  2. Session token is valid"
echo "  3. Vercel logs for detailed errors"
echo ""
echo "View logs: vercel logs synqforge.com --follow"
echo ""
