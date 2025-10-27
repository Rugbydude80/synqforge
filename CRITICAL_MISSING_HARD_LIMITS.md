# 🚨 CRITICAL: Missing Hard Limit Enforcement

**Date**: October 27, 2025  
**Status**: ❌ **PRODUCTION ISSUE - IMMEDIATE FIX REQUIRED**  
**Severity**: 🔴 **CRITICAL**

---

## 🎥 User Evidence

**Video**: https://jam.dev/c/81aa3a00-6904-4b3b-87c4-51627c843899  
**Issue**: User can create unlimited projects despite being on free tier (limit: 1 project)

---

## ❌ Root Cause

**The middleware validation we implemented only blocks routes by subscription TIER (free/core/pro/team), but does NOT enforce hard QUANTITATIVE LIMITS like:**
- Number of projects
- Number of stories per project
- Number of team members
- Storage/file limits

### What We Validated vs What's Actually Missing

| What We Validated ✅ | What's Missing ❌ |
|---------------------|------------------|
| Tier-based feature blocking (export, bulk, etc.) | Project count limits |
| Subscription status checks | Story count limits per project |
| Role-based access control | Team member count limits |
| Organization isolation | Epic count limits |
| Feature flags | Sprint count limits |

---

## 🚨 Missing Hard Limits

### 1. ❌ **PROJECT CREATION LIMITS** (CONFIRMED BROKEN)

**File**: `app/api/projects/route.ts`

**Current Code** (Line 29-82):
```typescript
async function createProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)
  
  // NO LIMIT CHECK HERE! ❌
  
  try {
    const body = await req.json()
    const project = await projectsRepo.createProject(projectData)
    return NextResponse.json(project, { status: 201 })
  }
  // ...
}
```

**Expected Limits** (from `lib/constants.ts`):
- Free tier: 1 project
- Starter tier: 1 project  
- Core tier: 3 projects
- Pro tier: Infinity
- Team tier: Infinity
- Enterprise tier: Infinity

**Impact**: ❌ **Free users can create unlimited projects**

---

### 2. ❌ **STORY CREATION LIMITS** (NEEDS VERIFICATION)

**File**: `app/api/stories/route.ts`

**Expected Limits**:
- Free tier: 50 stories per project
- Core tier: 200 stories per project
- Pro tier: Infinity
- Team tier: Infinity

**Need to verify**: Does story creation check `canCreateStory(user, projectId)`?

---

### 3. ❌ **TEAM MEMBER LIMITS** (PARTIALLY IMPLEMENTED)

**File**: `app/api/team/invite/route.ts`

**Status**: ✅ Limit check EXISTS (line 85-100), but needs verification

**Expected Limits**:
- Free tier: 5 members
- Starter tier: 1 member
- Core tier: 1 member
- Pro tier: 4 members
- Team tier: 5+ members (unlimited)
- Enterprise tier: 10+ members (unlimited)

---

### 4. ❌ **EPIC CREATION LIMITS** (LIKELY MISSING)

**File**: `app/api/epics/route.ts`

**Issue**: No limits defined in constants for epic count

**Need to check**: Can free users create unlimited epics?

---

### 5. ❌ **SPRINT CREATION LIMITS** (LIKELY MISSING)

**File**: `app/api/projects/[projectId]/sprints/route.ts`

**Issue**: No limits defined in constants for sprint count

**Need to check**: Can free users create unlimited sprints?

---

## 📊 Free Tier Limits (from plans.json & constants.ts)

### What SHOULD Be Enforced:

| Resource | Free/Starter Limit | Current Enforcement |
|----------|-------------------|---------------------|
| **Projects** | 1 | ❌ NOT ENFORCED |
| **Stories per project** | 50 | ⚠️ UNKNOWN |
| **Team members** | 1 (Starter), 5 (Free) | ⚠️ NEEDS VERIFICATION |
| **Epics** | UNDEFINED | ❌ NO LIMIT |
| **Sprints** | UNDEFINED | ❌ NO LIMIT |
| **Tasks** | UNDEFINED | ❌ NO LIMIT |
| **AI actions/month** | 25 (Starter), 15 (Free) | ✅ ENFORCED (fair-usage) |
| **File uploads** | UNDEFINED | ❌ NO LIMIT |
| **Templates** | UNDEFINED | ❌ NO LIMIT |

---

## 🔍 How This Happened

### What We Validated:
✅ **Middleware-level** tier-based feature blocking  
✅ **Route-level** subscription tier checks for paid features (export, bulk, etc.)  
✅ **Database-level** organization isolation  

### What We Missed:
❌ **Resource consumption limits** (project count, story count, etc.)  
❌ **Quantitative enforcement** in CRUD operations  
❌ **Limit checking before creation** of core resources  

---

## 🔧 Available Functions (Not Being Used!)

The limit checking functions EXIST in `lib/middleware/subscription.ts`:

```typescript
// ✅ Functions exist but NOT being called!

export async function canCreateProject(user: UserContext): Promise<boolean> {
  // Checks if currentProjectCount < maxProjects
}

export async function canCreateStory(
  user: UserContext,
  projectId: string
): Promise<boolean> {
  // Checks if currentStoryCount < maxStoriesPerProject
}

export async function canAddUser(user: UserContext): Promise<boolean> {
  // Checks if currentUserCount < maxSeats
}

export async function checkFeatureLimit(
  user: UserContext,
  feature: 'project' | 'story' | 'export' | 'user',
  projectId?: string
): Promise<{ allowed: boolean; error?: string; upgradeUrl?: string }> {
  // Complete limit checking with error messages
}
```

**These exist but are NOT called in the routes!**

---

## 🚀 Required Fixes

### Priority 1: Fix Project Creation (CRITICAL)

**File**: `app/api/projects/route.ts`

```typescript
import { canCreateProject } from '@/lib/middleware/subscription'

async function createProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    // ADD THIS CHECK:
    const canCreate = await canCreateProject(context.user)
    if (!canCreate) {
      const limits = await getSubscriptionLimits(context.user)
      return NextResponse.json(
        {
          error: 'Project limit reached',
          message: `Your plan allows ${limits.maxProjects} project(s). Upgrade to create more.`,
          currentTier: limits.displayName,
          upgradeUrl: '/pricing',
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const project = await projectsRepo.createProject(projectData)
    return NextResponse.json(project, { status: 201 })
  }
  // ...
}
```

---

### Priority 2: Fix Story Creation

**File**: `app/api/stories/route.ts`

```typescript
import { canCreateStory } from '@/lib/middleware/subscription'

async function createStory(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    
    // ADD THIS CHECK:
    const canCreate = await canCreateStory(context.user, body.projectId)
    if (!canCreate) {
      const limits = await getSubscriptionLimits(context.user)
      return NextResponse.json(
        {
          error: 'Story limit reached',
          message: `Your plan allows ${limits.maxStoriesPerProject} stories per project. Upgrade for unlimited.`,
          currentTier: limits.displayName,
          upgradeUrl: '/pricing',
        },
        { status: 402 }
      )
    }

    // Continue with creation...
  }
}
```

---

### Priority 3: Verify Team Member Limits

**File**: `app/api/team/invite/route.ts`

**Action**: Verify lines 85-100 are actually working in production

---

### Priority 4: Define & Enforce Epic/Sprint Limits

**Need to decide**:
- Should free users have epic limits?
- Should free users have sprint limits?
- Add to `SUBSCRIPTION_LIMITS` in `lib/constants.ts`

---

## 📋 Complete Audit Checklist

### Resource Limits to Check:

- [ ] **Projects**: `/api/projects` POST ❌ BROKEN
- [ ] **Stories**: `/api/stories` POST ⚠️ NEEDS CHECK
- [ ] **Epics**: `/api/epics` POST ⚠️ NEEDS CHECK
- [ ] **Sprints**: `/api/projects/[id]/sprints` POST ⚠️ NEEDS CHECK
- [ ] **Tasks**: `/api/tasks` POST ⚠️ NEEDS CHECK
- [ ] **Team members**: `/api/team/invite` POST ⚠️ NEEDS VERIFICATION
- [ ] **Templates**: `/api/templates` POST ⚠️ NEEDS CHECK
- [ ] **Comments**: `/api/comments` POST ⚠️ NEEDS CHECK
- [ ] **File uploads**: `/api/*/files` POST ⚠️ NEEDS CHECK

---

## 🎯 Testing Plan

### Test 1: Project Creation (Free Tier)

```bash
# Sign in as free tier user
# Go to Projects page
# Click "New Project"
# Create project #1 → Should succeed ✅
# Try to create project #2 → Should show error ❌ (currently succeeds - BUG)
```

**Expected**: 402 error with upgrade prompt  
**Actual**: Project created successfully ❌

---

### Test 2: Story Creation (Free Tier)

```bash
# Sign in as free tier user
# Open a project
# Create 50 stories → Should succeed ✅
# Try to create story #51 → Should show error ❌
```

**Expected**: 402 error with upgrade prompt  
**Actual**: Unknown ⚠️

---

### Test 3: Team Invitation (Starter Tier)

```bash
# Sign in as starter tier user (1 seat limit)
# Try to invite another user → Should show error ❌
```

**Expected**: 403/402 error with upgrade prompt  
**Actual**: Unknown ⚠️

---

## 🔴 Impact Assessment

### Current State:

❌ **Free users can abuse the system** by creating:
- Unlimited projects (limit should be 1)
- Potentially unlimited stories (limit should be 50/project)
- Potentially unlimited epics
- Potentially unlimited sprints

### Financial Impact:

- Free users consuming resources as if they were Pro users
- No incentive to upgrade from free tier
- Database and AI costs for unlimited free usage
- Revenue loss from users not upgrading

### User Experience Impact:

- Confusing limits (AI is gated but resources aren't)
- Users may hit limits after creating content (retroactive enforcement)
- Upgrade prompts won't make sense if they already have "unlimited" projects

---

## 📞 Immediate Actions Required

### Before Any Other Work:

1. ✅ **Fix project creation limit** (CRITICAL - proven broken)
2. ⚠️ **Audit all CRUD endpoints** for missing limit checks
3. ⚠️ **Test each limit** with real free-tier user
4. ⚠️ **Add limit checks** to all creation endpoints
5. ⚠️ **Deploy fixes** to production immediately

---

## 🎯 Quick Fix Script Needed

Create a script to check current free-tier usage:

```sql
-- Find free tier users with > 1 project
SELECT 
  o.id,
  o.name,
  o.subscription_tier,
  COUNT(p.id) as project_count
FROM organizations o
LEFT JOIN projects p ON p.organization_id = o.id
WHERE o.subscription_tier IN ('free', 'starter')
GROUP BY o.id, o.name, o.subscription_tier
HAVING COUNT(p.id) > 1
ORDER BY project_count DESC;
```

This will show how many free users are exceeding limits.

---

## 📚 Related Files

**Limit Definitions**:
- `lib/constants.ts` - Lines 44-765 (SUBSCRIPTION_LIMITS)
- `config/plans.json` - Lines 1-348 (Tier features)

**Limit Functions** (exist but not used):
- `lib/middleware/subscription.ts` - Lines 68-281

**Broken Routes** (missing limit checks):
- `app/api/projects/route.ts` - Line 29 (createProject) ❌
- `app/api/stories/route.ts` - (needs verification) ⚠️
- `app/api/epics/route.ts` - (needs verification) ⚠️
- `app/api/projects/[projectId]/sprints/route.ts` - (needs verification) ⚠️

---

## 🚨 Summary

**What We Thought Was Secured**: ✅ Subscription tier-based feature access  
**What's Actually Broken**: ❌ Resource consumption limits  

**The middleware blocks FEATURES (export, bulk, SSO) but does NOT block RESOURCE CREATION (projects, stories, sprints).**

This is a **CRITICAL** gap that allows free users to consume unlimited resources.

---

**Status**: ❌ **BROKEN IN PRODUCTION**  
**Priority**: 🔴 **P0 - CRITICAL**  
**Action**: **IMMEDIATE FIX REQUIRED**

---

**Next Steps**: Implement missing limit checks in all CRUD endpoints and test thoroughly.

