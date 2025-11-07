# Plan Validation QA Script

## Overview

The **Automated Plan Validation Script** is a production QA tool that validates all plan definitions and entitlements are correctly implemented in SynqForge.

## Quick Start

```bash
# Run validation
npm run validate:plans

# Or directly with tsx
npx tsx scripts/validate-plans-production.ts
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

## Usage in CI/CD

Add to your deployment pipeline:

```yaml
# Example GitHub Actions
- name: Validate Plans
  run: npm run validate:plans
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

## Extending the Script

To add new validation checks:

1. Update `EXPECTED_PLANS` interface with new expected values
2. Add validation logic in `validatePlan()` function
3. Update feature checks in the feature enforcement section

## Related Files

- `config/plans.json` - Plan definitions source
- `components/pricing/PricingGrid.tsx` - UI component
- `lib/config/tiers.ts` - Tier configuration
- `lib/middleware/feature-gate.ts` - Feature enforcement

