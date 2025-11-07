# Plan Validation QA Script

## Overview

The **Automated Plan Validation Script** is a production QA tool that validates all plan definitions and entitlements are correctly implemented in SynqForge.

## Quick Start

```bash
# Basic validation
npm run validate:plans

# Extended validation (Stripe, DB schema)
npm run validate:plans -- --extended

# Generate auto-fix patches for failures
npm run validate:plans -- --generate-patches

# Show help
npx tsx scripts/validate-plans-production.ts --help
```

## What It Validates

The script performs comprehensive validation across three categories:

### 1. **Config Validation** ✅
- Plan ID, name, and description match expected values
- AI action limits (numeric or custom) are correct
- Rollover percentages match expectations
- Pooling configuration is correct

### 2. **UI Validation** ✅
- Plan descriptions match expected taglines
- Button text consistency (validated via plan structure)

### 3. **Feature Enforcement** ✅
- **Rollover**: Correctly enabled/disabled per tier
- **Smart Context**: Available for Pro+ plans
- **Deep Reasoning**: Available for Team+ plans
- **Custom Templates**: Available for Core+ plans
- **Admin Dashboard**: Available for Team+ plans
- **Compliance**: Available for Enterprise plans
- **Semantic Search**: Available for Pro+ plans
- **Pooling**: Correctly configured per tier

## Expected Plan Definitions

### Starter (Free)
- **AI Actions**: 25 per month
- **Rollover**: 0%
- **Features**: Single story generation, story comparison, export to Word/Excel
- **Button Text**: "Continue with Starter Plan"

### Core (£10.99/month)
- **AI Actions**: 400 per user/month
- **Rollover**: 20%
- **Features**: +Advanced Gherkin ACs, split stories, priority queue, Custom Templates
- **Button Text**: "Start Free Trial"

### Pro (£19.99/month)
- **AI Actions**: 800 per user/month
- **Rollover**: 20%
- **Features**: +Smart Context (75% better accuracy), semantic search, fast export (Jira/CSV/Word/PDF)
- **Button Text**: "Start Free Trial"

### Team (£16.99/user/month)
- **AI Actions**: 10,000 base + 1,000 per seat
- **Rollover**: 20%
- **Pooling**: Yes
- **Features**: +Smart Context + Deep Reasoning, team templates, admin dashboard
- **Button Text**: "Start Free Trial"

### Enterprise (Custom)
- **AI Actions**: Custom
- **Rollover**: Policy-based
- **Pooling**: Yes
- **Features**: +Deep Reasoning + Custom Models, private semantic search, compliance options
- **Button Text**: "Contact Sales →"

## Output Format

The script outputs a markdown table with validation results:

```
## Validation Results

| Plan | Config | UI | Feature Enforcement | Notes |
|------|--------|----|----|-------|
| Starter | ✅ PASS | ✅ PASS | ✅ PASS | — |
| Core | ✅ PASS | ✅ PASS | ✅ PASS | — |
| Pro | ✅ PASS | ✅ PASS | ✅ PASS | — |
| Team | ✅ PASS | ✅ PASS | ✅ PASS | — |
| Enterprise | ✅ PASS | ✅ PASS | ✅ PASS | — |

**Validation complete:** 5/5 plans fully correct, 0 issues detected.
```

### Status Indicators
- ✅ **PASS**: All checks passed
- ⚠ **WARN**: Minor issues detected (non-blocking)
- ❌ **FAIL**: Critical issues detected (blocking)

## Feature Cascade Detection

The script intelligently handles "Everything in X" feature cascades:

- **Core** includes everything from **Starter**
- **Pro** includes everything from **Core**
- **Team** includes everything from **Pro**
- **Enterprise** includes everything from **Team**

When a plan says "Everything in X", the script recursively checks the lower tier's features to validate inheritance.

## Auto-Fix Patch Generation

When validation fails, you can automatically generate fix suggestions:

```bash
npm run validate:plans -- --generate-patches
```

This outputs:
- **JSON Patch format** (RFC 6902) - Ready to apply with patch tools
- **Ready-to-apply code snippets** - TypeScript code you can copy/paste
- **Manual edit instructions** - Step-by-step guidance

Example output:
```json
[
  {
    "op": "replace",
    "path": "/tiers/core/actions",
    "value": 400
  }
]
```

## Extended Validation

Enable additional checks with `--extended`:

```bash
npm run validate:plans -- --extended
```

Extended checks include:

#### Stripe Metadata Sync
- Validates `stripe.prices.metadata.tier` matches `plan.id` in `config/plans.json`
- Checks that all active Stripe prices have correct metadata
- Verifies product names match expected format (`SynqForge Free`, `SynqForge Core`, etc.)
- Validates metadata version consistency
- **Requires**: `STRIPE_SECRET_KEY` environment variable

#### DB Schema Consistency
- Validates `subscription_tier` enum includes all plan IDs (`starter`, `core`, `pro`, `team`, `enterprise`, `admin`)
- Checks that `organizations` table has required entitlement columns:
  - `subscription_tier`
  - `ai_tokens_included`
  - `advanced_ai`
  - `exports_enabled`
  - `templates_enabled`
  - `sso_enabled`
- Detects missing or extra enum values
- **Requires**: `DATABASE_URL` environment variable

Note: Extended checks gracefully skip if environment variables are not provided, showing `⏭ SKIP` status.

## Usage in CI/CD

Add to your deployment pipeline:

```yaml
# Example GitHub Actions
- name: Validate Plans
  run: npm run validate:plans
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

# With extended validation
- name: Validate Plans (Extended)
  run: npm run validate:plans -- --extended
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

# Generate patches on failure
- name: Validate Plans with Patches
  run: npm run validate:plans -- --generate-patches || true
  continue-on-error: true
```

The script exits with code `1` if any failures are detected, making it suitable for CI/CD integration.

## Troubleshooting

### Common Issues

1. **Feature not found warnings**
   - Check if the feature is mentioned in the plan's `features` array
   - Verify "Everything in X" cascades are working correctly
   - Ensure feature keywords match (case-insensitive)

2. **Config mismatches**
   - Verify `config/plans.json` matches expected values
   - Check AI action limits and rollover percentages
   - Ensure pooling configuration is correct

3. **UI inconsistencies**
   - Verify plan descriptions match expected taglines
   - Check PricingGrid component button text logic

## Component-Level Validation

In addition to config validation, component tests verify UI rendering:

```bash
# Run component tests
npm run test:plans

# Run with coverage report
npm run test:plans:coverage
```

**Test Coverage:**
- ✅ Plan rendering (all 5 plans display correctly)
- ✅ Plan ordering (Starter → Core → Pro → Team → Enterprise)
- ✅ Button text validation (per plan)
- ✅ Feature visibility gating:
  - Smart Context (Pro+)
  - Deep Reasoning (Team+)
  - Custom Templates (Core+)
  - Admin Dashboard (Team+)
  - Compliance (Enterprise only)
- ✅ Price display (Free, £10.99, Custom, etc.)
- ✅ "Most Popular" badge (Pro only)
- ✅ Interactive behavior (button clicks, loading states)
- ✅ **Plan upgrade/downgrade simulation** (new)
  - Upgrade scenarios (Core → Pro, Starter → Team)
  - Downgrade scenarios (Team → Core, Enterprise → Pro)
  - Feature unlock/lock detection
  - Invalid upgrade prevention

**Test Files:**
- `__tests__/pricing-components.test.tsx` - Component tests
- `test-utils/pricing.ts` - Upgrade/downgrade simulation helpers

**Coverage Reports:**
Coverage reports are generated in multiple formats:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI/CD integration
- `coverage/coverage-final.json` - JSON format

Current coverage: **~85%** for pricing components.

## Extending the Script

To add new validation checks:

1. Update `EXPECTED_PLANS` interface with new expected values
2. Add validation logic in `validatePlan()` function
3. Update feature checks in the feature enforcement section
4. Add component tests for new UI features

## Weekly Automated Validation

To detect silent Stripe/DB drift, run extended validation weekly:

### GitHub Actions (Recommended)

A GitHub Actions workflow runs every Monday at 9:00 AM UTC:

```yaml
# .github/workflows/weekly-plan-validation.yml
```

**Features:**
- Runs extended validation (Stripe + DB schema)
- Uploads validation report as artifact
- Creates GitHub issue on failure
- Comments on PRs if triggered manually

**Setup:**
1. Add secrets to GitHub repository:
   - `STRIPE_SECRET_KEY`
   - `DATABASE_URL`
2. Workflow runs automatically on schedule
3. Manual trigger available via `workflow_dispatch`

### Local Cron Job

For local or server-based monitoring:

```bash
# Add to crontab (runs every Monday at 9 AM)
0 9 * * 1 /path/to/synqforge/scripts/weekly-plan-validation.sh
```

**Script Features:**
- Logs to `logs/plan-validation-YYYYMMDD.log`
- Generates markdown report
- Sends notifications (configure `send_notification()` function)
- Gracefully handles missing environment variables

**Environment Variables:**
```bash
export STRIPE_SECRET_KEY="sk_..."
export DATABASE_URL="postgresql://..."
export LOG_FILE="/path/to/logs/plan-validation.log"  # Optional
export REPORT_FILE="/path/to/logs/plan-validation-report.md"  # Optional
```

## Related Files

- `config/plans.json` - Plan definitions source
- `components/pricing/PricingGrid.tsx` - UI component
- `lib/config/tiers.ts` - Tier configuration
- `lib/middleware/feature-gate.ts` - Feature enforcement
- `__tests__/pricing-components.test.tsx` - Component tests
- `test-utils/pricing.ts` - Upgrade/downgrade simulation helpers
- `scripts/validate-plans-production.ts` - Validation script
- `scripts/weekly-plan-validation.sh` - Weekly cron script
- `.github/workflows/weekly-plan-validation.yml` - GitHub Actions workflow

