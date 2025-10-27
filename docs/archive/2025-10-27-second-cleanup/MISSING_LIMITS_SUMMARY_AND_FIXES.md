# 🚨 Missing Hard Limits - Complete Analysis & Fixes

**Date**: October 27, 2025  
**Status**: ❌ **PRODUCTION CRITICAL - 3 CONFIRMED BROKEN ENDPOINTS**  
**Evidence**: Video https://jam.dev/c/81aa3a00-6904-4b3b-87c4-51627c843899

---

## ❌ CONFIRMED BROKEN (No Limit Checks)

### 1. **PROJECT CREATION** - ❌ BROKEN

**File**: `app/api/projects/route.ts` (Lines 29-79)  
**Issue**: NO limit check before creating project  
**Impact**: Free users can create unlimited projects (limit should be 1)

**Current Code**:
```typescript
async function createProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)
  // ❌ NO LIMIT CHECK HERE
  const project = await projectsRepo.createProject(projectData)
  return NextResponse.json(project, { status: 201 })
}
```

---

### 2. **STORY CREATION** - ❌ BROKEN

**File**: `app/api/stories/route.ts` (Lines 174-265)  
**Issue**: NO limit check before creating story  
**Impact**: Free users can create unlimited stories (limit should be 50/project)

**Current Code**:
```typescript
async function createStory(req: NextRequest, context: { user: any }) {
  if (!canModify(context.user)) {
    throw new AuthorizationError(...)
  }
  // ❌ NO LIMIT CHECK HERE
  const story = await storiesRepository.create(storyData, context.user.id)
  return NextResponse.json(story, { status: 201 })
}
```

---

### 3. **EPIC CREATION** - ❌ BROKEN

**File**: `app/api/epics/route.ts` (Lines 51-86)  
**Issue**: NO limit check before creating epic  
**Impact**: Free users can create unlimited epics (no limit defined)

**Current Code**:
```typescript
async function createEpic(req: NextRequest, context: any) {
  const epicsRepo = new EpicsRepository(context.user)
  // ❌ NO LIMIT CHECK HERE
  const epic = await epicsRepo.createEpic(input)
  return NextResponse.json(epic, { status: 201 })
}
```

---

## 📊 Free Tier Limits (Should Be Enforced)

From `lib/constants.ts` and `config/plans.json`:

| Resource | Free/Starter Limit | Currently Enforced? |
|----------|-------------------|---------------------|
| **Projects** | 1 | ❌ NO - BROKEN |
| **Stories per project** | 50 | ❌ NO - BROKEN |
| **Epics** | UNDEFINED | ❌ NO - No limit defined |
| **Sprints** | UNDEFINED | ⚠️ UNKNOWN |
| **Tasks** | UNDEFINED | ⚠️ UNKNOWN |
| **Team members** | 1 (Starter) | ✅ YES (needs verification) |
| **AI actions** | 25 (Starter) | ✅ YES (fair-usage guards) |

---

## 🔧 FIXES - Ready to Apply

### Fix #1: Project Creation

**File**: `app/api/projects/route.ts`

```typescript
import { canCreateProject, getSubscriptionLimits } from '@/lib/middleware/subscription'

async function createProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    // ✅ ADD LIMIT CHECK
    const canCreate = await canCreateProject(context.user)
    if (!canCreate) {
      const limits = await getSubscriptionLimits(context.user)
      
      // Get current project count for error message
      const [result] = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.organizationId, context.user.organizationId))
      const currentCount = result?.count || 0
      
      return NextResponse.json(
        {
          error: 'Project limit reached',
          message: `You've reached your project limit (${currentCount}/${limits.maxProjects}). Upgrade to create more projects.`,
          currentTier: limits.displayName,
          currentCount,
          maxAllowed: limits.maxProjects,
          upgradeUrl: '/pricing',
          code: 'PROJECT_LIMIT_REACHED',
        },
        { status: 402 }
      )
    }

    // Continue with existing logic
    const body = await req.json()
    const projectData: CreateProjectInput = {
      name: body.name,
      key: body.key,
      description: body.description,
      slug: body.slug,
      ownerId: body.ownerId || context.user.id,
    }

    const project = await projectsRepo.createProject(projectData)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    // ... existing error handling
  }
}
```

---

### Fix #2: Story Creation

**File**: `app/api/stories/route.ts`

```typescript
import { canCreateStory, getSubscriptionLimits } from '@/lib/middleware/subscription'
import { count } from 'drizzle-orm'
import { stories } from '@/lib/db/schema'

async function createStory(req: NextRequest, context: { user: any }) {
  try {
    // Check if user can modify stories
    if (!canModify(context.user)) {
      throw new AuthorizationError(
        'Insufficient permissions to create stories',
        { userRole: context.user.role, requiredPermission: 'modify' }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateCreateStory(body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid story data',
        { issues: validationResult.error.issues }
      );
    }

    const storyData = validationResult.data as CreateStoryInput;

    // Verify project exists and belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, storyData.projectId)
    });

    if (!project) {
      throw new NotFoundError('Project', storyData.projectId);
    }

    if (project.organizationId !== context.user.organizationId) {
      throw new AuthorizationError(
        'Access denied to this project',
        { projectId: storyData.projectId, requiredOrg: project.organizationId }
      );
    }

    // ✅ ADD LIMIT CHECK
    const canCreate = await canCreateStory(context.user, storyData.projectId)
    if (!canCreate) {
      const limits = await getSubscriptionLimits(context.user)
      
      // Get current story count for this project
      const [result] = await db
        .select({ count: count() })
        .from(stories)
        .where(eq(stories.projectId, storyData.projectId))
      const currentCount = result?.count || 0
      
      return NextResponse.json(
        {
          error: 'Story limit reached',
          message: `You've reached the story limit for this project (${currentCount}/${limits.maxStoriesPerProject}). Upgrade for unlimited stories.`,
          currentTier: limits.displayName,
          currentCount,
          maxAllowed: limits.maxStoriesPerProject,
          projectId: storyData.projectId,
          upgradeUrl: '/pricing',
          code: 'STORY_LIMIT_REACHED',
        },
        { status: 402 }
      )
    }

    // Create the story
    const story = await storiesRepository.create(storyData, context.user.id);

    return NextResponse.json(story, { status: 201 });

  } catch (error: any) {
    console.error('Error creating story:', error);
    // ... existing error handling
  }
}
```

---

### Fix #3: Epic Creation (Needs Limit Definition First)

**Step 1**: Define epic limits in `lib/constants.ts`

Add to each tier in `SUBSCRIPTION_LIMITS`:
```typescript
maxEpicsPerProject: number,
```

**Suggested limits**:
- Free/Starter: 10 epics per project
- Core: 50 epics per project
- Pro+: Infinity

**Step 2**: Add limit check function in `lib/middleware/subscription.ts`

```typescript
/**
 * Check if user can create a new epic in a project
 */
export async function canCreateEpic(
  user: UserContext,
  projectId: string
): Promise<boolean> {
  const limits = await getSubscriptionLimits(user)

  if (limits.maxEpicsPerProject === Infinity) {
    return true
  }

  const [result] = await db
    .select({ count: count() })
    .from(epics)
    .where(eq(epics.projectId, projectId))

  return (result?.count || 0) < limits.maxEpicsPerProject
}
```

**Step 3**: Add check to `app/api/epics/route.ts`

```typescript
import { canCreateEpic, getSubscriptionLimits } from '@/lib/middleware/subscription'

async function createEpic(req: NextRequest, context: any) {
  const epicsRepo = new EpicsRepository(context.user)

  try {
    const body = await req.json()

    const input: CreateEpicInput = {
      projectId: body.projectId,
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      startDate: body.startDate,
      targetDate: body.targetDate,
    }

    // ✅ ADD LIMIT CHECK
    const canCreate = await canCreateEpic(context.user, input.projectId)
    if (!canCreate) {
      const limits = await getSubscriptionLimits(context.user)
      
      // Get current epic count
      const [result] = await db
        .select({ count: count() })
        .from(epics)
        .where(eq(epics.projectId, input.projectId))
      const currentCount = result?.count || 0
      
      return NextResponse.json(
        {
          error: 'Epic limit reached',
          message: `You've reached the epic limit for this project (${currentCount}/${limits.maxEpicsPerProject}). Upgrade for more epics.`,
          currentTier: limits.displayName,
          currentCount,
          maxAllowed: limits.maxEpicsPerProject,
          projectId: input.projectId,
          upgradeUrl: '/pricing',
          code: 'EPIC_LIMIT_REACHED',
        },
        { status: 402 }
      )
    }

    const epic = await epicsRepo.createEpic(input)
    return NextResponse.json(epic, { status: 201 })
  } catch (error) {
    console.error('Error creating epic:', error)
    // ... existing error handling
  }
}
```

---

## ⚠️ Need to Check (Unknown Status)

1. **Sprint creation**: `/api/projects/[projectId]/sprints/route.ts`
2. **Task creation**: `/api/tasks/route.ts`
3. **Template creation**: `/api/templates/route.ts`
4. **Comment creation**: `/api/comments/route.ts`
5. **File uploads**: Various file upload endpoints

---

## 🎯 Implementation Priority

### P0 - CRITICAL (Do Immediately)
1. ✅ Fix project creation (CONFIRMED BROKEN - video evidence)
2. ✅ Fix story creation (CONFIRMED BROKEN - no limit check)
3. ✅ Define epic limits + add check (CONFIRMED BROKEN - no limit check)

### P1 - HIGH (Do Today)
4. Verify team member limits are working
5. Check sprint creation limits
6. Check task creation limits

### P2 - MEDIUM (Do This Week)
7. Define and enforce template limits
8. Define and enforce comment limits
9. Define and enforce file upload limits

---

## 🧪 Testing After Fixes

### Test Script for Project Limits

```bash
# Test 1: Free user creating first project
# Expected: Success ✅

# Test 2: Free user trying to create second project
# Expected: 402 error with message:
# "You've reached your project limit (1/1). Upgrade to create more projects."

# Test 3: Verify error response structure
curl -X POST https://your-domain.com/api/projects \
  -H "Cookie: next-auth.session-token=FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project 2"}'

# Expected response:
{
  "error": "Project limit reached",
  "message": "You've reached your project limit (1/1)...",
  "currentTier": "Free",
  "currentCount": 1,
  "maxAllowed": 1,
  "upgradeUrl": "/pricing",
  "code": "PROJECT_LIMIT_REACHED"
}
```

---

## 📋 Complete Fix Checklist

- [ ] **Project creation**: Add `canCreateProject()` check
- [ ] **Story creation**: Add `canCreateStory()` check  
- [ ] **Epic creation**: Define limits + add `canCreateEpic()` check
- [ ] **Sprint creation**: Check if limits needed + implement
- [ ] **Task creation**: Check if limits needed + implement
- [ ] **Team members**: Verify existing implementation works
- [ ] **Test all fixes**: Run tests with free tier account
- [ ] **Update constants**: Add missing limit definitions
- [ ] **Update documentation**: Document all limits in plans.json
- [ ] **Deploy fixes**: Push to production
- [ ] **Monitor**: Watch for 402 errors in production

---

## 💰 Revenue Impact

**Current State**: Free users getting Pro-level resources
- Unlimited projects
- Unlimited stories
- Unlimited epics
- Costs: Database + storage + AI (some gated)

**After Fixes**: Free users limited to:
- 1 project
- 50 stories per project
- 10 epics per project (proposed)
- Proper upgrade prompts

**Expected Impact**:
- ✅ Reduced free tier abuse
- ✅ Incentive to upgrade
- ✅ Lower infrastructure costs
- ✅ Better conversion funnel

---

## 🎓 Lessons Learned

### What We Validated:
✅ Tier-based FEATURE blocking (export, bulk, SSO, etc.)  
✅ Subscription status checks  
✅ Role-based access control  

### What We Missed:
❌ Resource QUANTITY limits (projects, stories, epics)  
❌ Per-project limits (stories per project, epics per project)  
❌ Limit enforcement in CRUD operations  

### Why This Happened:
- Focused on "features" not "resources"
- Middleware blocks features, but not resource creation
- Functions exist (`canCreateProject`, `canCreateStory`) but aren't called
- No tests for limit enforcement

---

## 📞 Immediate Actions

1. **Apply Fix #1** (Project limits) - CRITICAL
2. **Apply Fix #2** (Story limits) - CRITICAL
3. **Define Epic limits** and apply Fix #3
4. **Test with free-tier user**
5. **Deploy to production**
6. **Monitor 402 error rate**

---

**Status**: ❌ **3 CONFIRMED BROKEN, FIXES READY**  
**Next Step**: **APPLY FIXES IMMEDIATELY**

---


