#!/bin/bash

echo "🔍 Checking Vercel Production Logs"
echo "==================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed"
    echo ""
    echo "Install with: npm i -g vercel"
    echo ""
    echo "Or check logs in browser:"
    echo "https://vercel.com/dashboard → synqforge → Logs"
    exit 1
fi

echo "📊 Fetching last 50 production logs..."
echo ""
echo "Looking for errors related to story access..."
echo ""

vercel logs --prod --limit 50 | grep -i "story\|error\|404\|403\|500" || echo "No errors found in recent logs"

echo ""
echo "---"
echo ""
echo "💡 To watch logs in real-time:"
echo "   vercel logs --prod --follow"
echo ""
echo "Then try accessing the story in your browser"
echo "and watch for errors here."
echo ""
