# 🚀 AI Context Level - Quick Reference Guide

## At a Glance

| Level | Actions | Speed | Epic Required | Best For |
|-------|---------|-------|---------------|----------|
| **Minimal** | 1× | <5s | ❌ | Simple stories, quick drafts |
| **Standard** | 2× | 5-10s | ❌ | Most stories (recommended) |
| **Comprehensive** | 2× | 10-20s | ✅ | Complex stories needing epic context |
| **Thinking** | 3× | 15-30s | ✅ | Compliance, security, regulations |

---

## Tier Access Matrix

|  | Starter | Core | Pro | Team |
|--|---------|------|-----|------|
| **Minimal** | ✅ | ✅ | ✅ | ✅ |
| **Standard** | ❌ | ✅ | ✅ | ✅ |
| **Comprehensive** | ❌ | ❌ | ✅ | ✅ |
| **Thinking** | ❌ | ❌ | ❌ | ✅ |

---

## Monthly Action Limits

- **Starter:** 25 actions (free)
- **Core:** 400 actions (£10.99/mo)
- **Pro:** 800 actions (£19.99/mo)
- **Team:** 15,000 actions (£16.99/user)
- **Enterprise:** 999,999 actions (custom)

---

## Context Level Details

### 🔹 Minimal (1 action)
**What it does:**
- Basic story generation
- INVEST rating
- Generic acceptance criteria

**What it doesn't do:**
- No project context
- No role/terminology awareness
- No similar story search

**When to use:**
- Quick drafts
- Simple, generic stories
- When conserving AI actions

---

### 🔹 Standard (2 actions) - RECOMMENDED
**What it does:**
- Uses project roles & terminology
- References example stories
- Applies common constraints
- Consistent formatting

**What it doesn't do:**
- No semantic search
- No epic-level context
- No dependency detection

**When to use:**
- Most user stories
- When you want project-specific context
- Default choice for quality + speed balance

---

### 🔹 Comprehensive (2 actions)
**What it does:**
- All Standard features
- Semantic search (top 5 similar stories)
- Epic-level constraints
- Dependency detection
- Pattern matching from similar stories

**Requirements:**
- ⚠️ Story must be assigned to an epic
- Epic must have 5+ existing stories

**When to use:**
- Complex stories needing epic context
- When consistency with existing stories is critical
- Feature enhancements in established epics

---

### 🔹 Comprehensive + Thinking (3 actions)
**What it does:**
- All Comprehensive features
- Deep reasoning mode
- Complex edge case analysis
- Compliance/security considerations
- Regulatory framework awareness

**Requirements:**
- ⚠️ Story must be assigned to an epic
- 🔒 Team plan required

**When to use:**
- Compliance stories (HIPAA, GDPR, SOC2)
- Security features
- Complex technical specifications
- Regulatory requirements

---

## Cost Calculator

### Stories per Month by Tier

**Core Tier (400 actions):**
- 400 Minimal stories
- 200 Standard stories
- 200 Comprehensive stories
- Mix: ~150-180 stories

**Pro Tier (800 actions):**
- 800 Minimal stories
- 400 Standard stories
- 400 Comprehensive stories
- Mix: ~300-350 stories

**Team Tier (15,000 actions):**
- 15,000 Minimal stories
- 7,500 Standard stories
- 7,500 Comprehensive stories
- 5,000 Thinking stories
- Mix: ~5,000-6,000 stories

---

## Common Scenarios

### Scenario 1: New Feature in Existing Epic
**Recommended:** Comprehensive (2 actions)
- Finds similar stories in epic
- Maintains consistency
- Detects dependencies

### Scenario 2: Simple Bug Fix Story
**Recommended:** Minimal (1 action)
- Fast generation
- No context needed
- Conserves actions

### Scenario 3: Security Feature
**Recommended:** Thinking (3 actions)
- Deep reasoning
- Edge case analysis
- Compliance considerations

### Scenario 4: Standard CRUD Feature
**Recommended:** Standard (2 actions)
- Project-specific context
- Good quality
- Balanced cost

---

## Error Messages & Solutions

### "Comprehensive mode requires story to be in an epic"
**Solution:** Assign story to an epic before selecting Comprehensive or Thinking

### "Insufficient AI actions. Need X, have Y remaining"
**Solution:** 
- Wait for monthly reset
- Use lower context level
- Upgrade to higher tier

### "🔒 Comprehensive + Thinking requires Team plan"
**Solution:** Upgrade to Team plan (£16.99/user/month)

### "No epics available. Create an epic first"
**Solution:** Create an epic in your project before using Comprehensive/Thinking

---

## Tips & Best Practices

### 💡 Optimize Your AI Action Budget
1. Use **Minimal** for simple stories and drafts
2. Use **Standard** as your default (best balance)
3. Reserve **Comprehensive** for complex stories in established epics
4. Use **Thinking** only for compliance/security stories

### 💡 When to Use Each Level
- **Minimal:** Bug fixes, simple features, quick drafts
- **Standard:** Most user stories (80% of use cases)
- **Comprehensive:** Feature enhancements, complex flows
- **Thinking:** Compliance, security, regulatory features

### 💡 Maximize Quality
- Define project roles and terminology in settings
- Maintain 5+ example stories per epic
- Use consistent formatting in existing stories
- Provide detailed input for complex stories

### 💡 Track Your Usage
- Check billing dashboard regularly
- Monitor near-limit warnings (90% threshold)
- Review usage breakdown by context level
- Adjust strategy if approaching limit

---

## Quick Decision Tree

```
Start: Need to generate a story
│
├─ Is it a simple story? (bug fix, minor change)
│  └─ YES → Use MINIMAL (1 action)
│
├─ Is it a compliance/security story?
│  └─ YES → Use THINKING (3 actions, Team plan required)
│
├─ Is it part of an established epic with 5+ stories?
│  └─ YES → Use COMPREHENSIVE (2 actions)
│
└─ Default → Use STANDARD (2 actions)
```

---

## API Response Examples

### Success Response (Standard)
```json
{
  "success": true,
  "story": {
    "title": "User Password Reset",
    "description": "As a user, I want to...",
    "acceptanceCriteria": ["...", "..."],
    "storyPoints": 3,
    "priority": "medium"
  },
  "meta": {
    "actionsUsed": 2,
    "actionsRemaining": 798,
    "contextLevel": "standard",
    "tokensUsed": 3200,
    "generationTime": 8.5
  }
}
```

### Error Response (Insufficient Actions)
```json
{
  "error": "Insufficient AI actions",
  "message": "Need 2 actions, have 1 remaining",
  "actionsRemaining": 1,
  "resetDate": "2025-12-01T00:00:00Z",
  "upgradeUrl": "/pricing"
}
```

### Error Response (Access Denied)
```json
{
  "error": "Access denied",
  "message": "Upgrade to Pro (£19.99/mo) to use Comprehensive mode",
  "upgradeRequired": true,
  "currentTier": "core",
  "requiredTier": "pro"
}
```

---

## Keyboard Shortcuts

- `Tab` - Navigate between context levels
- `Enter` - Select context level
- `Esc` - Close context level details
- `?` - Show help tooltip

---

## Support Resources

- **Documentation:** `/docs/AI_CONTEXT_LEVEL_PRODUCTION_VALIDATION.md`
- **Pricing:** `https://synqforge.com/pricing`
- **Billing Dashboard:** `/app/settings/billing`
- **Help Center:** `https://synqforge.com/help`

---

**Last Updated:** November 9, 2025  
**Version:** 1.0

