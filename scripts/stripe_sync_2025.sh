#!/usr/bin/env bash
#
# stripe_sync_2025.sh
# Enhanced Stripe synchronization script
# Syncs all products, prices, and add-ons from config/products.json
#
# Usage:
#   ./stripe_sync_2025.sh [--dry-run] [--archive-old]
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="2025-10-24"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly CONFIG_FILE="$PROJECT_ROOT/config/products.json"

# Runtime flags
DRY_RUN=false
ARCHIVE_OLD=false

# Summary tracking
declare -a SUMMARY_LINES=()
declare -A PRODUCT_IDS=()

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
    
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Config file not found: $CONFIG_FILE"
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

find_product_by_tier() {
    local tier="$1"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        return 0
    fi
    
    stripe products list --limit=100 2>&1 | \
        jq -r --arg tier "$tier" '.data[] | select(.metadata.tier == $tier) | .id' | head -n1
}

create_or_update_product() {
    local product_config="$1"
    
    local prod_id=$(echo "$product_config" | jq -r '.id')
    local name=$(echo "$product_config" | jq -r '.name')
    local tier=$(echo "$product_config" | jq -r '.tier')
    local description=$(echo "$product_config" | jq -r '.description')
    
    log "Processing product: $name ($tier)"
    
    # Search for existing product by tier
    local existing_product
    existing_product=$(find_product_by_tier "$tier")
    
    # Build metadata args
    local -a metadata_args=()
    echo "$product_config" | jq -r '.metadata | to_entries[] | "-d metadata[\(.key)]=\(.value)"' | while read -r arg; do
        metadata_args+=("$arg")
    done
    
    if [ -n "$existing_product" ]; then
        log "  Found existing product: $existing_product"
        
        if [ "$DRY_RUN" = false ]; then
            stripe products update "$existing_product" \
                -d "name=$name" \
                -d "description=$description" \
                -d "metadata[tier]=$tier" \
                -d "metadata[version]=$VERSION" \
                >/dev/null 2>&1
            log "  Updated product metadata"
        else
            log "  [DRY-RUN] Would update product metadata"
        fi
        
        echo "$existing_product"
    else
        log "  Creating new product..."
        
        if [ "$DRY_RUN" = false ]; then
            local new_product
            new_product=$(stripe products create \
                -d "name=$name" \
                -d "description=$description" \
                -d "metadata[tier]=$tier" \
                -d "metadata[version]=$VERSION" \
                2>&1 | jq -r '.id')
            
            log "  Created product: $new_product"
            echo "$new_product"
        else
            log "  [DRY-RUN] Would create product"
            echo "prod_dry_run_${tier}"
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
    local interval="$4"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        return 0
    fi
    
    stripe prices list --product="$product_id" --active=true --limit=100 2>&1 | \
        jq -r --arg cur "$currency" --arg amt "$unit_amount" --arg int "$interval" '.data[] | select(
            .currency == $cur and 
            (.unit_amount | tostring) == $amt and 
            .recurring.interval == $int
        ) | .id' | head -n1
}

create_price() {
    local product_id="$1"
    local currency="$2"
    local unit_amount="$3"
    local interval="$4"
    local tier="$5"
    
    local currency_upper=$(echo "$currency" | tr '[:lower:]' '[:upper:]')
    local interval_label=$([ "$interval" = "month" ] && echo "Monthly" || echo "Yearly")
    local nickname="${tier} ${interval_label} ${currency_upper}"
    
    if [ "$DRY_RUN" = false ]; then
        local new_price
        new_price=$(stripe prices create \
            -d "product=$product_id" \
            -d "currency=$currency" \
            -d "unit_amount=$unit_amount" \
            -d "recurring[interval]=$interval" \
            -d "billing_scheme=per_unit" \
            -d "tax_behavior=exclusive" \
            -d "nickname=$nickname" \
            -d "metadata[tier]=$tier" \
            -d "metadata[currency]=$currency" \
            -d "metadata[version]=$VERSION" \
            2>&1 | jq -r '.id')
        
        log "    Created price: $new_price ($nickname)"
        echo "$new_price"
    else
        log "    [DRY-RUN] Would create price: $nickname"
        echo "price_dry_run_${tier}_${currency}_${interval}"
    fi
}

sync_product_prices() {
    local product_id="$1"
    local tier="$2"
    local prices_json="$3"
    
    local count=$(echo "$prices_json" | jq 'length')
    log "  Processing $count price(s) for $tier"
    
    for ((i=0; i<count; i++)); do
        local price=$(echo "$prices_json" | jq -r ".[$i]")
        local currency=$(echo "$price" | jq -r '.currency')
        local unit_amount=$(echo "$price" | jq -r '.unit_amount')
        local interval=$(echo "$price" | jq -r '.recurring.interval // "month"')
        
        log "    Checking price: $currency $unit_amount ($interval)"
        
        local existing_price
        existing_price=$(find_matching_price "$product_id" "$currency" "$unit_amount" "$interval")
        
        if [ -n "$existing_price" ]; then
            log "      Found existing price: $existing_price"
            SUMMARY_LINES+=("$tier|$currency|$existing_price|$unit_amount|$interval|existing")
        else
            local new_price
            new_price=$(create_price "$product_id" "$currency" "$unit_amount" "$interval" "$tier")
            SUMMARY_LINES+=("$tier|$currency|$new_price|$unit_amount|$interval|created")
        fi
    done
}

# ============================================================================
# Add-on Management
# ============================================================================

sync_addon() {
    local addon_config="$1"
    
    local addon_id=$(echo "$addon_config" | jq -r '.id')
    local name=$(echo "$addon_config" | jq -r '.name')
    local addon_type=$(echo "$addon_config" | jq -r '.type')
    local description=$(echo "$addon_config" | jq -r '.description')
    
    log ""
    log "═══ Add-on: $name ═══"
    
    # Find or create add-on product
    local existing_addon
    if [ "$DRY_RUN" = false ]; then
        existing_addon=$(stripe products list --limit=100 2>&1 | \
            jq -r --arg id "$addon_id" '.data[] | select(.metadata.addon_id == $id) | .id' | head -n1)
    fi
    
    local product_id
    if [ -n "$existing_addon" ]; then
        log "  Found existing add-on product: $existing_addon"
        product_id="$existing_addon"
        
        if [ "$DRY_RUN" = false ]; then
            stripe products update "$existing_addon" \
                -d "name=$name" \
                -d "description=$description" \
                -d "metadata[addon_id]=$addon_id" \
                -d "metadata[addon_type]=$addon_type" \
                -d "metadata[version]=$VERSION" \
                >/dev/null 2>&1
        fi
    else
        log "  Creating new add-on product..."
        
        if [ "$DRY_RUN" = false ]; then
            product_id=$(stripe products create \
                -d "name=$name" \
                -d "description=$description" \
                -d "metadata[addon]=true" \
                -d "metadata[addon_id]=$addon_id" \
                -d "metadata[addon_type]=$addon_type" \
                -d "metadata[version]=$VERSION" \
                2>&1 | jq -r '.id')
            log "  Created add-on product: $product_id"
        else
            product_id="prod_dry_run_${addon_id}"
            log "  [DRY-RUN] Would create add-on product"
        fi
    fi
    
    # Sync add-on prices
    local prices_json=$(echo "$addon_config" | jq -c '.prices')
    local recurring=$(echo "$addon_config" | jq -r '.type // "one_time"')
    
    local count=$(echo "$prices_json" | jq 'length')
    for ((i=0; i<count; i++)); do
        local price=$(echo "$prices_json" | jq -r ".[$i]")
        local currency=$(echo "$price" | jq -r '.currency')
        local unit_amount=$(echo "$price" | jq -r '.unit_amount')
        
        if [ "$recurring" = "recurring" ]; then
            local interval=$(echo "$price" | jq -r '.recurring.interval // "month"')
            log "    Processing recurring add-on price: $currency $unit_amount/$interval"
            
            local existing_price
            existing_price=$(find_matching_price "$product_id" "$currency" "$unit_amount" "$interval")
            
            if [ -z "$existing_price" ]; then
                create_price "$product_id" "$currency" "$unit_amount" "$interval" "$addon_id"
            else
                log "      Found existing price: $existing_price"
            fi
        else
            log "    Processing one-time add-on price: $currency $unit_amount"
            
            if [ "$DRY_RUN" = false ]; then
                local existing_onetime
                existing_onetime=$(stripe prices list --product="$product_id" --active=true --limit=100 2>&1 | \
                    jq -r --arg cur "$currency" --arg amt "$unit_amount" '.data[] | select(
                        .currency == $cur and 
                        (.unit_amount | tostring) == $amt and 
                        .type == "one_time"
                    ) | .id' | head -n1)
                
                if [ -z "$existing_onetime" ]; then
                    stripe prices create \
                        -d "product=$product_id" \
                        -d "currency=$currency" \
                        -d "unit_amount=$unit_amount" \
                        -d "nickname=One-time $currency" \
                        -d "metadata[addon_id]=$addon_id" \
                        -d "metadata[version]=$VERSION" \
                        >/dev/null 2>&1
                    log "      Created one-time price"
                else
                    log "      Found existing one-time price: $existing_onetime"
                fi
            else
                log "      [DRY-RUN] Would create one-time price"
            fi
        fi
    done
}

# ============================================================================
# Archive Old Products
# ============================================================================

archive_old_products() {
    if [ "$ARCHIVE_OLD" = false ]; then
        return 0
    fi
    
    log ""
    log "═══ Archiving Old Products ═══"
    
    if [ "$DRY_RUN" = false ]; then
        # Get all products not matching current version
        local old_products
        old_products=$(stripe products list --active=true --limit=100 2>&1 | \
            jq -r --arg ver "$VERSION" '.data[] | select(.metadata.version != $ver) | .id')
        
        while IFS= read -r prod_id; do
            if [ -n "$prod_id" ]; then
                log "  Archiving product: $prod_id"
                stripe products update "$prod_id" -d "active=false" >/dev/null 2>&1
            fi
        done <<< "$old_products"
    else
        log "  [DRY-RUN] Would archive old products not matching version $VERSION"
    fi
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
    
    printf "%-15s %-8s %-30s %-12s %-10s %-10s\n" \
        "TIER" "CURRENCY" "PRICE ID" "AMOUNT" "INTERVAL" "STATUS"
    printf "%-15s %-8s %-30s %-12s %-10s %-10s\n" \
        "---------------" "--------" "------------------------------" "------------" "----------" "----------"
    
    for line in "${SUMMARY_LINES[@]}"; do
        IFS='|' read -r tier currency price_id amount interval status <<< "$line"
        printf "%-15s %-8s %-30s %-12s %-10s %-10s\n" \
            "$tier" "$currency" "$price_id" "$amount" "$interval" "$status"
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
    echo "Version: $VERSION"
    echo "Config: $CONFIG_FILE"
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
            --archive-old)
                ARCHIVE_OLD=true
                log "Will archive old products"
                shift
                ;;
            --help|-h)
                cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Sync SynqForge products and prices to Stripe from config/products.json

OPTIONS:
    --dry-run       Show what would be done without making changes
    --archive-old   Archive products not matching current version
    --help          Show this help message

REQUIREMENTS:
    • Stripe CLI (https://stripe.com/docs/stripe-cli)
    • jq (https://stedolan.github.io/jq/)
    • Authenticated Stripe CLI session (run: stripe login)

EXAMPLE:
    ./stripe_sync_2025.sh --dry-run
    ./stripe_sync_2025.sh --archive-old

EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done
    
    log "Starting Stripe sync (version $VERSION)"
    check_dependencies
    
    # Read config file
    local config
    config=$(cat "$CONFIG_FILE")
    
    # Sync tier products
    local tier_count=$(echo "$config" | jq '.tiers | length')
    log ""
    log "Found $tier_count tier(s) to sync"
    
    for ((i=0; i<tier_count; i++)); do
        local tier_config=$(echo "$config" | jq -c ".tiers[$i]")
        local tier_name=$(echo "$tier_config" | jq -r '.name')
        
        log ""
        log "═══ $tier_name ═══"
        
        local product_id
        product_id=$(create_or_update_product "$tier_config")
        
        local prices_json=$(echo "$tier_config" | jq -c '.prices')
        local tier=$(echo "$tier_config" | jq -r '.tier')
        
        if [ -n "$product_id" ] && [ "$product_id" != "null" ]; then
            sync_product_prices "$product_id" "$tier" "$prices_json"
        fi
    done
    
    # Sync add-ons
    local addon_count=$(echo "$config" | jq '.addons | length')
    log ""
    log "Found $addon_count add-on(s) to sync"
    
    for ((i=0; i<addon_count; i++)); do
        local addon_config=$(echo "$config" | jq -c ".addons[$i]")
        sync_addon "$addon_config"
    done
    
    # Archive old products if requested
    archive_old_products
    
    # Print summary
    print_summary
}

# Run main function
main "$@"

