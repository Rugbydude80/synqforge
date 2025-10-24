#!/bin/bash
set -euo pipefail

# validate_stripe_setup.sh
# Validates Stripe products and prices for SynqForge pricing v2025-10-24
# Usage: ./validate_stripe_setup.sh [--verbose]

VERBOSE=false
if [[ "${1:-}" == "--verbose" ]]; then
  VERBOSE=true
fi

VERSION="2025-10-24"
ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
  ((ERRORS++))
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $*" >&2
  ((WARNINGS++))
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $*"
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_verbose() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "${BLUE}[DEBUG]${NC} $*"
  fi
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if ! command -v stripe &> /dev/null; then
    log_error "Stripe CLI not found. Install from https://stripe.com/docs/stripe-cli"
    exit 1
  fi
  
  if ! command -v jq &> /dev/null; then
    log_error "jq not found. Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
  fi
  
  if [[ -z "${STRIPE_API_KEY:-}" ]]; then
    log_error "STRIPE_API_KEY environment variable not set"
    exit 1
  fi
  
  # Test Stripe CLI authentication
  if ! stripe products list --limit 1 &> /dev/null; then
    log_error "Stripe CLI authentication failed. Run: stripe login"
    exit 1
  fi
  
  log_success "Prerequisites check passed"
}

# Expected configuration
declare -A EXPECTED_AMOUNTS=(
  ["synqforge_free_GBP"]=0
  ["synqforge_free_EUR"]=0
  ["synqforge_free_USD"]=0
  ["synqforge_pro_GBP"]=1500
  ["synqforge_pro_EUR"]=1800
  ["synqforge_pro_USD"]=2000
  ["synqforge_team_GBP"]=7500
  ["synqforge_team_EUR"]=9000
  ["synqforge_team_USD"]=10000
)

declare -A PRODUCT_TIERS=(
  ["synqforge_free"]="free"
  ["synqforge_pro"]="pro"
  ["synqforge_team"]="team"
)

CURRENCIES=("GBP" "EUR" "USD")
TEAM_MIN_SEATS=5
FREE_TRIAL_DAYS=7

# Validate product metadata
validate_products() {
  log_info "Validating products..."
  
  PRODUCTS=$(stripe products list --active true --limit 100)
  
  for slug in "${!PRODUCT_TIERS[@]}"; do
    tier="${PRODUCT_TIERS[$slug]}"
    
    PRODUCT=$(echo "$PRODUCTS" | jq -r --arg slug "$slug" \
      '.data[] | select(.metadata.slug == $slug)')
    
    if [[ -z "$PRODUCT" || "$PRODUCT" == "null" ]]; then
      log_error "Product not found: $slug"
      continue
    fi
    
    PRODUCT_ID=$(echo "$PRODUCT" | jq -r '.id')
    PRODUCT_NAME=$(echo "$PRODUCT" | jq -r '.name')
    
    log_verbose "Checking product: $PRODUCT_NAME ($PRODUCT_ID)"
    
    # Check metadata.slug
    ACTUAL_SLUG=$(echo "$PRODUCT" | jq -r '.metadata.slug // empty')
    if [[ "$ACTUAL_SLUG" != "$slug" ]]; then
      log_error "Product $PRODUCT_ID: metadata.slug='$ACTUAL_SLUG', expected '$slug'"
    fi
    
    # Check metadata.tier
    ACTUAL_TIER=$(echo "$PRODUCT" | jq -r '.metadata.tier // empty')
    if [[ "$ACTUAL_TIER" != "$tier" ]]; then
      log_error "Product $PRODUCT_ID: metadata.tier='$ACTUAL_TIER', expected '$tier'"
    fi
    
    # Check metadata.version
    ACTUAL_VERSION=$(echo "$PRODUCT" | jq -r '.metadata.version // empty')
    if [[ "$ACTUAL_VERSION" != "$VERSION" ]]; then
      log_error "Product $PRODUCT_ID: metadata.version='$ACTUAL_VERSION', expected '$VERSION'"
    fi
    
    # Check Team-specific metadata
    if [[ "$tier" == "team" ]]; then
      MIN_SEATS=$(echo "$PRODUCT" | jq -r '.metadata.min_seats // empty')
      if [[ "$MIN_SEATS" != "$TEAM_MIN_SEATS" ]]; then
        log_error "Product $PRODUCT_ID (Team): metadata.min_seats='$MIN_SEATS', expected '$TEAM_MIN_SEATS'"
      fi
    fi
    
    log_success "Product $slug validated"
  done
}

# Validate price metadata and amounts
validate_prices() {
  log_info "Validating prices..."
  
  # Get all products
  PRODUCTS=$(stripe products list --active true --limit 100)
  
  # Track active prices per product+currency
  declare -A ACTIVE_PRICE_COUNTS
  declare -A PRICE_DETAILS
  
  for slug in "${!PRODUCT_TIERS[@]}"; do
    tier="${PRODUCT_TIERS[$slug]}"
    
    PRODUCT=$(echo "$PRODUCTS" | jq -r --arg slug "$slug" \
      '.data[] | select(.metadata.slug == $slug)')
    
    if [[ -z "$PRODUCT" || "$PRODUCT" == "null" ]]; then
      continue
    fi
    
    PRODUCT_ID=$(echo "$PRODUCT" | jq -r '.id')
    PRODUCT_NAME=$(echo "$PRODUCT" | jq -r '.name')
    
    log_info "Checking prices for: $PRODUCT_NAME"
    
    # Get all active prices for this product
    PRICES=$(stripe prices list --product "$PRODUCT_ID" --active true --limit 100)
    
    for currency in "${CURRENCIES[@]}"; do
      key="${slug}_${currency}"
      EXPECTED_AMOUNT="${EXPECTED_AMOUNTS[$key]}"
      
      # Filter monthly prices for this currency
      MONTHLY_PRICES=$(echo "$PRICES" | jq --arg curr "$currency" \
        '[.data[] | select(.currency == ($curr | ascii_downcase) and .recurring.interval == "month")]')
      
      PRICE_COUNT=$(echo "$MONTHLY_PRICES" | jq 'length')
      
      log_verbose "Found $PRICE_COUNT active monthly prices for $slug/$currency"
      
      if [[ "$PRICE_COUNT" -eq 0 ]]; then
        log_error "No active monthly price for $slug/$currency"
        continue
      fi
      
      if [[ "$PRICE_COUNT" -gt 1 ]]; then
        log_warning "Multiple ($PRICE_COUNT) active monthly prices for $slug/$currency"
        echo "$MONTHLY_PRICES" | jq -r '.[] | "  - \(.id): \(.unit_amount) \(.currency), created: \(.created | todate)"'
      fi
      
      # Find the price matching our version
      TARGET_PRICE=$(echo "$MONTHLY_PRICES" | jq --arg ver "$VERSION" \
        '[.[] | select(.metadata.version == $ver)] | .[0]')
      
      if [[ -z "$TARGET_PRICE" || "$TARGET_PRICE" == "null" ]]; then
        log_error "No price found with version=$VERSION for $slug/$currency"
        
        # Show what we have
        echo "$MONTHLY_PRICES" | jq -r '.[] | "  Found: \(.id) - version=\(.metadata.version // "missing")"'
        continue
      fi
      
      PRICE_ID=$(echo "$TARGET_PRICE" | jq -r '.id')
      ACTUAL_AMOUNT=$(echo "$TARGET_PRICE" | jq -r '.unit_amount')
      TAX_BEHAVIOR=$(echo "$TARGET_PRICE" | jq -r '.tax_behavior')
      
      # Validate unit_amount
      if [[ "$ACTUAL_AMOUNT" != "$EXPECTED_AMOUNT" ]]; then
        log_error "Price $PRICE_ID ($slug/$currency): unit_amount=$ACTUAL_AMOUNT, expected $EXPECTED_AMOUNT"
      fi
      
      # Validate tax_behavior
      if [[ "$TAX_BEHAVIOR" != "exclusive" ]]; then
        log_error "Price $PRICE_ID ($slug/$currency): tax_behavior='$TAX_BEHAVIOR', expected 'exclusive'"
      fi
      
      # Validate metadata.tier
      PRICE_TIER=$(echo "$TARGET_PRICE" | jq -r '.metadata.tier // empty')
      if [[ "$PRICE_TIER" != "$tier" ]]; then
        log_error "Price $PRICE_ID: metadata.tier='$PRICE_TIER', expected '$tier'"
      fi
      
      # Validate metadata.currency
      PRICE_CURRENCY=$(echo "$TARGET_PRICE" | jq -r '.metadata.currency // empty')
      if [[ "$PRICE_CURRENCY" != "$currency" ]]; then
        log_error "Price $PRICE_ID: metadata.currency='$PRICE_CURRENCY', expected '$currency'"
      fi
      
      # Validate metadata.version
      PRICE_VERSION=$(echo "$TARGET_PRICE" | jq -r '.metadata.version // empty')
      if [[ "$PRICE_VERSION" != "$VERSION" ]]; then
        log_error "Price $PRICE_ID: metadata.version='$PRICE_VERSION', expected '$VERSION'"
      fi
      
      # Team-specific: check min_quantity
      if [[ "$tier" == "team" ]]; then
        MIN_QTY=$(echo "$TARGET_PRICE" | jq -r '.metadata.min_quantity // empty')
        if [[ "$MIN_QTY" != "$TEAM_MIN_SEATS" ]]; then
          log_error "Price $PRICE_ID (Team): metadata.min_quantity='$MIN_QTY', expected '$TEAM_MIN_SEATS'"
        fi
      fi
      
      # Free-specific: check trial_period_days
      if [[ "$tier" == "free" ]]; then
        TRIAL_DAYS=$(echo "$TARGET_PRICE" | jq -r '.recurring.trial_period_days // 0')
        if [[ "$TRIAL_DAYS" != "$FREE_TRIAL_DAYS" ]]; then
          log_error "Price $PRICE_ID (Free): trial_period_days=$TRIAL_DAYS, expected $FREE_TRIAL_DAYS"
        fi
        
        if [[ "$ACTUAL_AMOUNT" != "0" ]]; then
          log_error "Price $PRICE_ID (Free): unit_amount=$ACTUAL_AMOUNT, expected 0"
        fi
      fi
      
      log_success "Price $PRICE_ID ($slug/$currency) validated"
      
      # Flag old prices that don't match
      OLD_PRICES=$(echo "$MONTHLY_PRICES" | jq --arg ver "$VERSION" --arg pid "$PRICE_ID" \
        '[.[] | select(.metadata.version != $ver and .id != $pid)]')
      
      OLD_COUNT=$(echo "$OLD_PRICES" | jq 'length')
      if [[ "$OLD_COUNT" -gt 0 ]]; then
        log_warning "Found $OLD_COUNT old active prices for $slug/$currency that should be deactivated:"
        echo "$OLD_PRICES" | jq -r '.[] | "  stripe prices update \(.id) --active=false  # \(.unit_amount) \(.currency), version=\(.metadata.version // "none")"'
      fi
    done
  done
}

# Generate summary report
generate_report() {
  echo ""
  echo "================================"
  echo "  VALIDATION SUMMARY"
  echo "================================"
  echo ""
  
  if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    log_success "All checks passed! ✓"
    echo ""
    echo "Your Stripe setup is correctly configured for version $VERSION"
    return 0
  fi
  
  if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}Errors found: $ERRORS${NC}"
  fi
  
  if [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}Warnings found: $WARNINGS${NC}"
  fi
  
  echo ""
  echo "Next steps:"
  if [[ $ERRORS -gt 0 ]]; then
    echo "  1. Review errors above and fix metadata/amounts"
    echo "  2. Use scripts/sync-stripe-prices.sh to update prices"
    echo "  3. Re-run this script to validate"
  fi
  
  if [[ $WARNINGS -gt 0 ]]; then
    echo "  1. Review warnings about multiple active prices"
    echo "  2. Run ./deactivate_mismatches.sh to deactivate old prices"
  fi
  
  echo ""
  
  return 1
}

# Main execution
main() {
  echo "================================"
  echo "  Stripe Setup Validation"
  echo "  Version: $VERSION"
  echo "================================"
  echo ""
  
  check_prerequisites
  echo ""
  
  validate_products
  echo ""
  
  validate_prices
  echo ""
  
  if generate_report; then
    exit 0
  else
    exit 1
  fi
}

main "$@"

