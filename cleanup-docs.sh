#!/bin/bash
# Documentation Cleanup Script - Safe Archive and Cleanup

set -e

echo "🧹 Starting Documentation Cleanup"
echo "=================================="
echo ""

# Create archive directory
echo "📦 Creating archive directory..."
mkdir -p docs/archive/2025-10-27-cleanup

# Count files before
BEFORE_COUNT=$(ls -1 *.md 2>/dev/null | wc -l)

echo "📋 Archiving historical documentation..."
echo ""

# Implementation notes
echo "  Moving implementation notes..."
mv -v AI_STORY_SPLIT_IMPLEMENTATION.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v IMPLEMENTATION_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v IMPLEMENTATION_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v SYNQFORGE_IMPLEMENTATION_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v UPDATE-STORY-IMPLEMENTATION-SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Deployment docs
echo "  Moving deployment docs..."
mv -v DEPLOYMENT_STATUS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v DEPLOYMENT_TASK_STORY_FIX.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v DEPLOYMENT_READY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v DEPLOYMENT_READY_CHECKLIST.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v DEPLOYMENT_READINESS_REPORT.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v DEPLOYMENT-UPDATE-STORY-FEATURE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v FINAL_DEPLOYMENT_STATUS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v STORY_SPLIT_DEPLOYMENT.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Code quality
echo "  Moving code quality reports..."
mv -v CODE_QUALITY_*.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v HONEST_*.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v CODE_COMPLEXITY_REDUCTION.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v CODE_REVIEW_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Validation reports
echo "  Moving validation reports..."
mv -v VALIDATION_AND_DEPLOYMENT_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PERMISSIONS_VALIDATION_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v MIDDLEWARE_VALIDATION_ANALYSIS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v MIDDLEWARE_BLOCKING_VALIDATION_REPORT.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v TASK_STORY_INTEGRATION_VERIFIED.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v NULL_VALIDATION_FIXES_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v VERIFICATION_REPORT.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Old pricing
echo "  Moving old pricing docs..."
mv -v PRICING_2025_IMPLEMENTATION.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRICING_2025_IMPLEMENTATION_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRICING_2025_DEPLOYMENT_GUIDE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRICING_V3_IMPLEMENTATION_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRICING_V3_BUILD_SUCCESS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRICING_ANALYSIS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRICING-PAGE-DYNAMIC-SETUP.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Stripe setup
echo "  Moving completed Stripe setup docs..."
mv -v STRIPE_SETUP_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v STRIPE_SYNC_IMPLEMENTATION_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v STRIPE_VALIDATION_SUITE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v STRIPE_METADATA_VALIDATION.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Subscription
echo "  Moving subscription docs..."
mv -v SUBSCRIPTION_GATING_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Features
echo "  Moving completed feature docs..."
mv -v SIGNUP_FIX_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v SIGNUP_PAGE_UPDATED.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v LANDING_PAGE_CHANGES.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v COLOR_SCHEME_IMPLEMENTATION.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v ADD_JSDOC_COMMENTS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Production
echo "  Moving production checklists..."
mv -v PRODUCTION_READINESS_CHECKLIST.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRODUCTION_DEPLOYMENT_CHECKLIST.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v POST_MIGRATION_CHECKLIST.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRODUCTION_FIXES_APPLIED.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v PRODUCTION_DEPLOYMENT_GUIDE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# README variants
echo "  Moving README variants..."
mv -v README-UPDATE-STORY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v README-NEXT-CHECKS.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v README-sync-pricing.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v README-sync-stripe-prices.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Testing
echo "  Moving test summaries..."
mv -v TEST_SUMMARY.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v TESTING_CHECKLIST_IMPLEMENTATION.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v DIAGNOSTIC.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Other
echo "  Moving miscellaneous docs..."
mv -v STORIES_REPOSITORY_REFACTORING_PLAN.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v REVISED_SECURITY_ASSESSMENT.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v VERCEL_ENV_UPDATE_COMPLETE.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true
mv -v LANDING_PAGE_README.md docs/archive/2025-10-27-cleanup/ 2>/dev/null || true

# Count after
AFTER_COUNT=$(ls -1 *.md 2>/dev/null | wc -l)
ARCHIVED_COUNT=$(ls -1 docs/archive/2025-10-27-cleanup/ 2>/dev/null | wc -l)

echo ""
echo "✅ Cleanup Complete!"
echo "=================================="
echo ""
echo "📊 Summary:"
echo "  Before:  $BEFORE_COUNT markdown files in root"
echo "  After:   $AFTER_COUNT markdown files in root"
echo "  Archived: $ARCHIVED_COUNT files moved to archive"
echo ""
echo "📁 Archive location: docs/archive/2025-10-27-cleanup/"
echo ""
echo "🎯 Next steps:"
echo "  1. Review remaining files: ls -1 *.md"
echo "  2. Review archived files: ls -1 docs/archive/2025-10-27-cleanup/"
echo "  3. Test build: npm run build"
echo "  4. Commit: git add -A && git commit -m 'docs: archive historical implementation notes'"
echo ""
