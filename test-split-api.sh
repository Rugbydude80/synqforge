#!/bin/bash

# Test the split-analysis API endpoint
# Usage: ./test-split-api.sh <storyId> <cookie>

STORY_ID="${1:-yT6xkjwAjelkV3s4lSTzp}"
COOKIE="$2"

echo "Testing split-analysis API for story: $STORY_ID"
echo "=============================================="
echo ""

if [ -z "$COOKIE" ]; then
  echo "ERROR: Cookie not provided"
  echo "Usage: ./test-split-api.sh <storyId> <cookie>"
  echo ""
  echo "To get your cookie:"
  echo "1. Open Developer Tools in your browser (F12)"
  echo "2. Go to the Network tab"
  echo "3. Make a request to synqforge.com"
  echo "4. Click on the request"
  echo "5. Copy the 'cookie' header value"
  exit 1
fi

echo "Making request..."
echo ""

curl -v "https://synqforge.com/api/stories/$STORY_ID/split-analysis" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  2>&1 | head -100

echo ""
echo "=============================================="

