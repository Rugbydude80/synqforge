#!/bin/bash
#
# Weekly Plan Validation Cron Job
# 
# Runs extended plan validation weekly to detect Stripe/DB drift
# Sends results via email or logs to monitoring system
#
# Usage:
#   Add to crontab: 0 9 * * 1 /path/to/scripts/weekly-plan-validation.sh
#   Or run manually: ./scripts/weekly-plan-validation.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/plan-validation-$(date +%Y%m%d).log}"
REPORT_FILE="${REPORT_FILE:-$PROJECT_ROOT/logs/plan-validation-report-$(date +%Y%m%d).md}"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$REPORT_FILE")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

# Check if required environment variables are set
check_env() {
  local missing_vars=()

  if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
    missing_vars+=("STRIPE_SECRET_KEY")
  fi

  if [ -z "${DATABASE_URL:-}" ]; then
    missing_vars+=("DATABASE_URL")
  fi

  if [ ${#missing_vars[@]} -gt 0 ]; then
    log_warning "Missing environment variables: ${missing_vars[*]}"
    log_warning "Extended validation will be skipped"
    return 1
  fi

  return 0
}

# Run validation
run_validation() {
  log "Starting weekly plan validation..."
  log "Log file: $LOG_FILE"
  log "Report file: $REPORT_FILE"

  cd "$PROJECT_ROOT"

  # Run extended validation
  if check_env; then
    log "Running extended validation (Stripe + DB schema)..."
    npm run validate:plans -- --extended > "$REPORT_FILE" 2>&1
    VALIDATION_EXIT_CODE=$?
  else
    log "Running basic validation (extended checks skipped)..."
    npm run validate:plans > "$REPORT_FILE" 2>&1
    VALIDATION_EXIT_CODE=$?
  fi

  # Check results
  if [ $VALIDATION_EXIT_CODE -eq 0 ]; then
    log_success "All plan validations passed"
    
    # Extract summary from report
    if grep -q "fully correct" "$REPORT_FILE"; then
      SUMMARY=$(grep "fully correct" "$REPORT_FILE" | head -1)
      log_success "Summary: $SUMMARY"
    fi

    return 0
  else
    log_error "Plan validation failed - check $REPORT_FILE for details"
    
    # Extract failures from report
    if grep -q "FAIL" "$REPORT_FILE"; then
      log_error "Failures detected:"
      grep "FAIL" "$REPORT_FILE" | head -10 | tee -a "$LOG_FILE"
    fi

    return 1
  fi
}

# Send notification (optional - configure based on your monitoring setup)
send_notification() {
  local status=$1
  local subject="Plan Validation ${status}: SynqForge"

  # Example: Send via email (requires mail command or similar)
  # if command -v mail &> /dev/null; then
  #   mail -s "$subject" "$NOTIFICATION_EMAIL" < "$REPORT_FILE"
  # fi

  # Example: Send to Slack webhook
  # if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
  #   curl -X POST -H 'Content-type: application/json' \
  #     --data "{\"text\":\"$subject\n\`\`\`$(cat $REPORT_FILE | head -50)\`\`\`\"}" \
  #     "$SLACK_WEBHOOK_URL"
  # fi

  log "Notification would be sent here (configure send_notification function)"
}

# Main execution
main() {
  log "=========================================="
  log "Weekly Plan Validation - $(date)"
  log "=========================================="

  if run_validation; then
    log_success "Validation completed successfully"
    send_notification "PASSED"
    exit 0
  else
    log_error "Validation failed - action required"
    send_notification "FAILED"
    exit 1
  fi
}

# Run main function
main "$@"

