#!/bin/bash
set -euo pipefail

# deactivate_mismatches.sh
# Identifies and deactivates old Stripe prices that don't match version 2025-10-24
# Usage: 
#   ./deactivate_mismatches.sh              # Dry run - shows what would be deactivated
#   ./deactivate_mismatches.sh --execute    # Actually deactivate the prices

VERSION="2025-10-24"
DRY_RUN=true

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
  echo -e "${GREEN}[OK]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Check prerequisites
check_prerequisites() {
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
}

# Parse arguments
if [[ "${1:-}" == "--execute" ]]; then
  DRY_RUN=false
  log_warning "LIVE MODE: Will deactivate prices"
else
  log_info "DRY RUN MODE: Will only show what would be deactivated"
  log_info "Run with --execute to actually deactivate prices"
fi

echo ""

# Product slugs
SLUGS=("synqforge_free" "synqforge_pro" "synqforge_team")
CURRENCIES=("GBP" "EUR" "USD")

TOTAL_FOUND=0
TOTAL_DEACTIVATED=0
ERRORS=0

# Find and deactivate mismatched prices
process_prices() {
  log_info "Scanning for mismatched prices..."
  echo ""
  
  PRODUCTS=$(stripe products list --active true --limit 100)
  
  for slug in "${SLUGS[@]}"; do
    PRODUCT=$(echo "$PRODUCTS" | jq -r --arg slug "$slug" \
      '.data[] | select(.metadata.slug == $slug)')
    
    if [[ -z "$PRODUCT" || "$PRODUCT" == "null" ]]; then
      log_warning "Product not found: $slug"
      continue
    fi
    
    PRODUCT_ID=$(echo "$PRODUCT" | jq -r '.id')
    PRODUCT_NAME=$(echo "$PRODUCT" | jq -r '.name')
    
    log_info "Checking: $PRODUCT_NAME ($PRODUCT_ID)"
    
    # Get all active prices
    PRICES=$(stripe prices list --product "$PRODUCT_ID" --active true --limit 100)
    
    for currency in "${CURRENCIES[@]}"; do
      # Get monthly prices for this currency
      MONTHLY_PRICES=$(echo "$PRICES" | jq --arg curr "$currency" \
        '[.data[] | select(.currency == ($curr | ascii_downcase) and .recurring.interval == "month")]')
      
      # Find the correct price (version=2025-10-24)
      CORRECT_PRICE=$(echo "$MONTHLY_PRICES" | jq --arg ver "$VERSION" \
        '[.[] | select(.metadata.version == $ver)] | .[0]')
      
      if [[ -z "$CORRECT_PRICE" || "$CORRECT_PRICE" == "null" ]]; then
        log_warning "  No price with version=$VERSION for $slug/$currency - skipping"
        continue
      fi
      
      CORRECT_PRICE_ID=$(echo "$CORRECT_PRICE" | jq -r '.id')
      
      # Find mismatched prices (active monthly, same currency, different version or missing version)
      MISMATCHED=$(echo "$MONTHLY_PRICES" | jq --arg ver "$VERSION" --arg correct_id "$CORRECT_PRICE_ID" \
        '[.[] | select(.id != $correct_id and (.metadata.version != $ver or .metadata.version == null))]')
      
      MISMATCH_COUNT=$(echo "$MISMATCHED" | jq 'length')
      
      if [[ "$MISMATCH_COUNT" -eq 0 ]]; then
        log_success "  $currency: No mismatches found"
        continue
      fi
      
      ((TOTAL_FOUND += MISMATCH_COUNT))
      
      log_warning "  $currency: Found $MISMATCH_COUNT mismatched price(s):"
      
      # Process each mismatch
      echo "$MISMATCHED" | jq -c '.[]' | while IFS= read -r price; do
        PRICE_ID=$(echo "$price" | jq -r '.id')
        PRICE_AMOUNT=$(echo "$price" | jq -r '.unit_amount')
        PRICE_VERSION=$(echo "$price" | jq -r '.metadata.version // "none"')
        PRICE_CREATED=$(echo "$price" | jq -r '.created | todate')
        
        echo "    - $PRICE_ID"
        echo "      Amount: $PRICE_AMOUNT $(echo "$price" | jq -r '.currency')"
        echo "      Version: $PRICE_VERSION"
        echo "      Created: $PRICE_CREATED"
        
        if [[ "$DRY_RUN" == "true" ]]; then
          echo -e "      ${YELLOW}Would run:${NC} stripe prices update $PRICE_ID --active=false"
        else
          echo "      Deactivating..."
          if stripe prices update "$PRICE_ID" --active=false > /dev/null 2>&1; then
            echo -e "      ${GREEN}✓ Deactivated${NC}"
            ((TOTAL_DEACTIVATED++))
          else
            echo -e "      ${RED}✗ Failed to deactivate${NC}"
            ((ERRORS++))
          fi
        fi
        echo ""
      done
    done
    
    echo ""
  done
}

# Generate summary
print_summary() {
  echo "================================"
  echo "  SUMMARY"
  echo "================================"
  echo ""
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "Mode: DRY RUN"
    echo ""
    echo "Found: $TOTAL_FOUND mismatched price(s)"
    
    if [[ $TOTAL_FOUND -eq 0 ]]; then
      log_success "No mismatched prices found! Your setup is clean. ✓"
    else
      echo ""
      log_warning "To deactivate these prices, run:"
      echo "  ./deactivate_mismatches.sh --execute"
      echo ""
      echo "⚠️  This will:"
      echo "  1. Mark old prices as inactive (no new subscriptions can use them)"
      echo "  2. NOT affect existing subscriptions using those prices"
      echo "  3. Clean up your Stripe Dashboard for easier management"
    fi
  else
    echo "Mode: LIVE"
    echo ""
    echo "Found: $TOTAL_FOUND mismatched price(s)"
    echo "Deactivated: $TOTAL_DEACTIVATED"
    echo "Errors: $ERRORS"
    echo ""
    
    if [[ $ERRORS -eq 0 ]]; then
      if [[ $TOTAL_DEACTIVATED -eq 0 ]]; then
        log_success "No prices needed deactivation. ✓"
      else
        log_success "Successfully deactivated $TOTAL_DEACTIVATED price(s). ✓"
        echo ""
        echo "Note: Existing subscriptions using these prices are NOT affected."
        echo "They will continue working normally until cancelled or upgraded."
      fi
    else
      log_error "Failed to deactivate some prices. Check errors above."
    fi
  fi
  
  echo ""
}

# Main
main() {
  echo "================================"
  echo "  Deactivate Mismatched Prices"
  echo "  Target Version: $VERSION"
  echo "================================"
  echo ""
  
  check_prerequisites
  process_prices
  print_summary
  
  if [[ "$DRY_RUN" == "false" && $ERRORS -gt 0 ]]; then
    exit 1
  fi
  
  if [[ "$DRY_RUN" == "true" && $TOTAL_FOUND -gt 0 ]]; then
    exit 2  # Exit code 2 means "mismatches found, need --execute"
  fi
  
  exit 0
}

main "$@"

