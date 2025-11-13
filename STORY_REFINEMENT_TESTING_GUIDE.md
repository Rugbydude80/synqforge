# 🧪 Story Refinement - Testing Guide

## Quick Test Scenarios

### ✅ Happy Path (Already Verified)
1. Open story → Click "Refine Story"
2. Enter instructions → Click "Refine"
3. Review changes → Click "Accept Refinement"
4. ✅ Story updates successfully
5. ✅ Can refine again with updated content

---

## Edge Case Testing

### Test 1: Very Long Stories
```bash
# Create a story with 5000+ words
# Test refinement
# Expected: Should handle gracefully, may take longer
```

**Check:**
- [ ] API accepts long content
- [ ] UI displays correctly
- [ ] Diff generation works
- [ ] No timeout errors

---

### Test 2: Empty Content
```bash
# Story with:
- Title only (no description)
- No acceptance criteria
- Empty description field
```

**Check:**
- [ ] Modal opens without errors
- [ ] Refinement handles empty fields
- [ ] UI shows "No content" appropriately
- [ ] Can refine empty fields

---

### Test 3: Rate Limiting
```bash
# As Free/Starter tier user:
1. Refine story 5 times
2. Try to refine 6th time
3. Should see upgrade prompt
```

**Check:**
- [ ] Rate limit enforced correctly
- [ ] Error message clear
- [ ] Upgrade prompt appears
- [ ] Can't bypass limit

---

### Test 4: Stale Data Prevention
```bash
# Test sequence:
1. Accept refinement
2. Immediately open modal again
3. Check console logs
4. Verify fresh data loaded
```

**Check:**
- [ ] Console shows "Fetched fresh story"
- [ ] Modal shows updated content
- [ ] No stale data displayed
- [ ] Can refine updated content

---

### Test 5: Multiple Refinements
```bash
# Test sequence:
1. Refine story (1st time)
2. Accept refinement
3. Refine story again (2nd time)
4. Accept refinement
5. Refine story again (3rd time)
```

**Check:**
- [ ] Each refinement uses latest content
- [ ] History shows all refinements
- [ ] Can preview/restore any refinement
- [ ] No "already accepted" errors

---

## Browser Console Checks

### Expected Logs (Success Path)
```
✅ RefineStoryButton: Fetched fresh story before opening modal
✅ StoryDetailClient: Syncing story from server
✅ Refreshing story after refinement
✅ RefineStoryButton: Refreshed story after refinement
```

### Error Logs to Watch For
```
❌ Failed to fetch fresh story
❌ Failed to refresh story
❌ Story prop updated (should show new content)
```

---

## Manual Test Checklist

### Basic Functionality
- [ ] Can open refinement modal
- [ ] Can enter instructions
- [ ] Can generate refinement
- [ ] Can review changes
- [ ] Can accept refinement
- [ ] Story updates correctly
- [ ] Can refine again

### UI/UX
- [ ] Modal displays correctly
- [ ] Diff view shows all fields
- [ ] Summary stats accurate
- [ ] Buttons work correctly
- [ ] Loading states show
- [ ] Error messages clear
- [ ] Success toasts appear

### Edge Cases
- [ ] Empty description handled
- [ ] No ACs handled
- [ ] Very long content handled
- [ ] Rate limiting works
- [ ] Stale data prevented
- [ ] Multiple refinements work

---

## Performance Benchmarks

### Expected Timings
- Modal open: < 500ms
- Fetch fresh story: < 200ms
- Generate refinement: 5-30s (depends on content)
- Accept refinement: < 1s
- Refresh story: < 200ms

### Monitor For
- Slow API responses
- UI freezing during processing
- Memory leaks (check DevTools)
- Network errors

---

## Test Data Examples

### Test Story 1: Minimal Content
```json
{
  "title": "User login",
  "description": "",
  "acceptanceCriteria": []
}
```

### Test Story 2: Full Content
```json
{
  "title": "As a user, I want to login",
  "description": "User should be able to login...",
  "acceptanceCriteria": [
    "Given I am on login page",
    "When I enter credentials",
    "Then I see dashboard"
  ]
}
```

### Test Story 3: Very Long
```json
{
  "title": "As a user...",
  "description": "[5000+ words]",
  "acceptanceCriteria": ["[500+ words each]"]
}
```

---

## Success Criteria

✅ **Feature is working if:**
1. Can refine stories successfully
2. All fields update correctly
3. Can refine multiple times
4. No stale data issues
5. Rate limiting works
6. Error handling robust
7. UI remains responsive

---

*Use this guide to verify all edge cases before marking feature as complete.*

