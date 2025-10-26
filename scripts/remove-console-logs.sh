#!/bin/bash

# Script to help remove console.log statements from production code
# Run this before deploying to production

echo "🔍 Scanning for console.log statements in production code..."
echo ""

# Find all console.log statements
CONSOLE_LOGS=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="dist" \
  app/ lib/ components/ 2>/dev/null | grep -v "// console.log" | wc -l)

CONSOLE_ERRORS=$(grep -r "console\.error" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="dist" \
  app/ lib/ components/ 2>/dev/null | grep -v "// console.error" | wc -l)

CONSOLE_WARNS=$(grep -r "console\.warn" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="dist" \
  app/ lib/ components/ 2>/dev/null | grep -v "// console.warn" | wc -l)

echo "📊 Console statement counts:"
echo "   console.log:   $CONSOLE_LOGS"
echo "   console.error: $CONSOLE_ERRORS"
echo "   console.warn:  $CONSOLE_WARNS"
echo ""

if [ "$CONSOLE_LOGS" -gt 0 ] || [ "$CONSOLE_ERRORS" -gt 50 ] || [ "$CONSOLE_WARNS" -gt 20 ]; then
  echo "⚠️  WARNING: Too many console statements for production!"
  echo ""
  echo "📝 Files with most console statements:"
  grep -r "console\." --include="*.ts" --include="*.tsx" \
    --exclude-dir="node_modules" \
    app/ lib/ components/ 2>/dev/null | \
    cut -d: -f1 | sort | uniq -c | sort -rn | head -10
  echo ""
  echo "💡 Recommendation: Replace console statements with proper logging"
  echo "   Use a logging library like Winston or Pino"
  echo ""
  echo "🔧 To see specific instances, run:"
  echo "   grep -rn \"console\.log\" app/ lib/ components/"
  exit 1
else
  echo "✅ Console statement count is acceptable"
  exit 0
fi

