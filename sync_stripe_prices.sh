#!/usr/bin/env bash
#
# sync_stripe_prices.sh
# Idempotently sync SynqForge products and prices to Stripe
#
# Usage:
#   ./sync_stripe_prices.sh [--dry-run]
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="2025-10-24"
readonly SCRIPT_NAME="$(basename "$0")"

# Product definitions
readonly FREE_NAME="SynqForge Free"
readonly FREE_SLUG="synqforge_free"
readonly FREE_DESC="Free community edition with limited features; includes 7-day trial upgrade option."
readonly FREE_TIER="free"
readonly FREE_TRIAL_DAYS="7"

readonly PRO_NAME="SynqForge Pro"
readonly PRO_SLUG="synqforge_pro"
readonly PRO_DESC="Solo user plan for professionals."
readonly PRO_TIER="pro"

readonly TEAM_NAME="SynqForge Team"
readonly TEAM_SLUG="synqforge_team"
readonly TEAM_DESC="Team plan with collaboration features."
readonly TEAM_TIER="team"
readonly TEAM_MIN_SEATS="5"

# Runtime flags
DRY_RUN=false

# Summary tracking
declare -a SUMMARY_LINES=()

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
    log "ERROR: $*"
    exit 1
}

check_dependencies() {
    if ! command -v stripe >/dev/null 2>&1; then
        error "Stripe CLI not found. Install from https://stripe.com/docs/stripe-cli"
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        error "jq not found. Install from https://stedolan.github.io/jq/"
    fi
    
    # Check Stripe CLI authentication
    if ! stripe config --list >/dev/null 2>&1; then
        error "Stripe CLI not authenticated. Run: stripe login"
    fi
    
    log "✓ Dependencies validated"
}

# ============================================================================
# Product Management
# ============================================================================

find_product_id() {
    local slug="$1"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        return 0
    fi
    
    stripe products list --limit=100 2>&1 | \
        jq -r --arg slug "$slug" '.data[] | select(.metadata.slug == $slug) | .id' | head -n1
}

create_or_update_product() {
    local name="$1"
    local slug="$2"
    local description="$3"
    local tier="$4"
    local min_seats="${5:-}"
    
    log "Processing product: $name"
    
    # Search for existing product
    local existing_product
    existing_product=$(find_product_id "$slug")
    
    if [ -n "$existing_product" ]; then
        log "  Found existing product: $existing_product"
        
        # Update product metadata
        if [ "$DRY_RUN" = false ]; then
            stripe products update "$existing_product" \
                -d "name=$name" \
                -d "description=$description" \
                -d "metadata[slug]=$slug" \
                -d "metadata[tier]=$tier" \
                -d "metadata[version]=$VERSION" \
                $([ -n "$min_seats" ] && echo "-d metadata[min_seats]=$min_seats") \
                >/dev/null 2>&1
            log "  Updated product metadata"
        else
            log "  [DRY-RUN] Would update product metadata"
        fi
        
        echo "$existing_product"
    else
        log "  Creating new product..."
        
        if [ "$DRY_RUN" = false ]; then
            local stripe_output
            stripe_output=$(stripe products create \
                -d "name=$name" \
                -d "description=$description" \
                -d "metadata[slug]=$slug" \
                -d "metadata[tier]=$tier" \
                -d "metadata[version]=$VERSION" \
                $([ -n "$min_seats" ] && echo "-d metadata[min_seats]=$min_seats") \
                2>&1)
            
            if ! echo "$stripe_output" | jq -e . >/dev/null 2>&1; then
                log "  ERROR: Stripe CLI returned invalid JSON:"
                log "  $stripe_output"
                error "Failed to create product"
            fi
            
            local new_product
            new_product=$(echo "$stripe_output" | jq -r '.id')
            log "  Created product: $new_product"
            echo "$new_product"
        else
            log "  [DRY-RUN] Would create product"
            echo "prod_dry_run_${slug}"
        fi
    fi
}

# ============================================================================
# Price Management
# ============================================================================

find_matching_price() {
    local product_id="$1"
    local currency="$2"
    local unit_amount="$3"
    local trial_days="${4:-}"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        return 0
    fi
    
    local jq_filter
    if [ -n "$trial_days" ]; then
        jq_filter='.data[] | select(
            .currency == $cur and 
            (.unit_amount | tostring) == $amt and 
            .recurring.interval == "month" and
            .recurring.trial_period_days == ($trial | tonumber) and
            .metadata.version == $ver
        ) | .id'
    else
        jq_filter='.data[] | select(
            .currency == $cur and 
            (.unit_amount | tostring) == $amt and 
            .recurring.interval == "month" and
            .tax_behavior == "exclusive" and
            .metadata.version == $ver
        ) | .id'
    fi
    
    stripe prices list --product="$product_id" --active=true --limit=100 2>&1 | \
        jq -r --arg cur "$currency" --arg amt "$unit_amount" --arg trial "$trial_days" --arg ver "$VERSION" "$jq_filter" | head -n1
}

create_price() {
    local product_id="$1"
    local currency="$2"
    local unit_amount="$3"
    local tier="$4"
    local trial_days="${5:-}"
    local min_quantity="${6:-}"
    
    local currency_upper
    currency_upper=$(echo "$currency" | tr '[:lower:]' '[:upper:]')
    
    local tier_capitalized
    tier_capitalized="$(echo "$tier" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')"
    
    local nickname="${tier_capitalized} Monthly ${currency_upper}"
    if [ "$unit_amount" = "0" ]; then
        nickname="Free Plan"
    fi
    
    if [ "$DRY_RUN" = false ]; then
        local stripe_output
        local temp_file
        temp_file=$(mktemp)
        
        # Build command args array
        local -a cmd_args=(
            prices create
            -d "product=$product_id"
            -d "currency=$currency"
            -d "unit_amount=$unit_amount"
            -d "recurring[interval]=month"
        )
        
        # Add tax_behavior for paid plans
        if [ "$unit_amount" != "0" ]; then
            cmd_args+=(-d "billing_scheme=per_unit")
            cmd_args+=(-d "tax_behavior=exclusive")
        fi
        
        cmd_args+=(-d "nickname=$nickname")
        cmd_args+=(-d "metadata[tier]=$tier")
        cmd_args+=(-d "metadata[currency]=$currency")
        cmd_args+=(-d "metadata[version]=$VERSION")
        
        if [ -n "$trial_days" ]; then
            cmd_args+=(-d "recurring[trial_period_days]=$trial_days")
        fi
        
        if [ -n "$min_quantity" ]; then
            cmd_args+=(-d "metadata[min_quantity]=$min_quantity")
        fi
        
        # Execute command
        if stripe "${cmd_args[@]}" > "$temp_file" 2>&1; then
            stripe_output=$(cat "$temp_file")
            rm -f "$temp_file"
            
            local new_price
            new_price=$(echo "$stripe_output" | jq -r '.id')
            log "    Created price: $new_price"
            echo "$new_price"
        else
            stripe_output=$(cat "$temp_file")
            rm -f "$temp_file"
            log "    ERROR: Stripe CLI command failed:"
            log "    $stripe_output"
            error "Failed to create price"
        fi
    else
        log "    [DRY-RUN] Would create price: $nickname"
        echo "price_dry_run_${tier}_${currency}"
    fi
}

deactivate_mismatched_prices() {
    local product_id="$1"
    local currency="$2"
    local target_amount="$3"
    local keep_price_id="$4"
    local trial_days="${5:-}"
    
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    local jq_filter
    if [ -n "$trial_days" ]; then
        jq_filter='.data[] | select(
            .currency == $cur and
            .recurring.interval == "month" and
            .id != $keep and
            ((.unit_amount | tostring) != $amt or 
             .recurring.trial_period_days != ($trial | tonumber) or
             .metadata.version != $ver)
        ) | .id'
    else
        jq_filter='.data[] | select(
            .currency == $cur and
            .recurring.interval == "month" and
            .id != $keep and
            ((.unit_amount | tostring) != $amt or 
             .tax_behavior != "exclusive" or
             .metadata.version != $ver)
        ) | .id'
    fi
    
    local mismatched_prices
    mismatched_prices=$(stripe prices list --product="$product_id" --active=true --limit=100 2>&1 | \
        jq -r --arg cur "$currency" --arg amt "$target_amount" --arg keep "$keep_price_id" --arg trial "$trial_days" --arg ver "$VERSION" "$jq_filter")
    
    if [ -z "$mismatched_prices" ]; then
        return 0
    fi
    
    while IFS= read -r price_id; do
        if [ -n "$price_id" ]; then
            log "    Deactivating old price: $price_id"
            stripe prices update "$price_id" -d "active=false" >/dev/null 2>&1
        fi
    done <<< "$mismatched_prices"
}

sync_currency_price() {
    local product_id="$1"
    local tier="$2"
    local currency="$3"
    local unit_amount="$4"
    local trial_days="${5:-}"
    local min_quantity="${6:-}"
    
    local currency_upper
    currency_upper=$(echo "$currency" | tr '[:lower:]' '[:upper:]')
    
    local trial_info=""
    [ -n "$trial_days" ] && trial_info=" with ${trial_days}-day trial"
    
    log "  Processing ${tier} ${currency_upper} (${unit_amount} minor units${trial_info})..."
    
    # Check if matching price exists
    local existing_price
    existing_price=$(find_matching_price "$product_id" "$currency" "$unit_amount" "$trial_days")
    
    if [ -n "$existing_price" ]; then
        log "    Found matching active price: $existing_price"
        SUMMARY_LINES+=("$tier|$currency|$existing_price|$unit_amount|${trial_days:-0}|true|existing")
    else
        # Create new price
        local new_price
        new_price=$(create_price "$product_id" "$currency" "$unit_amount" "$tier" "$trial_days" "$min_quantity")
        SUMMARY_LINES+=("$tier|$currency|$new_price|$unit_amount|${trial_days:-0}|true|created")
    fi
    
    # Deactivate any old mismatched prices for this currency
    local active_price="${existing_price:-$new_price}"
    deactivate_mismatched_prices "$product_id" "$currency" "$unit_amount" "$active_price" "$trial_days"
}

# ============================================================================
# Summary Output
# ============================================================================

print_summary() {
    echo ""
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo "  STRIPE SYNC SUMMARY"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo ""
    
    printf "%-15s %-8s %-30s %-12s %-10s %-8s %-10s\n" \
        "PRODUCT" "CURRENCY" "PRICE ID" "AMOUNT" "TRIAL_DAYS" "ACTIVE" "STATUS"
    printf "%-15s %-8s %-30s %-12s %-10s %-8s %-10s\n" \
        "---------------" "--------" "------------------------------" "------------" "----------" "--------" "----------"
    
    local line
    for line in "${SUMMARY_LINES[@]}"; do
        IFS='|' read -r tier currency price_id amount trial active status <<< "$line"
        printf "%-15s %-8s %-30s %-12s %-10s %-8s %-10s\n" \
            "$tier" "$currency" "$price_id" "$amount" "$trial" "$active" "$status"
    done
    
    echo ""
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        echo "⚠️  DRY RUN MODE - No changes were made to Stripe"
    else
        echo "✓ Sync completed successfully"
    fi
    
    echo ""
    echo "Notes:"
    echo "  • Free plan includes ${FREE_TRIAL_DAYS}-day trial period"
    echo "  • Team plan minimum quantity: $TEAM_MIN_SEATS seats"
    echo "  • All paid prices: monthly recurring, tax_behavior=exclusive"
    echo "  • Version: $VERSION"
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                log "Running in DRY-RUN mode"
                shift
                ;;
            --help|-h)
                cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

Idempotently sync SynqForge products and prices to Stripe.

OPTIONS:
    --dry-run    Show what would be done without making changes
    --help       Show this help message

REQUIREMENTS:
    • Stripe CLI (https://stripe.com/docs/stripe-cli)
    • jq (https://stedolan.github.io/jq/)
    • Authenticated Stripe CLI session (run: stripe login)

EXAMPLE:
    ./$SCRIPT_NAME --dry-run
    ./$SCRIPT_NAME

EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done
    
    log "Starting Stripe sync (version $VERSION)"
    
    # Validate environment
    check_dependencies
    
    # Sync Free product
    log ""
    log "═══ SynqForge Free ═══"
    local free_product_id
    free_product_id=$(create_or_update_product "$FREE_NAME" "$FREE_SLUG" "$FREE_DESC" "$FREE_TIER")
    sync_currency_price "$free_product_id" "$FREE_TIER" "usd" "0" "$FREE_TRIAL_DAYS"
    
    # Sync Pro product
    log ""
    log "═══ SynqForge Pro ═══"
    local pro_product_id
    pro_product_id=$(create_or_update_product "$PRO_NAME" "$PRO_SLUG" "$PRO_DESC" "$PRO_TIER")
    sync_currency_price "$pro_product_id" "$PRO_TIER" "gbp" "999"
    sync_currency_price "$pro_product_id" "$PRO_TIER" "eur" "1099"
    sync_currency_price "$pro_product_id" "$PRO_TIER" "usd" "1100"
    
    # Sync Team product
    log ""
    log "═══ SynqForge Team ═══"
    local team_product_id
    team_product_id=$(create_or_update_product "$TEAM_NAME" "$TEAM_SLUG" "$TEAM_DESC" "$TEAM_TIER" "$TEAM_MIN_SEATS")
    sync_currency_price "$team_product_id" "$TEAM_TIER" "gbp" "1799" "" "$TEAM_MIN_SEATS"
    sync_currency_price "$team_product_id" "$TEAM_TIER" "eur" "1999" "" "$TEAM_MIN_SEATS"
    sync_currency_price "$team_product_id" "$TEAM_TIER" "usd" "2000" "" "$TEAM_MIN_SEATS"
    
    # Print summary
    print_summary
}

# Run main function
main "$@"
