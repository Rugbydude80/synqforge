#!/bin/bash
set -e

# run-all-validations.sh
# Runs the complete Stripe validation suite in sequence
# Usage: ./run-all-validations.sh

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

STEP=1
TOTAL_STEPS=4

run_step() {
  echo ""
  echo "========================================="
  echo "  Step $STEP/$TOTAL_STEPS: $1"
  echo "========================================="
  echo ""
  ((STEP++))
}

echo "========================================="
echo "  Stripe Validation Suite"
echo "  Running All Checks"
echo "========================================="
echo ""

# Check prerequisites
if [[ -z "${STRIPE_API_KEY:-}" ]]; then
  log_error "STRIPE_API_KEY environment variable not set"
  exit 1
fi

if ! command -v stripe &> /dev/null; then
  log_error "Stripe CLI not found"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  log_error "jq not found"
  exit 1
fi

if ! command -v node &> /dev/null; then
  log_error "Node.js not found"
  exit 1
fi

# Step 1: Validate metadata
run_step "Validating Stripe Metadata"
if ! ./validate_stripe_setup.sh; then
  log_error "Metadata validation failed"
  exit 1
fi

# Step 2: Test checkout sessions
run_step "Testing Checkout Session Creation"
if ! npx tsx scripts/smoke_checkout.ts; then
  log_error "Checkout session tests failed"
  exit 1
fi

# Step 3: Check for mismatches
run_step "Checking for Old Prices"
if ./deactivate_mismatches.sh; then
  log_success "No mismatched prices found"
else
  EXIT_CODE=$?
  if [[ $EXIT_CODE -eq 2 ]]; then
    log_error "Mismatched prices found. Review output above."
    echo ""
    echo "To deactivate them, run:"
    echo "  ./deactivate_mismatches.sh --execute"
    exit 1
  else
    log_error "Error checking for mismatches"
    exit 1
  fi
fi

# Step 4: Run E2E tests (optional, requires Playwright)
run_step "Running E2E UI Tests"
if command -v playwright &> /dev/null || [ -d "node_modules/@playwright/test" ]; then
  if ! npx playwright test tests/e2e/pricing.spec.ts; then
    log_error "E2E tests failed"
    exit 1
  fi
else
  log_info "Playwright not installed, skipping E2E tests"
  log_info "To install: npm install && npx playwright install"
fi

# Success!
echo ""
echo "========================================="
echo "  ✓ All Validations Passed!"
echo "========================================="
echo ""
log_success "Your Stripe setup is correctly configured"
echo ""
echo "Next steps:"
echo "  1. Test actual checkout flow manually"
echo "  2. Verify webhooks are working"
echo "  3. Deploy to staging for testing"
echo "  4. Run validation suite in staging"
echo "  5. Deploy to production"
echo ""

exit 0

