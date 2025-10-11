#!/bin/bash

echo "🔍 SynqForge Production Diagnostic"
echo "========================echo "3. **Rebuild locally to test:**"
echo "   npm run build"
echo "   npm run start"
echo ""
echo "4. **Check Vercel logs:**"
echo "   npx vercel logs [deployment-url]"
echo ""
echo "5. **Verify environment variables in Vercel:**"
echo "   - Go to Vercel dashboard"
echo "   - Settings → Environment Variables"
echo "   - Ensure all required vars are set for Production"
echo ""
ho ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

# Check for required files
echo "📁 Checking critical API routes..."
echo ""

routes=(
  "app/api/epics/route.ts"
  "app/api/ai/generate-single-story/route.ts"
  "app/api/ai/generate-stories/route.ts"
)

for route in "${routes[@]}"; do
  if [ -f "$route" ]; then
    echo "✅ $route exists"
  else
    echo "❌ $route MISSING"
  fi
done

echo ""
echo "🏗️  Checking build status..."
echo ""

# Check if .next directory exists
if [ -d ".next" ]; then
  echo "✅ .next directory exists"
  BUILD_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" .next 2>/dev/null || stat -c "%y" .next 2>/dev/null | cut -d' ' -f1,2)
  echo "   Last built: $BUILD_DATE"
else
  echo "⚠️  .next directory not found - project not built locally"
fi

echo ""
echo "🔧 Environment Configuration..."
echo ""

# Check for env files
if [ -f ".env.local" ]; then
  echo "✅ .env.local exists"
  # Check for critical env vars (without showing values)
  critical_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "ANTHROPIC_API_KEY" "UPSTASH_REDIS_REST_URL")
  for var in "${critical_vars[@]}"; do
    if grep -q "^$var=" .env.local; then
      echo "   ✅ $var is set"
    else
      echo "   ❌ $var is MISSING"
    fi
  done
else
  echo "⚠️  .env.local not found"
fi

echo ""
echo "📦 Package versions..."
echo ""
echo "Next.js: $(npm list next --depth=0 2>/dev/null | grep next@ || echo 'Not installed')"
echo "React: $(npm list react --depth=0 2>/dev/null | grep react@ || echo 'Not installed')"

echo ""
echo "🚀 Suggested Actions:"
echo "=================================="
echo ""
echo "If you're seeing errors in production:"
echo ""
echo "1. **Redeploy to production:**"
echo "   git add ."
echo "   git commit -m 'fix: Update API routes'"
echo "   git push origin main"
echo ""
echo "2. **Clear Vercel build cache:**"
echo "   - Go to Vercel dashboard"
echo "   - Deployments → Latest → ⋯ → Redeploy"
echo "   - Check 'Use existing Build Cache' = OFF"
echo ""
echo "3. **Rebuild locally to test:**
echo "   npm run build"
echo "   npm run start"
echo ""
echo "4. **Check Vercel logs:**
echo "   npx vercel logs [deployment-url]"
echo ""
echo "5. **Verify environment variables in Vercel:**
echo "   - Go to Vercel dashboard"
echo "   - Settings → Environment Variables"
echo "   - Ensure all required vars are set for Production"
echo ""

