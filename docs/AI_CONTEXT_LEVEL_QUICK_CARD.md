# 🎯 AI Context Level - Quick Reference Card

> **Print this page for quick reference during testing or demos**

---

## The Four Levels

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔹 MINIMAL                                          1 AI Action │
│    ⚡ <5 seconds | 🎯 Fast & generic                           │
│    ✅ Basic generation, INVEST rating                           │
│    ❌ No project context                                        │
│    💡 Use for: Simple stories, quick drafts                     │
├─────────────────────────────────────────────────────────────────┤
│ 🔹 STANDARD ⭐ RECOMMENDED                          2 AI Actions │
│    ⚡ 5-10 seconds | 🎯 Project-aware                           │
│    ✅ Project roles, terminology, example stories               │
│    ❌ No semantic search                                        │
│    💡 Use for: Most user stories (80% of cases)                 │
├─────────────────────────────────────────────────────────────────┤
│ 🔹 COMPREHENSIVE                                    2 AI Actions │
│    ⚡ 10-20 seconds | 🎯 Epic context + semantic search         │
│    ✅ Top 5 similar stories, dependency detection               │
│    ⚠️  Requires: Story in epic with 5+ stories                  │
│    💡 Use for: Complex features in established epics            │
├─────────────────────────────────────────────────────────────────┤
│ 🔹 THINKING 🔒 Team Plan                            3 AI Actions │
│    ⚡ 15-30 seconds | 🎯 Deep reasoning                         │
│    ✅ Compliance, security, edge case analysis                  │
│    ⚠️  Requires: Story in epic + Team plan                      │
│    💡 Use for: HIPAA, GDPR, SOC2, security features             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tier Access Matrix

```
┌──────────────┬─────────┬─────────┬──────────────┬──────────┐
│ Tier         │ Price   │ Actions │ Max Level    │ Best For │
├──────────────┼─────────┼─────────┼──────────────┼──────────┤
│ Starter      │ £0      │ 25      │ Minimal      │ Trial    │
│ Core         │ £10.99  │ 400     │ Standard     │ Small    │
│ Pro          │ £19.99  │ 800     │ Comprehensive│ Quality  │
│ Team         │ £16.99* │ 15,000  │ Thinking     │ Scale    │
│ Enterprise   │ Custom  │ 999,999 │ Thinking     │ Custom   │
└──────────────┴─────────┴─────────┴──────────────┴──────────┘
* per user/month
```

---

## Decision Tree

```
Need to generate a story?
│
├─ Is it simple? (bug fix, minor change)
│  └─ YES → MINIMAL (1 action)
│
├─ Is it compliance/security?
│  └─ YES → THINKING (3 actions, Team plan)
│
├─ Is it in an epic with 5+ stories?
│  └─ YES → COMPREHENSIVE (2 actions)
│
└─ Default → STANDARD (2 actions)
```

---

## Common Scenarios

| Scenario | Recommended Level | Why |
|----------|------------------|-----|
| Password reset | Standard | Project-specific, common feature |
| Bug fix | Minimal | Simple, fast, generic |
| HIPAA compliance | Thinking | Regulatory, complex |
| New feature in epic | Comprehensive | Needs consistency |
| CRUD operation | Standard | Balanced quality/cost |
| Security audit | Thinking | Edge cases, compliance |
| Quick draft | Minimal | Speed over quality |

---

## Error Messages

| Error | Solution |
|-------|----------|
| "Requires story to be in an epic" | Assign story to epic first |
| "Insufficient AI actions" | Wait for reset or upgrade tier |
| "🔒 Requires Team plan" | Upgrade to Team (£16.99/user) |
| "No epics available" | Create an epic first |

---

## Performance Targets

| Level | Target Time | Token Estimate |
|-------|-------------|----------------|
| Minimal | <5 sec | 1,500-2,500 |
| Standard | 5-10 sec | 2,500-4,000 |
| Comprehensive | 10-20 sec | 3,000-5,000 |
| Thinking | 15-30 sec | 5,000-8,000 |

---

## Cost Calculator

### Stories per Month

**Core (400 actions):**
- 400 Minimal OR
- 200 Standard OR
- 200 Comprehensive OR
- ~150-180 mixed

**Pro (800 actions):**
- 800 Minimal OR
- 400 Standard OR
- 400 Comprehensive OR
- ~300-350 mixed

**Team (15,000 actions):**
- 15,000 Minimal OR
- 7,500 Standard OR
- 5,000 Thinking OR
- ~5,000-6,000 mixed

---

## Test Checklist (Quick)

### Pre-Test
- [ ] Test account with 800+ actions
- [ ] 3 epics with 5+ stories each
- [ ] Project roles defined
- [ ] Project terminology configured

### Core Tests
- [ ] Minimal: <5 sec, 1 action, generic
- [ ] Standard: 5-10 sec, 2 actions, project-specific
- [ ] Comprehensive: 10-20 sec, 2 actions, semantic search
- [ ] Thinking: 15-30 sec, 3 actions, deep reasoning
- [ ] Action counter accurate
- [ ] Epic requirement enforced
- [ ] Upgrade gates work

### Integration
- [ ] All 6 templates work
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Error handling graceful

---

## Demo Script (Quick)

### Slide 1: Intro (30 sec)
"Control AI context depth: 4 levels from fast to advanced"

### Slide 2: Minimal (1 min)
Generate password reset → Show speed + generic output

### Slide 3: Standard (1 min)
Same story → Show project-specific terms

### Slide 4: Comprehensive (1.5 min)
Assign to epic → Show semantic search results

### Slide 5: Thinking (1 min)
HIPAA story OR show upgrade gate

### Slide 6: Wrap-up (30 sec)
Show billing dashboard with usage tracking

---

## Key Validation Points

✅ All 4 levels generate successfully  
✅ Action counting accurate  
✅ Tier restrictions enforced  
✅ Epic requirement enforced  
✅ Upgrade gates work  
✅ Token usage within ±20%  
✅ Performance within targets  
✅ Mobile responsive  
✅ Accessible  

---

## Quick Links

- **Full Docs:** `docs/README_AI_CONTEXT_LEVEL.md`
- **Quick Ref:** `docs/AI_CONTEXT_LEVEL_QUICK_REFERENCE.md`
- **Test List:** `docs/AI_CONTEXT_LEVEL_TEST_CHECKLIST.md`
- **Demo:** `docs/AI_CONTEXT_LEVEL_DEMO_SCRIPT.md`
- **Validation:** `docs/AI_CONTEXT_LEVEL_PRODUCTION_VALIDATION.md`

---

## Contact

- **Technical:** GitHub Issues
- **Product:** product@synqforge.com
- **Sales:** sales@synqforge.com
- **Support:** support@synqforge.com

---

**Print this card and keep it handy during testing or demos! 📋**

**Version:** 1.0 | **Date:** November 9, 2025

