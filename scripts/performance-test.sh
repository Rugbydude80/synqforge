#!/bin/bash

# Performance Testing Script
# Measures API response times and generates performance report

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_FILE="performance-results-$(date +%Y%m%d-%H%M%S).json"
REPORT_FILE="performance-report-$(date +%Y%m%d-%H%M%S).md"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PERFORMANCE TESTING SUITE                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not found. Install with: brew install jq${NC}"
    echo "Continuing without JSON formatting..."
fi

# Initialize results
echo "{" > "$RESULTS_FILE"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$RESULTS_FILE"
echo "  \"base_url\": \"$BASE_URL\"," >> "$RESULTS_FILE"
echo "  \"tests\": [" >> "$RESULTS_FILE"

# Initialize markdown report
cat > "$REPORT_FILE" <<EOF
# Performance Test Report
**Generated:** $(date)
**Base URL:** $BASE_URL

---

## Test Results

EOF

# Function to measure endpoint performance
measure_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local iterations=${5:-20}
    local target_ms=$6

    echo -e "\n${BLUE}Testing: $name${NC}"
    echo -e "Endpoint: $method $endpoint"
    echo -e "Iterations: $iterations"

    local times=()
    local success_count=0
    local error_count=0

    for i in $(seq 1 $iterations); do
        local start=$(date +%s%N)

        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
        elif [ "$method" = "POST" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$BASE_URL$endpoint" 2>/dev/null)
        fi

        local end=$(date +%s%N)
        local duration_ns=$((end - start))
        local duration_ms=$((duration_ns / 1000000))

        local http_code=$(echo "$response" | tail -1)

        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            times+=($duration_ms)
            success_count=$((success_count + 1))
        else
            error_count=$((error_count + 1))
            echo -e "${RED}  Request $i failed with status $http_code${NC}"
        fi

        # Small delay between requests
        sleep 0.1
    done

    # Calculate statistics
    if [ ${#times[@]} -gt 0 ]; then
        # Sort times
        IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
        unset IFS

        local min=${sorted[0]}
        local max=${sorted[-1]}

        # Calculate mean
        local sum=0
        for time in "${times[@]}"; do
            sum=$((sum + time))
        done
        local mean=$((sum / ${#times[@]}))

        # Calculate P50 (median)
        local p50_idx=$(( ${#sorted[@]} / 2 ))
        local p50=${sorted[$p50_idx]}

        # Calculate P95
        local p95_idx=$(( ${#sorted[@]} * 95 / 100 ))
        local p95=${sorted[$p95_idx]}

        # Calculate P99
        local p99_idx=$(( ${#sorted[@]} * 99 / 100 ))
        local p99=${sorted[$p99_idx]}

        # Determine pass/fail
        local status="PASS"
        if [ -n "$target_ms" ] && [ "$p95" -gt "$target_ms" ]; then
            status="FAIL"
        fi

        # Print results
        echo -e "\nResults:"
        echo -e "  Success: $success_count / $iterations"
        echo -e "  Min:     ${min}ms"
        echo -e "  Mean:    ${mean}ms"
        echo -e "  P50:     ${p50}ms"
        echo -e "  P95:     ${p95}ms (Target: ${target_ms}ms)"
        echo -e "  P99:     ${p99}ms"
        echo -e "  Max:     ${max}ms"

        if [ "$status" = "PASS" ]; then
            echo -e "  Status:  ${GREEN}PASS${NC}"
        else
            echo -e "  Status:  ${RED}FAIL${NC} (P95 ${p95}ms > target ${target_ms}ms)"
        fi

        # Append to JSON results
        cat >> "$RESULTS_FILE" <<EOF
    {
      "name": "$name",
      "method": "$method",
      "endpoint": "$endpoint",
      "iterations": $iterations,
      "success_count": $success_count,
      "error_count": $error_count,
      "min_ms": $min,
      "mean_ms": $mean,
      "p50_ms": $p50,
      "p95_ms": $p95,
      "p99_ms": $p99,
      "max_ms": $max,
      "target_ms": ${target_ms:-null},
      "status": "$status"
    },
EOF

        # Append to markdown report
        cat >> "$REPORT_FILE" <<EOF
### $name

**Endpoint:** \`$method $endpoint\`
**Iterations:** $iterations
**Success Rate:** $success_count / $iterations

| Metric | Value | Target |
|--------|-------|--------|
| Min | ${min}ms | - |
| Mean | ${mean}ms | - |
| P50 (Median) | ${p50}ms | - |
| **P95** | **${p95}ms** | **${target_ms}ms** |
| P99 | ${p99}ms | - |
| Max | ${max}ms | - |

**Status:** $([ "$status" = "PASS" ] && echo "✅ PASS" || echo "❌ FAIL")

---

EOF
    else
        echo -e "${RED}All requests failed!${NC}"
        cat >> "$RESULTS_FILE" <<EOF
    {
      "name": "$name",
      "method": "$method",
      "endpoint": "$endpoint",
      "error": "All requests failed",
      "status": "FAIL"
    },
EOF
    fi
}

# =============================================================================
# RUN PERFORMANCE TESTS
# =============================================================================

echo -e "${BLUE}Starting performance tests...${NC}\n"

# Test 1: Health Check (baseline)
measure_endpoint \
    "Health Check" \
    "GET" \
    "/api/health" \
    "" \
    10 \
    100

# Test 2: Stories List (Filtered) - MUST PASS
measure_endpoint \
    "Stories List (Filtered)" \
    "GET" \
    "/api/stories?projectId=test&epicId=test&status=backlog" \
    "" \
    20 \
    500

# Test 3: Stories List (Unfiltered)
measure_endpoint \
    "Stories List (All)" \
    "GET" \
    "/api/stories" \
    "" \
    20 \
    500

# Test 4: Single Story (by ID)
# Note: Replace with actual story ID if testing against real data
measure_endpoint \
    "Get Single Story" \
    "GET" \
    "/api/stories/test-id" \
    "" \
    20 \
    200

# Test 5: Projects List
measure_endpoint \
    "Projects List" \
    "GET" \
    "/api/projects" \
    "" \
    20 \
    300

# Test 6: Epics List
measure_endpoint \
    "Epics List" \
    "GET" \
    "/api/epics" \
    "" \
    20 \
    300

# Test 7: Publish Epic - MUST PASS
# Note: This requires a valid epic ID
measure_endpoint \
    "Publish Epic" \
    "POST" \
    "/api/epics/test-id/publish" \
    "" \
    5 \
    1000

# Test 8: Create Story (if endpoint supports it)
measure_endpoint \
    "Create Story" \
    "POST" \
    "/api/stories" \
    '{"title":"Performance Test Story","projectId":"test"}' \
    10 \
    500

# =============================================================================
# FINALIZE RESULTS
# =============================================================================

# Close JSON array and object
sed -i '' '$ s/,$//' "$RESULTS_FILE" 2>/dev/null || sed -i '$ s/,$//' "$RESULTS_FILE"
cat >> "$RESULTS_FILE" <<EOF
  ]
}
EOF

# Add summary to markdown report
cat >> "$REPORT_FILE" <<EOF

## Summary

**All performance targets:**
- Health Check: <100ms
- Stories List (Filtered): <500ms (MUST-PASS)
- Publish Epic: <1000ms (MUST-PASS)
- Other endpoints: <500ms (recommended)

**Next Steps:**
1. Review failed tests above
2. Investigate slow endpoints
3. Optimize database queries if needed
4. Re-run tests after optimizations

---

**Generated:** $(date)
EOF

echo -e "\n${GREEN}Performance testing complete!${NC}"
echo -e "Results saved to:"
echo -e "  ${BLUE}$RESULTS_FILE${NC} (JSON)"
echo -e "  ${BLUE}$REPORT_FILE${NC} (Markdown)"

# Display summary
if command -v jq &> /dev/null; then
    echo -e "\n${BLUE}Summary:${NC}"
    jq -r '.tests[] | "\(.name): P95=\(.p95_ms)ms (\(.status))"' "$RESULTS_FILE" 2>/dev/null || true
fi

echo ""
