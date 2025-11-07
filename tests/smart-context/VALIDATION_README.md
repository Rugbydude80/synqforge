# Smart Context Feature Validation Test Suite

This directory contains comprehensive pytest-based validation tests for the Smart Context feature.

## Overview

The Smart Context feature retrieves the top 5 similar stories from an epic and uses them as context during AI generation to produce more consistent outputs.

## Test Files

1. **test_smart_context_integration.py** - Feature integration validation
   - Tests that Smart Context properly integrates with story generation
   - Validates context stories are retrieved and passed to generation

2. **test_similarity_algorithm.py** - Similarity retrieval accuracy
   - Tests that similarity algorithm finds relevant stories
   - Validates similarity scores are properly calculated

3. **test_consistency_improvement.py** - Consistency improvement validation
   - Tests format consistency improvements
   - Tests terminology consistency
   - Tests consistency across multiple generations

4. **test_edge_cases.py** - Edge case handling
   - Empty epic handling
   - Fewer than 5 stories
   - Low similarity scenarios

5. **test_performance.py** - Performance validation
   - Retrieval performance (<10s)
   - Generation overhead (<10s)

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Set environment variables:**
```bash
export DATABASE_URL="your_postgresql_connection_string"
export OPENROUTER_API_KEY="your_openrouter_api_key"
export OPENROUTER_MODEL="qwen/qwen3-max"  # Optional
```

## Running Tests

### Run all tests:
```bash
python3 tests/smart-context/run_validation_tests.py
```

### Run specific test file:
```bash
pytest tests/smart-context/test_smart_context_integration.py -v
```

### Run with HTML report:
```bash
pytest tests/smart-context/ -v --html=validation_report.html --self-contained-html
```

## Success Criteria

✅ **Integration Tests**: Feature properly integrates with generation pipeline  
✅ **Similarity Tests**: Algorithm retrieves contextually relevant stories  
✅ **Consistency Tests**: Smart Context improves format/terminology consistency  
✅ **Edge Case Tests**: All edge cases handled without errors  
✅ **Performance Tests**: Feature completes within acceptable latency

## Test Results

After running tests, check `validation_report.html` for detailed results.

## Notes

- Tests require a PostgreSQL database with vector extension (pgvector)
- Tests require OpenRouter API key for AI generation
- Test data is automatically cleaned up after each test
- Tests use real database connections and AI API calls (not mocked)

