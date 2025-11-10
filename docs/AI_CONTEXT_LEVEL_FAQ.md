# ❓ AI Context Level - Frequently Asked Questions

> **Comprehensive FAQ for customer support and end users**

---

## General Questions

### What is the AI Context Level feature?

The AI Context Level feature lets you control how much project context the AI uses when generating user stories. You can choose from four levels:

- **Minimal** (1 action, <5 sec) - Fast, generic generation
- **Standard** (2 actions, 5-10 sec) - Project-aware generation
- **Comprehensive** (2 actions, 10-20 sec) - Semantic search in epic
- **Thinking** (3 actions, 15-30 sec) - Deep reasoning for complex stories

Each level balances speed, quality, and AI action consumption differently.

---

### Which context level should I use?

**Use this decision tree:**

1. **Is it a simple story?** (bug fix, minor change) → **Minimal**
2. **Is it compliance/security?** (HIPAA, GDPR, SOC2) → **Thinking**
3. **Is it in an epic with 5+ stories?** → **Comprehensive**
4. **Everything else** → **Standard** (recommended)

**Rule of thumb:** Use Standard for 80% of your stories. It provides the best balance of quality and cost.

---

### What's the difference between the levels?

| Feature | Minimal | Standard | Comprehensive | Thinking |
|---------|---------|----------|---------------|----------|
| **Speed** | <5 sec | 5-10 sec | 10-20 sec | 15-30 sec |
| **AI Actions** | 1 | 2 | 2 | 3 |
| **Project Context** | ❌ | ✅ | ✅ | ✅ |
| **Semantic Search** | ❌ | ❌ | ✅ | ✅ |
| **Deep Reasoning** | ❌ | ❌ | ❌ | ✅ |
| **Epic Required** | ❌ | ❌ | ✅ | ✅ |
| **Best For** | Simple | Most stories | Complex | Compliance |

---

### How many AI actions do I get per month?

It depends on your subscription tier:

- **Starter** (Free): 25 actions/month
- **Core** (£10.99/mo): 400 actions/month
- **Pro** (£19.99/mo): 800 actions/month
- **Team** (£16.99/user): 15,000 actions/month
- **Enterprise** (Custom): 999,999 actions/month

---

### How many stories can I generate per month?

It depends on which context levels you use:

**Core Tier (400 actions):**
- 400 Minimal stories OR
- 200 Standard stories OR
- 200 Comprehensive stories OR
- ~150-180 mixed stories

**Pro Tier (800 actions):**
- 800 Minimal stories OR
- 400 Standard stories OR
- 400 Comprehensive stories OR
- ~300-350 mixed stories

**Team Tier (15,000 actions):**
- 15,000 Minimal stories OR
- 7,500 Standard stories OR
- 5,000 Thinking stories OR
- ~5,000-6,000 mixed stories

---

## Access & Permissions

### Why can't I access Standard/Comprehensive/Thinking mode?

Each subscription tier has access to different context levels:

| Your Tier | You Can Use |
|-----------|-------------|
| **Starter** | Minimal only |
| **Core** | Minimal + Standard |
| **Pro** | Minimal + Standard + Comprehensive |
| **Team** | All levels (including Thinking) |

**To unlock higher levels:** Upgrade your subscription at `/pricing`

---

### Why does it say "Requires Team plan"?

The **Thinking** mode (Comprehensive + Thinking) is exclusive to Team and Enterprise plans. This mode uses advanced AI reasoning for complex compliance, security, and regulatory stories.

**To access Thinking mode:** Upgrade to Team plan (£16.99/user/month)

---

### Can I try Thinking mode before upgrading?

Yes! We offer a **14-day free trial** of the Team plan. During the trial, you can test Thinking mode and all other features.

**Start your trial:** Visit `/pricing` and click "Start Free Trial"

---

## Epic Requirements

### Why does it say "Requires story to be in an epic"?

**Comprehensive** and **Thinking** modes perform semantic search across your epic to find similar stories. This requires the story to be assigned to an epic.

**Solution:** 
1. Assign your story to an epic using the "Epic" dropdown
2. Make sure the epic has at least 5 existing stories
3. Try generating again

---

### What if I don't have any epics?

If your project doesn't have epics yet:

1. **Create an epic first:**
   - Go to your project
   - Click "Create Epic"
   - Add a title and description
   - Save the epic

2. **Add stories to the epic:**
   - Create or move at least 5 stories into the epic
   - This gives the AI enough context for semantic search

3. **Then use Comprehensive/Thinking mode:**
   - Assign new story to the epic
   - Select Comprehensive or Thinking
   - Generate

**Alternative:** Use **Standard** mode instead - it doesn't require an epic.

---

### How many stories does an epic need?

**Minimum:** 5 stories with descriptions

**Why?** Semantic search needs enough context to find similar stories. With fewer than 5 stories, the results aren't reliable.

**Tip:** If your epic is new, use **Standard** mode until you have 5+ stories, then switch to **Comprehensive**.

---

## AI Actions & Quota

### How do I check my remaining AI actions?

**Three ways:**

1. **During story creation:** The context selector shows "X actions remaining"
2. **Billing dashboard:** Go to `/app/settings/billing` → AI Actions Usage
3. **Generation results:** After generating, see "Actions used: X / Y"

---

### What happens when I run out of AI actions?

When you've used all your monthly actions:

1. **You'll see an error:** "🚫 Monthly AI action limit reached"
2. **Generation is blocked** until your quota resets
3. **You have two options:**
   - **Wait** for the monthly reset (shown in billing dashboard)
   - **Upgrade** to a higher tier with more actions

**Your existing stories are not affected** - you just can't generate new ones until reset.

---

### When do my AI actions reset?

AI actions reset on the **1st of each month** at midnight UTC.

**To check your reset date:** Go to `/app/settings/billing` → AI Actions Usage

**Example:** If you signed up on January 15th, your actions reset on February 1st, March 1st, etc.

---

### What is the "near-limit warning"?

When you've used **90% of your monthly actions**, you'll see a warning:

> ⚠️ You're running low on AI actions  
> 50 actions remaining this month  
> Resets on December 1st

**Why?** This helps you plan ahead and avoid hitting your limit unexpectedly.

**What to do:**
- Use **Minimal** mode to conserve actions
- Upgrade to a higher tier
- Wait for the monthly reset

---

### Do AI actions roll over to the next month?

**No, AI actions do not roll over.** Unused actions expire at the end of each month.

**Exception:** If you purchase additional action packs (coming soon), those may have different rollover rules.

---

## Generation Issues

### Why is generation taking longer than expected?

**Normal generation times:**
- Minimal: <5 seconds
- Standard: 5-10 seconds
- Comprehensive: 10-20 seconds
- Thinking: 15-30 seconds

**If it's taking longer:**

1. **Check OpenRouter API status:** The AI service might be experiencing delays
2. **Check your internet connection:** Slow connection can delay results
3. **Wait a moment:** Complex stories may take longer
4. **Try again:** If it times out, click "Generate" again

**Still having issues?** Contact support@synqforge.com

---

### Why did generation fail?

**Common reasons:**

1. **API timeout:** The AI service didn't respond in time
   - **Solution:** Try generating again

2. **Invalid input:** Description is too short or unclear
   - **Solution:** Provide more detail (minimum 20 characters)

3. **No project context:** Project settings incomplete
   - **Solution:** Define project roles and terminology in settings

4. **Network error:** Connection interrupted
   - **Solution:** Check internet connection and retry

5. **Quota exceeded:** Out of AI actions
   - **Solution:** Wait for reset or upgrade

**Error message will tell you the specific issue.**

---

### Why doesn't the output use my project terminology?

**If using Minimal mode:**
- Minimal mode doesn't use project context
- **Solution:** Use **Standard** or higher

**If using Standard/Comprehensive/Thinking:**
1. **Check project settings:**
   - Go to Project Settings → Roles & Terminology
   - Make sure roles and terms are defined
   - Save changes

2. **Try generating again:**
   - The AI should now use your terminology

**Still not working?** Contact support with:
- Your project ID
- The story you generated
- What terminology you expected

---

### Why doesn't Comprehensive mode find similar stories?

**Common reasons:**

1. **Epic has fewer than 5 stories**
   - **Solution:** Add more stories to the epic first

2. **Existing stories lack descriptions**
   - **Solution:** Add descriptions to existing stories

3. **Stories are too different**
   - Semantic search looks for similar themes
   - If your new story is very different, it may not find matches
   - **This is normal** - the AI will still generate a quality story

4. **Story not assigned to epic**
   - **Solution:** Assign to epic before generating

---

## Quality & Output

### How can I improve the quality of generated stories?

**Tips for better results:**

1. **Use the right context level:**
   - Simple stories → Minimal
   - Most stories → Standard
   - Complex stories → Comprehensive
   - Compliance/security → Thinking

2. **Provide detailed input:**
   - Be specific about what you want
   - Include user role, action, and benefit
   - Mention technical requirements if relevant

3. **Set up project context:**
   - Define roles in project settings
   - Add project-specific terminology
   - Maintain example stories in epics

4. **Use Comprehensive mode for consistency:**
   - Assign story to epic with similar stories
   - AI will match the style and patterns

5. **Choose the right template:**
   - Standard for general stories
   - BDD for behavior-driven development
   - Technical for technical specifications
   - etc.

---

### Can I edit the generated story?

**Yes!** After generation, you can edit:

- Title
- Description
- Acceptance criteria (add, remove, or modify)
- Story points
- Priority
- Epic assignment
- Any other fields

**The generated story is a starting point** - feel free to customize it to your needs.

---

### Why does the same input produce different outputs?

**This is normal and expected.** The AI uses:

1. **Probabilistic generation:** Each generation is unique
2. **Context changes:** If you've added stories or changed settings, context changes
3. **Different context levels:** Minimal vs. Standard vs. Comprehensive produce different results

**To get consistent results:**
- Use the same context level
- Generate from the same epic
- Keep project settings stable

---

### How accurate are the token estimates?

Token estimates are **within ±20% of actual usage** for most stories.

**Factors that affect accuracy:**
- Input complexity
- Project context size
- Number of similar stories found
- Template used

**Why estimates matter:**
- Helps you plan AI action usage
- Transparency in costs
- Budget management

**Actual token usage is shown after generation.**

---

## Pricing & Billing

### Why does Comprehensive cost the same as Standard?

Both use **2 AI actions** because we want to encourage quality.

**Comprehensive mode:**
- Performs semantic search (more complex)
- Finds top 5 similar stories
- Provides better consistency

**But we keep the cost the same** to make it accessible to Pro tier users.

**Thinking mode costs 3 actions** because it uses advanced reasoning that requires more AI processing.

---

### Is Thinking mode worth 3 actions?

**For the right use cases, absolutely!**

**Use Thinking mode for:**
- ✅ HIPAA compliance stories
- ✅ GDPR data privacy features
- ✅ SOC2 security controls
- ✅ Financial regulations
- ✅ Complex security features
- ✅ Edge case analysis

**Don't use Thinking mode for:**
- ❌ Simple CRUD operations
- ❌ Bug fixes
- ❌ Standard features
- ❌ UI tweaks

**ROI:** A single Thinking-generated compliance story can save hours of manual work researching regulations and edge cases.

---

### Can I buy additional AI actions?

**Currently:** AI actions are included in your subscription tier.

**Coming soon:** We're planning action packs you can purchase if you need more than your monthly limit.

**For now:** Upgrade to a higher tier if you need more actions.

---

### What happens if I downgrade my plan?

**If you downgrade (e.g., Pro → Core):**

1. **Access changes immediately:**
   - You lose access to higher context levels
   - Comprehensive mode becomes locked
   - Thinking mode becomes locked (if applicable)

2. **AI actions adjust:**
   - Your monthly limit decreases
   - Current usage carries over
   - If you're over the new limit, you can't generate until reset

3. **Existing stories are unaffected:**
   - All previously generated stories remain
   - You just can't generate new ones at higher levels

**Recommendation:** Time downgrades for the start of your billing cycle.

---

## Technical Questions

### How does semantic search work?

**Comprehensive and Thinking modes use semantic search:**

1. **Embedding generation:** Your story description is converted to a vector
2. **Similarity search:** The AI finds the top 5 most similar stories in your epic
3. **Context injection:** Similar stories are included in the AI prompt
4. **Pattern matching:** The AI generates a story that matches the patterns

**Result:** Consistent style, terminology, and structure across your epic.

---

### What AI model does SynqForge use?

SynqForge uses **OpenRouter** to access multiple AI models:

- **Standard models** for Minimal/Standard/Comprehensive
- **Advanced reasoning models** for Thinking mode

**Why OpenRouter?**
- Access to best-in-class models
- Automatic failover if one model is down
- Cost optimization
- Regular model updates

---

### Is my data used to train AI models?

**No.** Your project data is:

- ✅ **Private** - Only used for your generations
- ✅ **Secure** - Encrypted in transit and at rest
- ✅ **Not shared** - Never used to train public AI models
- ✅ **Compliant** - GDPR and data protection compliant

**OpenRouter policy:** Data sent through OpenRouter is not used for model training.

---

### Can I use my own OpenAI API key?

**Currently:** No, SynqForge uses OpenRouter with our API keys.

**Why?** This ensures:
- Consistent quality
- Rate limiting and abuse prevention
- Fair usage across all users
- Simplified billing

**Future:** We may offer "bring your own key" for Enterprise plans.

---

## Troubleshooting

### Error: "Requires story to be in an epic"

**Solution:**
1. Assign your story to an epic using the dropdown
2. Make sure the epic has at least 5 stories
3. Try generating again

**Alternative:** Use **Standard** mode instead (doesn't require epic)

---

### Error: "Insufficient AI actions"

**Solution:**
1. **Check remaining actions:** Go to `/app/settings/billing`
2. **Wait for reset:** Actions reset on the 1st of each month
3. **Use lower context level:** Try Minimal instead of Standard
4. **Upgrade:** Get more actions with a higher tier

---

### Error: "🔒 Requires Team plan"

**Solution:**
1. **Upgrade to Team plan:** Visit `/pricing`
2. **Or use Comprehensive instead:** Still great quality, just 2 actions

**Team plan benefits:**
- Thinking mode (3 actions)
- 15,000 actions/month
- Team collaboration features
- Priority support

---

### Error: "No epics available"

**Solution:**
1. **Create an epic:**
   - Go to your project
   - Click "Create Epic"
   - Add title and description
   - Save

2. **Then try Comprehensive/Thinking again**

**Alternative:** Use **Standard** mode (doesn't require epic)

---

### Generation is stuck on "Generating..."

**If it's been more than 30 seconds:**

1. **Wait a bit longer:** Thinking mode can take up to 30 seconds
2. **Check your internet:** Make sure you're connected
3. **Refresh the page:** Your AI actions won't be charged if generation didn't complete
4. **Try again:** Click "Generate Story" again

**Still stuck?** Contact support@synqforge.com with:
- Your account email
- Project ID
- Screenshot of the stuck state

---

### I was charged AI actions but got an error

**Don't worry!** AI actions are only deducted when generation **succeeds**.

**If generation fails:**
- ✅ No actions are charged
- ✅ Your quota is unchanged
- ✅ You can try again

**If you believe you were incorrectly charged:**
1. Check `/app/settings/billing` → Usage History
2. Contact support@synqforge.com with:
   - Your account email
   - Date/time of the error
   - Screenshot of the error

We'll investigate and refund if appropriate.

---

## Best Practices

### How should I structure my input?

**Good input format:**
```
As a [specific role], I want to [specific action] 
so that [clear benefit/outcome]
```

**Examples:**

✅ **Good:**
"As a registered user, I want to reset my password via email so that I can regain access if I forget my credentials"

❌ **Too vague:**
"Password reset"

✅ **Good:**
"As a healthcare admin, I want to ensure HIPAA-compliant data encryption so that patient records meet federal regulations"

❌ **Too vague:**
"Make it secure"

**Tips:**
- Be specific about the user role
- Describe the action clearly
- Explain the benefit or outcome
- Include technical requirements if relevant
- Minimum 20 characters, but more detail = better results

---

### Should I use Comprehensive for every story?

**No.** Use the right level for each story:

**Use Comprehensive when:**
- ✅ Story is part of an established epic
- ✅ Consistency with existing stories is critical
- ✅ You need dependency detection
- ✅ Epic has 5+ similar stories

**Use Standard when:**
- ✅ Most user stories (80% of cases)
- ✅ New epics with few stories
- ✅ Standalone features
- ✅ You want good quality at lower cost

**Use Minimal when:**
- ✅ Quick drafts
- ✅ Simple bug fixes
- ✅ Generic features
- ✅ Conserving AI actions

---

### How can I optimize my AI action usage?

**Strategies:**

1. **Use the right level for each story:**
   - Don't use Comprehensive for simple stories
   - Don't use Thinking for non-compliance stories

2. **Batch similar stories:**
   - Generate multiple stories in one epic
   - Comprehensive mode benefits from more context

3. **Edit instead of regenerate:**
   - Tweak the generated story instead of generating again
   - Saves actions

4. **Use Minimal for drafts:**
   - Generate with Minimal first
   - Refine manually
   - Only use higher levels for final version

5. **Set up project context:**
   - Well-defined roles and terminology
   - Reduces need for regeneration

6. **Monitor usage:**
   - Check billing dashboard regularly
   - Adjust strategy if approaching limit

---

### What's the best context level for my team?

**It depends on your needs:**

**Small team, tight budget:**
- **Core tier** (£10.99/mo, 400 actions)
- Use Standard for most stories
- Reserve Comprehensive for critical features
- ~150-200 stories/month

**Quality-focused team:**
- **Pro tier** (£19.99/mo, 800 actions)
- Use Standard as default
- Use Comprehensive for epics
- ~300-400 stories/month

**Large team, high volume:**
- **Team tier** (£16.99/user, 15,000 actions)
- Use all context levels
- Thinking mode for compliance
- ~5,000-6,000 stories/month

**Enterprise needs:**
- **Enterprise tier** (custom pricing)
- Unlimited usage
- Custom integrations
- Dedicated support

---

## Contact & Support

### How do I get help?

**For technical issues:**
- GitHub Issues: [github.com/synqforge/synqforge/issues](https://github.com/synqforge/synqforge/issues)
- Email: support@synqforge.com

**For feature questions:**
- Email: product@synqforge.com
- Help Center: [synqforge.com/help](https://synqforge.com/help)

**For sales inquiries:**
- Email: sales@synqforge.com
- Book a demo: [synqforge.com/demo](https://synqforge.com/demo)

**For billing issues:**
- Email: billing@synqforge.com
- Billing dashboard: `/app/settings/billing`

---

### Where can I find more documentation?

**AI Context Level docs:**
- [Quick Reference Guide](AI_CONTEXT_LEVEL_QUICK_REFERENCE.md)
- [Production Validation Guide](AI_CONTEXT_LEVEL_PRODUCTION_VALIDATION.md)
- [Demo Script](AI_CONTEXT_LEVEL_DEMO_SCRIPT.md)
- [Documentation Index](AI_CONTEXT_LEVEL_INDEX.md)

**General SynqForge docs:**
- [Complete Features Overview](../COMPLETE_FEATURES_OVERVIEW.md)
- [Product Dossier](product_dossier.md)
- [AI Story Generation User Journey](AI_STORY_GENERATION_USER_JOURNEY.md)

---

### Can I request a new feature?

**Yes!** We love feature requests.

**How to request:**
1. Email: product@synqforge.com
2. Include:
   - What you want to do
   - Why it's important
   - How you'd use it
   - Any examples

**We review all requests** and prioritize based on:
- User demand
- Technical feasibility
- Strategic fit
- Impact on existing features

---

## Glossary

**AI Action:** A unit of AI usage. Different context levels consume different numbers of actions.

**Context Level:** How much project context the AI uses when generating stories (Minimal, Standard, Comprehensive, Thinking).

**Epic:** A large body of work that can be broken down into user stories. Required for Comprehensive and Thinking modes.

**Semantic Search:** AI technique that finds similar stories based on meaning, not just keywords.

**Token:** A unit of text processed by the AI. Roughly 4 characters = 1 token.

**INVEST:** Acronym for good user story criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable).

**Acceptance Criteria:** Conditions that must be met for a story to be considered complete.

**Story Points:** Relative estimate of effort required to complete a story.

---

**Last Updated:** November 9, 2025  
**Version:** 1.0

**Have a question not answered here?** Contact support@synqforge.com

