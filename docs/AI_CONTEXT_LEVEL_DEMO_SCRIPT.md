# 🎯 AI Context Level Feature - Demo Script for Stakeholders

## Demo Overview

**Duration:** 5 minutes  
**Audience:** Stakeholders, investors, product team, customers  
**Goal:** Demonstrate how AI Context Level feature provides flexibility and value across all subscription tiers

---

## Pre-Demo Setup Checklist

- [ ] Test account with Pro or Team plan (to show all features)
- [ ] Test project with:
  - [ ] 3 epics created
  - [ ] 5+ stories in "Authentication" epic
  - [ ] Project roles defined (Admin, User, Customer)
  - [ ] Project terminology configured
- [ ] AI actions: 800 available
- [ ] Browser: Chrome (latest)
- [ ] Screen recording tool ready (optional)
- [ ] Presentation mode enabled (hide dev tools)

---

## Demo Script

### Slide 1: Introduction (30 seconds)

**What to Say:**
> "Today I'm going to show you SynqForge's AI Context Level feature. This gives you complete control over how much project context the AI uses when generating user stories. You can balance speed, quality, and AI action consumption based on your needs."

**What to Show:**
- SynqForge dashboard
- Navigate to project
- Click "Create New Story"

**Key Points:**
- ✅ User controls AI context depth
- ✅ 4 levels from fastest to most advanced
- ✅ Transparent action costs

---

### Slide 2: Minimal Context - Speed (1 minute)

**What to Say:**
> "Let's start with Minimal mode. This is our fastest option—just 1 AI action, under 5 seconds. Perfect for simple stories where you don't need project-specific context. Watch how quickly this generates."

**What to Do:**
1. Enter test input: "As a user, I want to reset my password so that I can regain access to my account"
2. Select **Minimal** context level
3. Highlight: "1 AI action" badge
4. Click "Generate Story"
5. **Wait for generation** (should be <5 seconds)

**What to Show:**
- Generation speed (<5 sec)
- Generic output (no project-specific terms)
- Basic acceptance criteria (3-5 items)
- AI action counter decreases by 1

**Key Points:**
- ✅ Fastest generation
- ✅ Lowest cost (1 action)
- ✅ Generic, reusable output
- ✅ Great for simple stories

**Expected Output:**
```
Title: Password Reset Feature
Description: As a user, I want to reset my password...

Acceptance Criteria:
- User can request password reset via email
- Reset link is sent to registered email address
- Reset link expires after 24 hours
- User can set new password meeting security requirements
```

---

### Slide 3: Standard Context - Recommended (1 minute)

**What to Say:**
> "Now let's try Standard mode—this is our recommended option. It uses 2 AI actions and takes 5-10 seconds. The difference? It pulls in your project's roles, terminology, and example stories. Watch how the output becomes project-specific."

**What to Do:**
1. Click "Generate Another" or create new story
2. Enter same test input
3. Select **Standard** context level
4. Highlight: "Recommended" badge
5. Click "Generate Story"
6. **Wait for generation** (5-10 seconds)

**What to Show:**
- Project-specific roles mentioned (Admin, Customer)
- Project terminology used
- More detailed acceptance criteria
- Consistent formatting with existing stories
- AI action counter decreases by 2

**Key Points:**
- ✅ Project-aware output
- ✅ Uses your terminology
- ✅ Consistent with existing stories
- ✅ Best balance of speed and quality

**Expected Output:**
```
Title: User Password Reset with Email Verification
Description: As a registered user, I want to securely reset my password...

Acceptance Criteria:
- User clicks "Forgot Password" on login page
- System validates email exists in [ProjectName] database
- Password reset email sent using [EmailService] template
- Reset link includes secure token (expires in 24 hours)
- User sets new password meeting [PasswordPolicy] requirements
- System logs password reset event for Admin audit trail
```

**What to Highlight:**
- Point out project-specific terms: "[ProjectName]", "[EmailService]", "[PasswordPolicy]"
- Show how it references "Admin" role
- Compare to Minimal output (side-by-side if possible)

---

### Slide 4: Comprehensive Context - Semantic Search (1.5 minutes)

**What to Say:**
> "Here's where it gets powerful. Comprehensive mode performs semantic search across your epic to find the top 5 most similar stories. It mirrors their patterns and maintains consistency. This requires the story to be in an epic, but it's still just 2 AI actions."

**What to Do:**
1. Create new story
2. **First, try WITHOUT epic assigned:**
   - Select **Comprehensive** context level
   - Show error: "Requires story to be in an epic"
3. **Then, assign to "Authentication" epic**
4. Select **Comprehensive** context level
5. Highlight: "Best Quality" badge
6. Click "Generate Story"
7. **Wait for generation** (10-20 seconds)
8. Click "Show details" to reveal similar stories found

**What to Show:**
- Epic requirement (error first, then success)
- Semantic search in action
- Top 5 similar stories referenced
- Output style matches epic stories
- Dependency detection
- AI action counter decreases by 2

**Key Points:**
- ✅ Semantic search finds similar stories
- ✅ Maintains epic consistency
- ✅ Detects dependencies
- ✅ Same cost as Standard (2 actions)
- ✅ Requires epic assignment

**Expected Output:**
```
Title: Secure Password Reset Flow with Multi-Factor Verification
Description: As a registered user, I want to reset my password through 
a secure multi-step process...

Acceptance Criteria:
- User initiates password reset from login page
- System verifies email and sends 6-digit verification code
- Code expires after 15 minutes (consistent with Epic: Authentication)
- User enters code and is prompted for new password
- Password must meet complexity requirements (min 12 chars)
- System validates new password doesn't match last 5 passwords
- Two-factor authentication is re-enabled after reset
- Security team receives notification for admin accounts
- Audit log captures timestamp, IP address, and user agent

Similar Stories Referenced:
- #142: Two-Factor Authentication Setup
- #156: Email Verification Flow
- #189: Session Management
```

**What to Highlight:**
- Show "Similar Stories Referenced" section
- Point out consistency with epic patterns (e.g., "15 minutes" matches other stories)
- Highlight dependency detection (2FA, audit logging)

---

### Slide 5: Comprehensive + Thinking - Expert Mode (1 minute)

**What to Say:**
> "Finally, we have Comprehensive + Thinking—our expert mode for complex stories. This uses deep reasoning to handle compliance, security, and regulatory requirements. It's 3 AI actions and requires a Team plan. Let me show you what makes it special."

**What to Do:**

**Option A: If using Free/Core/Pro account (show upgrade gate):**
1. Create new story
2. Enter complex input: "As a healthcare admin, I want to ensure HIPAA-compliant data encryption"
3. Assign to epic
4. Select **Comprehensive + Thinking**
5. Show upgrade prompt: "🔒 Requires Team plan"
6. Highlight pricing: "£16.99/user/month"
7. Click "View Pricing" (optional)

**Option B: If using Team account (show full feature):**
1. Create new story
2. Enter complex input: "As a healthcare admin, I want to ensure HIPAA-compliant data encryption"
3. Assign to epic
4. Select **Comprehensive + Thinking**
5. Highlight: "Expert Mode" badge
6. Click "Generate Story"
7. **Wait for generation** (15-30 seconds)
8. Show advanced output with compliance language

**What to Show:**

**Option A (Upgrade Gate):**
- Clear upgrade prompt
- Pricing information
- Feature locked until upgrade
- No actions consumed

**Option B (Team Plan):**
- Deep reasoning output
- Compliance-specific language (HIPAA, GDPR)
- Advanced edge case analysis
- Security considerations
- Regulatory framework references
- AI action counter decreases by 3

**Key Points:**
- ✅ Deep reasoning for complex stories
- ✅ Compliance and security focus
- ✅ Advanced edge case handling
- ✅ Team plan exclusive (monetization)
- ✅ Worth the 3 AI actions for critical stories

**Expected Output (Team Plan):**
```
Title: HIPAA-Compliant Patient Data Encryption System
Description: As a healthcare administrator, I want to implement 
end-to-end encryption for all patient health records...

Acceptance Criteria:
- All PHI encrypted at rest using AES-256
- Data encrypted in transit using TLS 1.3 or higher
- Encryption keys managed via FIPS 140-2 compliant HSM
- Key rotation occurs every 90 days (HIPAA requirement)
- Access logs maintained for minimum 6 years (HIPAA retention)
- Breach notification process triggers if encryption fails

Security Considerations:
- Zero-knowledge architecture prevents admin access to unencrypted data
- Multi-factor authentication required for key management access
- Compliance with HIPAA Security Rule § 164.312(a)(2)(iv)

Edge Cases:
- Legacy data migration: encrypt existing unencrypted records
- Key compromise: immediate re-encryption with new keys
- Third-party integrations: verify vendor BAA
```

**What to Highlight:**
- Sophisticated compliance language
- Specific regulatory references (HIPAA Security Rule §)
- Edge case analysis
- Security considerations section

---

### Slide 6: Wrap-up - Usage Dashboard (30 seconds)

**What to Say:**
> "Every generation is tracked in your billing dashboard. You can see exactly how many actions you've used, what context levels you're using most, and when your quota resets. This transparency helps you optimize your AI usage and budget."

**What to Do:**
1. Navigate to `/app/settings/billing`
2. Show AI Actions Usage Dashboard

**What to Show:**
- Total actions used vs. limit
- Breakdown by context level:
  - Minimal: X actions
  - Standard: X actions
  - Comprehensive: X actions
  - Thinking: X actions
- Actions remaining
- Reset date
- Usage progress bar

**Key Points:**
- ✅ Complete transparency
- ✅ Real-time tracking
- ✅ Usage breakdown by level
- ✅ Clear reset date
- ✅ Near-limit warnings

---

## Demo Summary Slide

**What to Say:**
> "To summarize: SynqForge's AI Context Level feature gives you four options—from fast and simple to deep and sophisticated. You control the balance of speed, quality, and cost. And with transparent tracking, you always know where you stand."

**Key Takeaways:**
1. **Flexibility:** 4 context levels for different use cases
2. **Control:** You decide how much AI power to use
3. **Transparency:** Clear action costs and usage tracking
4. **Value:** From free Starter plan to advanced Team features
5. **Quality:** Each level delivers appropriate output for its use case

---

## Pricing Comparison (Optional Slide)

| Tier | Price | Monthly Actions | Context Levels | Best For |
|------|-------|----------------|----------------|----------|
| **Starter** | £0 | 25 | Minimal only | Trying SynqForge |
| **Core** | £10.99 | 400 | Minimal + Standard | Small teams |
| **Pro** | £19.99 | 800 | + Comprehensive | Quality-focused teams |
| **Team** | £16.99/user | 15,000 | + Thinking | Large teams, compliance |

**What to Say:**
> "Pricing scales with your needs. Starter is free to get started. Core and Pro unlock more context levels. And Team gives you massive volume plus expert mode for compliance and security stories."

---

## Q&A Preparation

### Common Questions

**Q: How accurate is the token estimation?**
> A: Token estimates are within ±20% of actual usage. We continuously refine these based on real-world data.

**Q: Can I mix context levels in one project?**
> A: Absolutely! Use Minimal for simple stories, Standard for most, and Comprehensive for complex features. You control it per story.

**Q: What happens if I run out of AI actions?**
> A: You'll see a clear warning at 90% usage. When you hit your limit, you can wait for the monthly reset or upgrade to a higher tier.

**Q: Why does Comprehensive cost the same as Standard?**
> A: We want to encourage quality. Comprehensive uses semantic search but we've optimized it to cost the same 2 actions as Standard.

**Q: Is Thinking mode worth 3 actions?**
> A: For compliance, security, or regulatory stories, absolutely. The deep reasoning and edge case analysis save hours of manual work.

**Q: Can I try Thinking mode before upgrading to Team?**
> A: We offer a 14-day free trial of Team plan. You can test Thinking mode during the trial period.

---

## Demo Tips

### Before the Demo
- [ ] Test the entire flow beforehand
- [ ] Have backup test inputs ready
- [ ] Clear browser cache for clean demo
- [ ] Close unnecessary tabs/windows
- [ ] Disable notifications
- [ ] Have pricing page ready in another tab

### During the Demo
- [ ] Speak slowly and clearly
- [ ] Pause after each generation to let audience absorb
- [ ] Point out specific differences between levels
- [ ] Use cursor/pointer to highlight key elements
- [ ] Acknowledge generation time (don't rush)
- [ ] Show enthusiasm for the feature

### After the Demo
- [ ] Ask for questions
- [ ] Offer hands-on trial
- [ ] Share documentation links
- [ ] Collect feedback
- [ ] Follow up with demo recording

---

## Backup Scenarios

### If API is Slow
> "The AI is taking a moment to perform semantic search across all stories in the epic. This thoroughness is what makes Comprehensive mode so powerful."

### If Generation Fails
> "Let me try that again. We have retry logic built in for reliability."
> (Have a pre-generated story screenshot as backup)

### If Asked About Competitors
> "Most tools offer one-size-fits-all AI generation. SynqForge gives you control—choose the right level of AI power for each story."

---

## Success Metrics

After the demo, track:
- [ ] Audience engagement (questions asked)
- [ ] Feature comprehension (can they explain it back?)
- [ ] Upgrade interest (pricing page visits)
- [ ] Trial signups (within 24 hours)
- [ ] Feedback sentiment (positive/neutral/negative)

---

## Follow-Up Materials

Send after the demo:
- [ ] Link to this documentation
- [ ] Quick reference guide
- [ ] Pricing page link
- [ ] Trial signup link
- [ ] Calendar invite for Q&A session

---

## Demo Variations

### For Technical Audience (Developers)
- Focus on semantic search algorithm
- Show token usage details
- Explain API rate limiting
- Discuss context window optimization

### For Business Audience (Executives)
- Focus on ROI and cost savings
- Highlight tier pricing and scalability
- Show usage analytics
- Discuss team productivity gains

### For Customer Success (End Users)
- Focus on ease of use
- Show practical examples
- Emphasize quality improvements
- Demonstrate time savings

---

**Demo Script Version:** 1.0  
**Last Updated:** November 9, 2025  
**Next Review:** Post-launch feedback

