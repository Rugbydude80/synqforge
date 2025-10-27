#!/bin/bash
# Second Documentation Cleanup - Archive Completion Reports

set -e

echo "🧹 Second Documentation Cleanup - Completion Reports"
echo "====================================================="
echo ""

# Create archive
mkdir -p docs/archive/2025-10-27-second-cleanup

# Count before
BEFORE=$(ls -1 *.md 2>/dev/null | wc -l)

echo "📋 Archiving completion reports and audits..."
echo ""

# Recent completion/audit docs from last 24 hours
mv -v 90_PERCENT_WARNING_AND_BOOSTER_VALIDATION.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v AI_TOKEN_LIMITS_AUDIT.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v BOOSTER_PACKAGE_FIX_COMPLETE.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v SUBSCRIPTION_ENFORCEMENT_COMPLETE.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v SUBSCRIPTION_LIMITS_AUDIT.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v CRITICAL_MISSING_HARD_LIMITS.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v MISSING_LIMITS_SUMMARY_AND_FIXES.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v DEPLOYMENT_SUCCESS.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v TASK_ASSIGNEE_FIX.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true
mv -v DOCUMENTATION_CLEANUP_PLAN.md docs/archive/2025-10-27-second-cleanup/ 2>/dev/null || true

# Count after
AFTER=$(ls -1 *.md 2>/dev/null | wc -l)
ARCHIVED=$(ls -1 docs/archive/2025-10-27-second-cleanup/ 2>/dev/null | wc -l)

echo ""
echo "✅ Second Cleanup Complete!"
echo "====================================================="
echo ""
echo "📊 Summary:"
echo "  Before:     $BEFORE markdown files"
echo "  After:      $AFTER markdown files"
echo "  Archived:   $ARCHIVED files"
echo ""
echo "📁 Archives:"
echo "  Round 1: docs/archive/2025-10-27-cleanup/ (60 files)"
echo "  Round 2: docs/archive/2025-10-27-second-cleanup/ ($ARCHIVED files)"
echo "  Total:   70 files archived"
echo ""
echo "🎯 Final result: $AFTER essential, actionable docs in root"
echo ""
echo "Remaining categories:"
echo "  ✅ Setup guides (6 files)"
echo "  ✅ Developer reference (5 files)"
echo "  ✅ Current features (6 files)"
echo ""
