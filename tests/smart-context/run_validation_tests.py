#!/usr/bin/env python3
"""
Test runner for Smart Context validation tests.
Executes all test files and generates a summary report.
"""
import os
import sys
import subprocess
import json
from datetime import datetime
from pathlib import Path

def main():
    """Run all Smart Context validation tests."""
    print("="*70)
    print("SMART CONTEXT FEATURE VALIDATION TEST SUITE")
    print("="*70)
    print()
    
    # Check prerequisites
    if not os.getenv('DATABASE_URL'):
        print("⚠️  WARNING: DATABASE_URL not set")
        print("   Tests that require database will be skipped")
        print()
    
    if not os.getenv('OPENROUTER_API_KEY'):
        print("⚠️  WARNING: OPENROUTER_API_KEY not set")
        print("   Tests that require AI generation will fail")
        print()
    
    # Test files to run
    test_files = [
        'tests/smart-context/test_smart_context_integration.py',
        'tests/smart-context/test_similarity_algorithm.py',
        'tests/smart-context/test_consistency_improvement.py',
        'tests/smart-context/test_edge_cases.py',
        'tests/smart-context/test_performance.py',
    ]
    
    # Run pytest
    print("Running tests...")
    print("-"*70)
    
    cmd = [
        sys.executable, '-m', 'pytest',
        '-v',
        '--tb=short',
        '--html=validation_report.html',
        '--self-contained-html',
    ] + test_files
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Print output
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    # Generate summary
    print()
    print("="*70)
    print("TEST EXECUTION SUMMARY")
    print("="*70)
    print(f"Exit code: {result.returncode}")
    print(f"Report generated: validation_report.html")
    print()
    
    if result.returncode == 0:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed. Check validation_report.html for details.")
    
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())

