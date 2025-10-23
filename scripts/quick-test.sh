#!/bin/bash

# Quick test runner - runs the fastest tests first

set -e

echo "🚀 Quick Test Runner"
echo "==================="
echo ""

# Run unit tests first (fastest)
echo "1️⃣  Running unit tests..."
npm run test:unit

echo ""
echo "2️⃣  Running type check..."
npm run typecheck

echo ""
echo "3️⃣  Running linter..."
npm run lint

echo ""
echo "✅ Quick tests completed successfully!"
echo ""
echo "💡 To run full integration tests:"
echo "   bash scripts/run-integration-tests.sh"

