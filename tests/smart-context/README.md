# Smart Context Feature Test Suite

This directory contains a comprehensive test implementation for validating the Smart Context feature.

## Overview

Smart Context (Pro+) finds the top 5 most similar existing user stories within the same epic and uses them as contextual input during new story generation. The goal is to produce more consistent outputs that require fewer edits.

## Setup

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure API keys:**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required API keys:
- `OPENROUTER_API_KEY` - OpenRouter API key (get from https://openrouter.ai/)
- `OPENROUTER_MODEL` - Optional, defaults to `qwen/qwen3-max` (matches SynqForge production)

**Note:** This test suite uses OpenRouter, matching SynqForge's production AI integration.

## Running the Tests

```bash
python run_tests.py
```

The test suite will:
1. Generate 5 stories without context (control group)
2. Generate 5 stories with Smart Context (test group)
3. Calculate consistency metrics
4. Generate a comprehensive markdown report

## Output Files

- `test_results.json` - Complete test results in JSON format
- `test_report.md` - Human-readable markdown report with:
  - Executive summary with key metrics
  - Side-by-side story comparisons
  - Context retrieval examples
  - Qualitative assessment
  - Success criteria evaluation

## Test Structure

### Components

1. **similarity.py** - Story similarity algorithm
   - Semantic similarity using sentence embeddings
   - Lexical overlap calculation
   - Top 5 story retrieval
   - Edge case handling

2. **generation.py** - Story generation functions
   - Context-aware generation (with similar stories)
   - Control generation (without context)
   - LLM integration via OpenRouter (matches SynqForge production)

3. **metrics.py** - Consistency metrics calculator
   - Format consistency (Given/When/Then, checklist, narrative)
   - Terminology overlap percentage
   - Edit distance similarity

4. **test_suite.py** - Comparison test suite
   - Control group generation
   - Test group generation
   - Metrics calculation
   - Group comparison

5. **sample_epic_stories.py** - Test data
   - 10 diverse user stories for E-commerce Checkout epic
   - 5 test prompts for story generation

## Success Criteria

The test validates:
- ✅ Similarity algorithm retrieves contextually relevant stories
- ✅ Test group shows ≥30% improvement in consistency metrics vs control
- ✅ Generated stories demonstrate format/terminology inheritance
- ✅ Edge cases (empty epic, <5 stories) handled gracefully

## Expected Metrics

The test measures:
- **Format Consistency**: How well generated stories match epic story formats
- **Terminology Overlap**: Percentage of shared domain terms
- **Edit Distance Similarity**: Character-level similarity to existing stories

## Notes

- The test uses a sample epic with 10 diverse stories
- Same prompts are used for both control and test groups for fair comparison
- Results include both quantitative metrics and qualitative assessment
- Edge cases are handled (empty epic, fewer than 5 stories, low similarity)

