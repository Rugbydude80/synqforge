#!/bin/bash

# Test the production API endpoint
echo "Testing production API endpoint..."
echo ""

# You'll need to replace this with your actual session cookie
# Get it from your browser's DevTools > Application > Cookies
SESSION_COOKIE="${SESSION_COOKIE:-}"

if [ -z "$SESSION_COOKIE" ]; then
  echo "❌ Error: SESSION_COOKIE environment variable not set"
  echo "Please set it with: export SESSION_COOKIE='your-session-cookie'"
  echo ""
  echo "To get your session cookie:"
  echo "1. Log in to https://synqforge.com"
  echo "2. Open DevTools (F12)"
  echo "3. Go to Application > Cookies > https://synqforge.com"
  echo "4. Copy the value of 'next-auth.session-token'"
  exit 1
fi

# Test the endpoint
echo "Making request to https://synqforge.com/api/ai/generate-single-story..."
echo ""

response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -d '{
    "requirement": "As a user, I want to be able to reset my password",
    "projectId": "test-project-123",
    "projectContext": "This is a web application for managing projects"
  }' \
  https://synqforge.com/api/ai/generate-single-story)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "Status Code: $http_code"
echo ""
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" == "200" ]; then
  echo "✅ Success! The API endpoint is working correctly."
elif [ "$http_code" == "401" ]; then
  echo "⚠️  Authentication required. Please update your SESSION_COOKIE."
else
  echo "❌ Error: Received status code $http_code"
fi