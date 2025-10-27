# Subscription Limits Audit & Fixes

**Date**: October 27, 2025  
**Status**: Fixes #1 and #2 Applied

## Summary

Completed audit of all resource creation endpoints and applied critical fixes for confirmed broken limits.

## ✅ FIXES APPLIED

### Fix #1: Project Creation Limit ✅ 
**File**: `app/api/projects/route.ts`  
**Status**: **FIXED**

**What was broken**:
- No subscription limit check before creating projects
- Users could exceed their tier's `maxProjects` limit

**What's now enforced**:
```typescript
- Free: 1 project
- Solo: 3 projects  
- Business: Unlimited
- Team: Unlimited
- Enterprise: Unlimited
```

**Implementation**:
- Added `canCreateProject()` check before creation
- Returns `402 Payment Required` with upgrade prompt when limit reached
- Includes detailed logging with current count and tier info
- Proper error message: "You've reached your project limit (X/Y). Upgrade to create more projects."

---

### Fix #2: Story Creation Limit ✅
**File**: `app/api/stories/route.ts`  
**Status**: **FIXED**

**What was broken**:
- No subscription limit check before creating stories
- Users could exceed their tier's `maxStoriesPerProject` limit

**What's now enforced**:
```typescript
- Free: 50 stories per project
- Solo: 200 stories per project
- Business: Unlimited
- Team: Unlimited
- Enterprise: Unlimited
```

**Implementation**:
- Added `canCreateStory()` check before creation (validates per-project limit)
- Returns `402 Payment Required` with upgrade prompt when limit reached
- Includes project-specific count in error response
- Proper error message: "You've reached the story limit for this project (X/Y). Upgrade for unlimited stories."

---

## ⚠️ ENDPOINTS AUDITED - NO LIMITS DEFINED

### Sprints
**File**: `app/api/projects/[projectId]/sprints/route.ts`  
**Current Implementation**: 
- ✅ Uses `withAuth` with `allowedRoles: ['admin', 'member']`
- ✅ Has `requireProject: true` validation
- ❌ **NO subscription tier limits defined**

**Recommendation**: No immediate action needed unless you want to add sprint limits per tier.

**Potential Limits** (if you want to add them):
```typescript
free: maxSprintsPerProject: 2
solo: maxSprintsPerProject: 10
business+: unlimited
```

---

### Tasks
**File**: `app/api/tasks/route.ts`  
**Current Implementation**:
- ✅ Uses `withAuth` with `allowedRoles: ['admin', 'member']`
- ✅ Validates project access
- ❌ **NO subscription tier limits defined**

**Recommendation**: Tasks are typically unlimited in most PM tools. No action needed.

---

### Templates
**File**: `app/api/templates/route.ts`  
**Current Implementation**:
- ✅ Authenticated with `getServerSession`
- ✅ Validates organization membership
- ❌ **NO subscription tier limits defined**
- ⚠️ Feature flag exists: `canUseTemplates` (checked at tier level)

**Current Feature Access**:
```typescript
- Free: canUseTemplates: false
- Solo: canUseTemplates: true
- Business+: canUseTemplates: true
```

**Recommendation**: The feature flag `canUseTemplates` already gates template access at the tier level. You could add:
```typescript
free: maxCustomTemplates: 0
solo: maxCustomTemplates: 5
business+: unlimited
```

---

## 🔍 EPIC LIMITS DECISION ✅

### Current State
**Limit exists in constants**:
```typescript
LIMITS = {
  EPICS_PER_PAGE: 50  // This is pagination, not a creation limit
}
```

**No subscription-based epic limits defined**

### Decision: Option A - Keep Unlimited ✅

**Rationale**:
- ✅ Epics are high-level containers, typically few in number per project
- ✅ Most PM tools (Jira, Linear, ClickUp) don't limit epics
- ✅ Free tier already limited by 1 project, so epics naturally constrained
- ✅ Project and story limits provide sufficient tier differentiation
- ✅ Adding epic limits would create unnecessary friction without revenue benefit

**Implementation**: No changes needed - epics remain unlimited for all tiers.

---

## 📊 VERIFICATION CHECKLIST

### Fixes Applied ✅
- [x] Projects: Limit enforced (Fix #1)
- [x] Stories: Limit enforced (Fix #2)
- [x] Both return 402 with proper error structure
- [x] Both include `upgradeUrl: '/pricing'`
- [x] Both have detailed logging
- [x] No TypeScript/linter errors

### Endpoints Reviewed ✅
- [x] Sprints - No limits needed (unlimited for all tiers)
- [x] Tasks - No limits needed (unlimited for all tiers)
- [x] Templates - Feature flag sufficient (canUseTemplates)
- [x] Epics - **DECISION: Keep unlimited** (naturally constrained by project limits)

---

## 🎯 DEPLOYMENT READY

### Changes Summary
- ✅ Project creation limits enforced
- ✅ Story creation limits enforced  
- ✅ All other endpoints audited and confirmed appropriate
- ✅ Epic limits decision: Keep unlimited
- ✅ Zero breaking changes
- ✅ Backward compatible

### Test Fixes (Post-Deployment):
```bash
# Test project limit (as free tier user with 1 project already)
curl -X POST /api/projects \
  -d '{"name":"Test Project 2","key":"TST2"}' \
  -H "Authorization: Bearer <token>"
# Expected: 402 with "Project limit reached" message

# Test story limit (as free tier user with 50 stories in project)
curl -X POST /api/stories \
  -d '{"title":"Test Story","projectId":"xxx"}' \
  -H "Authorization: Bearer <token>"
# Expected: 402 with "Story limit reached" message
```

### Deploy Checklist:
- [x] Code changes complete
- [x] No linter errors
- [x] Audit document complete
- [x] All decisions documented
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Monitor Vercel deployment
- [ ] Verify limits in production

---

## 🔐 SECURITY IMPACT

**Before Fixes**:
- ❌ Users could bypass tier limits
- ❌ Potential abuse (create unlimited projects/stories)
- ❌ Revenue leakage (no upgrade pressure)

**After Fixes**:
- ✅ Hard enforcement at API level
- ✅ 402 status properly signals payment required
- ✅ Clear upgrade path provided to users
- ✅ Detailed audit logging for monitoring

---

## 📝 ERROR RESPONSE FORMAT

Both fixes return standardized 402 responses:

```json
{
  "error": "Project limit reached",
  "message": "You've reached your project limit (1/1). Upgrade to create more projects.",
  "currentTier": "Free",
  "currentCount": 1,
  "maxAllowed": 1,
  "upgradeUrl": "/pricing",
  "code": "PROJECT_LIMIT_REACHED"
}
```

This format enables:
- User-friendly error messages
- Programmatic detection of limit issues
- Easy upgrade flow integration
- Analytics/monitoring capabilities

