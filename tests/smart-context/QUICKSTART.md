# Quick Start Guide

## 1. Setup (One-time)

```bash
cd tests/smart-context

# Install dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
# Get your key from https://openrouter.ai/
```

## 2. Verify Setup

```bash
python check_setup.py
```

This will verify:
- ✅ Python version
- ✅ Required files
- ✅ Dependencies installed
- ✅ API keys configured

## 3. Run Tests

```bash
python run_tests.py
```

This will:
1. Load 10 sample epic stories
2. Generate 5 stories WITHOUT context (control group)
3. Generate 5 stories WITH Smart Context (test group)
4. Calculate consistency metrics
5. Generate `test_report.md` and `test_results.json`

## 4. Review Results

Open `test_report.md` to see:
- Executive summary with key metrics
- Side-by-side story comparisons
- Context retrieval examples
- Qualitative assessment
- Success criteria evaluation

## Expected Output

The test validates that Smart Context improves:
- **Format Consistency**: Stories match epic story formats better
- **Terminology Overlap**: More shared domain terms
- **Edit Distance Similarity**: Structurally more similar to existing stories

**Success Criteria**: ≥30% improvement in consistency metrics

## Troubleshooting

### "No API key found"
- Make sure `.env` file exists and contains `OPENROUTER_API_KEY`
- Get your API key from https://openrouter.ai/
- Check that `.env` is in the `tests/smart-context/` directory

### "Module not found"
- Run `pip install -r requirements.txt`
- Make sure you're using Python 3.8+

### "Model loading failed"
- First run downloads the sentence transformer model (~90MB)
- Ensure you have internet connection
- Check disk space

## Files Overview

- `similarity.py` - Story similarity algorithm
- `generation.py` - LLM story generation
- `metrics.py` - Consistency metrics calculator
- `test_suite.py` - Test orchestration
- `sample_epic_stories.py` - Test data (10 stories + 5 prompts)
- `run_tests.py` - Main test runner
- `check_setup.py` - Setup verification

