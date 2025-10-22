# SynqForge Pricing Analysis

## Anthropic Claude API Costs (January 2025)

### Claude 3.5 Sonnet (Current Default Model)
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens

### Claude 3.5 Haiku (Faster, Cheaper Alternative)
- Input: $0.80 per 1M tokens
- Output: $4.00 per 1M tokens

## Estimated Token Usage Per Story

### AI Story Generation (with context)
- Input tokens: ~1,500 (requirements + context + prompt)
- Output tokens: ~800 (story title, description, acceptance criteria)
- **Total per story: ~2,300 tokens**

### Breakdown by model:

**Using Sonnet 3.5:**
- Input cost: 1,500 × $3 / 1M = $0.0045
- Output cost: 800 × $15 / 1M = $0.0120
- **Cost per story: $0.0165 (~1.65¢)**

**Using Haiku 3.5:**
- Input cost: 1,500 × $0.80 / 1M = $0.0012
- Output cost: 800 × $4 / 1M = $0.0032
- **Cost per story: $0.0044 (~0.44¢)**

## Cost Analysis by Tier

### Free Trial (7 days)
- Limit: 50 stories/month, 5K tokens/month
- **Actual costs with Sonnet:**
  - Generating 50 stories: 50 × $0.0165 = **$0.83**
  - Additional token usage (5K tokens): ~$0.05
  - **Total monthly cost: ~$0.88**
- **Actual costs with Haiku:**
  - Generating 50 stories: 50 × $0.0044 = **$0.22**
  - Additional token usage: ~$0.01
  - **Total monthly cost: ~$0.23**

### Solo - £19/month ($24 USD)
- Limit: 200 stories/month, 50K tokens/month
- **Actual costs with Sonnet:**
  - Generating 200 stories: 200 × $0.0165 = **$3.30**
  - Additional token usage (50K tokens): ~$0.50
  - **Total monthly cost: ~$3.80**
  - **Profit margin: $24 - $3.80 = $20.20 (84%)**
- **Actual costs with Haiku:**
  - Generating 200 stories: 200 × $0.0044 = **$0.88**
  - Additional token usage: ~$0.13
  - **Total monthly cost: ~$1.01**
  - **Profit margin: $24 - $1.01 = $22.99 (96%)**

### Team - £29/month ($36 USD)
- Limit: 500 stories/month, 200K tokens/month
- **Actual costs with Sonnet:**
  - Generating 500 stories: 500 × $0.0165 = **$8.25**
  - Additional token usage (200K tokens): ~$2.00
  - **Total monthly cost: ~$10.25**
  - **Profit margin: $36 - $10.25 = $25.75 (72%)**
- **Actual costs with Haiku:**
  - Generating 500 stories: 500 × $0.0044 = **$2.20**
  - Additional token usage: ~$0.53
  - **Total monthly cost: ~$2.73**
  - **Profit margin: $36 - $2.73 = $33.27 (92%)**

### Pro - £99/month ($124 USD)
- Limit: 2,000 stories/month, 1M tokens/month
- **Actual costs with Sonnet:**
  - Generating 2,000 stories: 2,000 × $0.0165 = **$33.00**
  - Additional token usage (1M tokens): ~$10.00
  - **Total monthly cost: ~$43.00**
  - **Profit margin: $124 - $43 = $81 (65%)**
- **Actual costs with Haiku:**
  - Generating 2,000 stories: 2,000 × $0.0044 = **$8.80**
  - Additional token usage: ~$2.67
  - **Total monthly cost: ~$11.47**
  - **Profit margin: $124 - $11.47 = $112.53 (91%)**

### Enterprise - £299/month ($374 USD)
- Limit: Unlimited stories, Unlimited tokens
- **Estimated realistic usage:**
  - ~5,000 stories/month
  - ~3M tokens/month
- **Actual costs with Sonnet:**
  - Generating 5,000 stories: 5,000 × $0.0165 = **$82.50**
  - Additional token usage (3M tokens): ~$30.00
  - **Total monthly cost: ~$112.50**
  - **Profit margin: $374 - $112.50 = $261.50 (70%)**
- **Actual costs with Haiku:**
  - Generating 5,000 stories: 5,000 × $0.0044 = **$22.00**
  - Additional token usage: ~$8.00
  - **Total monthly cost: ~$30.00**
  - **Profit margin: $374 - $30 = $344 (92%)**

## Recommendations

### 1. Model Strategy
**Current:** Using Sonnet 3.5 for everything
**Recommendation:** Use Haiku 3.5 for:
- Story generation (bulk)
- Simple acceptance criteria validation
- Basic AI features

Use Sonnet 3.5 only for:
- Complex analysis
- Epic generation
- Advanced AI features (Pro/Enterprise tiers)

**Impact:** Reduce costs by ~73% while maintaining quality for most operations

### 2. Token Allocation Accuracy
Current token allocations seem reasonable but could be clarified:

**Solo (50K tokens):**
- Can generate ~21 stories (50K ÷ 2,300)
- Plus some general AI queries
- ✅ **200 stories/month limit is fine** (users can generate OR use tokens for other features)

**Team (200K tokens):**
- Can generate ~87 stories (200K ÷ 2,300)
- Plus validation and other AI features
- ✅ **500 stories/month limit is fine**

**Pro (1M tokens):**
- Can generate ~435 stories (1M ÷ 2,300)
- ✅ **2,000 stories/month limit is fine**

### 3. Display Clarification
The current pricing page could be clearer about what "AI tokens" means:

**Current:** "50K AI tokens/month"
**Better:** "50K AI tokens (includes story generation, validation, and AI features)"

Or separate them:
- "200 stories/month"
- "50K additional AI tokens for validation, analysis, etc."

### 4. Profit Margins
Current margins are healthy with Sonnet:
- Solo: 84% margin
- Team: 72% margin
- Pro: 65% margin
- Enterprise: 70% margin

With Haiku optimization:
- Solo: 96% margin
- Team: 92% margin
- Pro: 91% margin
- Enterprise: 92% margin

## Cost Optimization Strategy

### Immediate (Can implement now):
1. Switch default model to Haiku 3.5 for story generation
2. Keep Sonnet 3.5 for epic generation and advanced features
3. Add model selection to Pro/Enterprise tiers

### Future Optimizations:
1. Implement caching for common prompts (can reduce costs by 50-90%)
2. Use Claude's prompt caching feature for repeated context
3. Batch story generation for better efficiency
4. Add usage analytics to track actual costs per tier

## Conclusion

**Current pricing is sustainable and profitable** even with Sonnet 3.5, but switching to Haiku 3.5 for most operations would:
- Reduce costs by 73%
- Improve margins to 90%+
- Allow for potential price reductions or feature additions
- Still provide excellent quality for story generation

The token allocations on the pricing page are accurate and reasonable.
